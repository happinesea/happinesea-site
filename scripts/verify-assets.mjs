#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { verifyAssets } from './lib/publication-assets.mjs';

assert(
  process.argv[2],
  'usage: node scripts/verify-assets.mjs <asset-manifest.json>',
);
const manifest = JSON.parse(await readFile(process.argv[2], 'utf8'));
const report = JSON.parse(
  await readFile(
    `src/data/publication-assets/${manifest.product_id}.processed.json`,
    'utf8',
  ),
);
console.log(
  'Verified saved publication assets (no network):',
  await verifyAssets(manifest, report),
);
