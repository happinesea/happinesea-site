import { productDetailPath } from '../../src/lib/product-materials.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const cataloguePath = new URL(
  '../../src/data/product-catalogue.json',
  import.meta.url,
);

test('Radiolink catalogue contains the canonical 83 unique products', async () => {
  const products = JSON.parse(await readFile(cataloguePath, 'utf8'));

  assert.equal(products.length, 83);
  assert.equal(new Set(products.map(({ slug }) => slug)).size, 83);
  assert.equal(new Set(products.map(({ name }) => name)).size, 83);
  assert.equal(
    new Set(products.map(({ officialUrl }) => officialUrl)).size,
    83,
  );
  assert.equal(
    new Set(products.map(({ subcategory }) => subcategory)).size,
    23,
  );
  assert.equal(new Set(products.map(({ category }) => category)).size, 7);
});

test('catalogue images are local official assets and detail links match implemented pages', async () => {
  const products = JSON.parse(await readFile(cataloguePath, 'utf8'));
  const paths = products.map(productDetailPath);
  assert.equal(new Set(paths).size, 83);
  assert.ok(paths.every((path) => path.startsWith('/radiolink/')));

  for (const product of products) {
    assert.match(
      product.image.src,
      /^\/assets\/radiolink\/catalogue\/[^/]+\.webp$/,
    );
    assert.match(
      product.image.sourceUrl,
      /^https:\/\/(www\.)?radiolink\.com(?:\.cn)?\//,
    );
    assert.ok(product.description.length > 0);
    if (product.detailPath) {
      assert.equal(product.detailPath, `/radiolink/${product.slug}/`);
    }
  }
});
