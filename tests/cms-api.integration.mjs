import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  fetchJson,
  fetchPublishedPosts,
} from '../scripts/lib/wordpress-publication.mjs';

const manifest = JSON.parse(
  await readFile(
    new URL('../src/data/wordpress-insight-manifest.json', import.meta.url),
    'utf8',
  ),
);
const cmsFetch = async (url, options) => {
  assert.equal(new URL(url).origin, 'https://cms.happinesea.com');
  const response = await fetch(url, options);
  assert.equal(
    new URL(response.url).origin,
    'https://cms.happinesea.com',
    'CMS request must not redirect to the public origin',
  );
  return response;
};

test('live CMS REST root retains the public WordPress identity', async () => {
  const root = await fetchJson(
    new URL('/wp-json/', manifest.source_endpoint),
    cmsFetch,
  );
  assert.equal(root.name, 'happinesea hobby');
  assert.equal(root.url, 'https://happinesea.com');
  assert.equal(root.home, 'https://happinesea.com');
});

test('live CMS returns every approved article with its existing slug and canonical', async () => {
  const withdrawn = new Set(manifest.withdrawals.map(({ id }) => id));
  const mappings = manifest.articles.filter(({ id }) => !withdrawn.has(id));
  const posts = await fetchPublishedPosts(
    manifest.source_endpoint,
    mappings.map(({ id }) => id),
    cmsFetch,
  );
  assert.equal(posts.length, manifest.expected_count);
  for (const mapping of mappings) {
    const post = posts.find(({ id }) => id === mapping.id);
    assert.equal(post.status, 'publish');
    assert.equal(post.slug, mapping.slug);
    assert.equal(post.link, mapping.canonical);
    assert.equal(new URL(post.link).origin, 'https://happinesea.com');
  }
});
