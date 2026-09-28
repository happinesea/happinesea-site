#!/usr/bin/env node
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const packageRoot = process.argv[2];
if (!packageRoot) {
  console.error('usage: node scripts/import-publication.mjs <publication-package-dir>');
  process.exit(2);
}

const root = resolve(packageRoot);
const readJson = async (name) => JSON.parse(await readFile(resolve(root, name), 'utf8'));
const publication = await readJson('publication.json');
const product = await readJson(publication.product_file ?? 'product.json');
const assets = await readJson(publication.assets_file ?? 'assets.json');

if (publication.contract_version !== '0.1') {
  throw new Error(`unsupported publication contract: ${publication.contract_version}`);
}
if (publication.product_id !== product.id) {
  throw new Error('publication/product id mismatch');
}
if (!['manufacturer_review', 'approved', 'published'].includes(publication.publication_status)) {
  throw new Error('invalid publication_status');
}

const siteProduct = {
  id: product.id,
  manufacturer: product.manufacturer,
  model: product.model,
  slug: product.slug,
  category: product.category,
  title: product.title,
  description: product.description,
  content_status: product.content_status,
  review_note: product.review_note,
  features: product.features.map((item) => typeof item === 'string' ? item : item.text),
  specifications: product.specifications.map((item) => ({
    label: item.label,
    value: item.value,
    status: item.verification_status ?? item.status ?? 'unverified',
  })),
  media: {
    hero: {
      src: null,
      alt: assets.assets.find((item) => item.role === 'hero')?.alt ?? product.model,
      source_image_url: assets.assets.find((item) => item.role === 'hero')?.source_image_url ?? null,
      source_page_url: assets.assets.find((item) => item.role === 'hero')?.source_page_url ?? product.official_url,
      retrieved_at: null,
      width: null,
      height: null,
      image_status: assets.assets.find((item) => item.role === 'hero')?.source_status === 'verified'
        ? 'verified'
        : 'manufacturer_source_required',
    },
  },
  manuals: product.manuals,
  firmware: product.firmware.map((item) => ({
    title: item.title,
    version: item.version,
    url: item.source_url ?? item.url,
    status: item.status === 'review_required' ? 'review_required' : 'verified',
    note: item.note,
  })),
  support: product.support,
  relations: {
    products: product.relations.products,
    receivers: product.relations.receivers,
    receiver_status: product.receivers?.verification_status ?? 'unverified',
  },
  official_url: product.official_url,
  firmware_url: product.firmware_url,
  manual_url: product.manual_url,
  last_checked_at: product.last_checked_at,
};

const productsPath = resolve('src/data/products.json');
const current = JSON.parse(await readFile(productsPath, 'utf8'));
const next = current.filter((item) => item.id !== siteProduct.id);
next.push(siteProduct);
await writeFile(productsPath, JSON.stringify(next, null, 2) + '\n', 'utf8');

const assetManifestPath = resolve(`src/data/publication-assets/${product.id}.json`);
await mkdir(dirname(assetManifestPath), { recursive: true });
await writeFile(assetManifestPath, JSON.stringify(assets, null, 2) + '\n', 'utf8');

for (const page of publication.manual_pages) {
  const from = resolve(root, page.output);
  const to = resolve('src/content/docs', page.output);
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to);
}

console.log(`imported publication package: ${publication.package_id}`);
