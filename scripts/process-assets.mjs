#!/usr/bin/env node
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {
  assetHash,
  assetFiles,
  verifyAssets,
} from './lib/publication-assets.mjs';

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error('usage: node scripts/process-assets.mjs <asset-manifest.json>');
  process.exit(2);
}

const manifest = JSON.parse(await readFile(resolve(manifestPath), 'utf8'));
assert(/^[a-z0-9-]+$/.test(manifest.product_id), 'unsafe asset product id');
const reportPath = resolve(
  'src/data/publication-assets',
  `${manifest.product_id}.processed.json`,
);
const previous = await readFile(reportPath, 'utf8')
  .then(JSON.parse)
  .catch((error) => {
    if (error.code === 'ENOENT') return { results: [] };
    throw error;
  });
const results = [];

for (const asset of manifest.assets ?? []) {
  assert(
    /^\/assets\/[A-Za-z0-9/_-]+$/.test(asset.public_path),
    `unsafe asset path ${asset.id}`,
  );
  if (!asset.source_image_url) {
    throw new Error(`required asset source missing: ${asset.id}`);
  }

  const response = await globalThis.fetch(asset.source_image_url, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(
      `asset download failed ${response.status}: ${asset.source_image_url}`,
    );
  }

  const input = Buffer.from(await response.arrayBuffer());
  const hash = createHash('sha256').update(input).digest('hex');
  const prior = previous.results.find((row) => row.id === asset.id);
  if (prior)
    assert.equal(
      hash,
      prior.sha256,
      `source image drift requires explicit review: ${asset.id}`,
    );
  const basePath = asset.public_path.replace(/^\//, '');
  const outBase = resolve('public', basePath);
  await mkdir(resolve(outBase, '..'), { recursive: true });

  if (input.length >= 26 && input.subarray(0, 2).toString('ascii') === 'BM') {
    await writeFile(`${outBase}.bmp`, input);
    results.push({
      id: asset.id,
      status: 'processed',
      sha256: hash,
      width: Math.abs(input.readInt32LE(18)),
      height: Math.abs(input.readInt32LE(22)),
      bytes: input.length,
      bmp: `/${basePath}.bmp`,
    });
    continue;
  }

  const image = sharp(input, { animated: true, failOn: 'warning' });
  const meta = await image.metadata();

  if (meta.format === 'gif') {
    await writeFile(`${outBase}.gif`, input);
    results.push({
      id: asset.id,
      status: 'processed',
      sha256: hash,
      width: meta.width ?? null,
      height: meta.pageHeight ?? meta.height ?? null,
      pages: meta.pages ?? null,
      bytes: input.length,
      gif: `/${basePath}.gif`,
    });
    continue;
  }

  await image.clone().webp({ quality: 82 }).toFile(`${outBase}.webp`);
  await image.clone().avif({ quality: 55 }).toFile(`${outBase}.avif`);

  results.push({
    id: asset.id,
    status: 'processed',
    sha256: hash,
    width: meta.width ?? null,
    height: meta.height ?? null,
    webp: `/${basePath}.webp`,
    avif: `/${basePath}.avif`,
  });
}

for (const result of results) result.files = await assetFiles(result);
const report = {
  product_id: manifest.product_id,
  manifest_sha256: assetHash(JSON.stringify(manifest)),
  results,
};
await verifyAssets(manifest, report);
await mkdir(resolve(reportPath, '..'), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(reportPath);
