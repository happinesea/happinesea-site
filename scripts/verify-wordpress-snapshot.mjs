import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import {
  assertCollection,
  assertManifestContinuity,
  validateContracts,
} from './lib/wordpress-publication.mjs';

const load = async (path) =>
  JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
const articles = await load('src/data/wordpress-insights.json');
const manifest = await load('src/data/wordpress-insight-manifest.json');
validateContracts(
  articles,
  await load('src/data/contracts/publication-content-v0.1.schema.json'),
);
assertCollection(articles);
assertManifestContinuity(articles, manifest.articles, manifest.withdrawals);
const active = manifest.articles.filter(
  ({ id }) => !manifest.withdrawals.some((entry) => entry.id === id),
);
assert.equal(articles.length, manifest.expected_count);
assert.equal(articles.length, active.length);
for (const article of articles) {
  const mapping = active.find(({ id }) => id === article.contract.id);
  assert.ok(mapping, `unapproved article ${article.id}`);
  assert.equal(article.id, `wordpress-${mapping.id}`);
  assert.equal(article.slug, mapping.slug);
  assert.equal(article.contract.slug, mapping.slug);
  assert.equal(article.route, mapping.route);
  assert.equal(article.canonical, mapping.canonical);
  assert.equal(article.contract.canonical, mapping.canonical);
  assert.equal(new URL(article.canonical).origin, 'https://happinesea.com');
  assert.equal(article.content_html, article.contract.content);
  assert.equal(article.noindex, article.contract.noindex);
  assert.equal(article.content_status, 'published');
  assert.equal(article.contract.status, 'publish');
  for (const asset of [
    ...article.body_assets,
    ...(article.hero ? [article.hero] : []),
  ]) {
    assert.match(
      asset.src,
      /^\/assets\/insights\/wordpress\/[a-zA-Z0-9-]+\.(webp|gif)$/,
    );
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
    const metadata = await sharp(
      await readFile(new URL(`../public${asset.src}`, import.meta.url)),
    ).metadata();
    assert.equal(metadata.width, asset.width);
    assert.equal(metadata.height, asset.height);
  }
}
console.log(
  `Verified ${articles.length} saved WordPress articles (no network).`,
);
