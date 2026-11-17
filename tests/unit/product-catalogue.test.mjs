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
  const implemented = products.filter(({ detailPath }) => detailPath !== null);
  const pending = products.filter(({ detailPath }) => detailPath === null);

  assert.deepEqual(implemented.map(({ slug }) => slug).sort(), [
    'er16-2-4g',
    'r12ds',
    'r12dse',
    'r12f',
    'r16f',
    'r16sm',
    'r4fgm',
    'r6ds',
    'r6dsm',
    'r6f',
    'r6fg',
    'r7fg',
    'r8ef',
    'r8fg',
    'r8fgh',
    'r8fm',
    'r8sm',
    'r8xm',
    'r9ds',
    'rc8p',
    'rc8x',
    't12d',
  ]);
  assert.equal(pending.length, 61);

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
