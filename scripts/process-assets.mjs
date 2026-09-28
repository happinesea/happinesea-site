#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error('usage: node scripts/process-assets.mjs <asset-manifest.json>');
  process.exit(2);
}

const manifest = JSON.parse(await readFile(resolve(manifestPath), 'utf8'));
const results = [];

for (const asset of manifest.assets ?? []) {
  if (!asset.source_image_url) {
    results.push({
      id: asset.id,
      status: 'skipped',
      reason: asset.source_status ?? 'source_image_url_missing',
    });
    continue;
  }

  const response = await fetch(asset.source_image_url);
  if (!response.ok) {
    throw new Error(`asset download failed ${response.status}: ${asset.source_image_url}`);
  }

  const input = Buffer.from(await response.arrayBuffer());
  const hash = createHash('sha256').update(input).digest('hex');
  const basePath = asset.public_path.replace(/^\//, '');
  const outBase = resolve('public', basePath);
  await mkdir(resolve(outBase, '..'), { recursive: true });

  const image = sharp(input, { failOn: 'warning' });
  const meta = await image.metadata();
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

const reportPath = resolve(
  'src/data/publication-assets',
  `${manifest.product_id}.processed.json`,
);
await mkdir(resolve(reportPath, '..'), { recursive: true });
await writeFile(
  reportPath,
  JSON.stringify({ product_id: manifest.product_id, results }, null, 2) + '\n',
  'utf8',
);
console.log(reportPath);
