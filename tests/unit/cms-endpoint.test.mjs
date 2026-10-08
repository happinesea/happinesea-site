import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  fetchPublishedPosts,
  normalizePost,
} from '../../scripts/lib/wordpress-publication.mjs';

const manifest = JSON.parse(
  await readFile(
    new URL('../../src/data/wordpress-insight-manifest.json', import.meta.url),
    'utf8',
  ),
);

test('fetches from the CMS hostname without changing public canonical or route', async () => {
  const mapping = {
    id: 10,
    slug: 'example',
    canonical: 'https://happinesea.com/news/10.html',
    route: '/insights/example/',
    content_type: 'insight',
    topic: 'RC技術',
    article_kind: 'article',
  };
  const post = {
    id: 10,
    slug: 'example',
    link: mapping.canonical,
    status: 'publish',
    date_gmt: '2026-01-01T00:00:00',
    modified_gmt: '2026-01-02T00:00:00',
    title: { rendered: '記事' },
    excerpt: { rendered: '<p>概要</p>' },
    content: { rendered: '<p>本文</p>' },
    _embedded: { 'wp:term': [[{ taxonomy: 'category', slug: 'news' }]] },
  };
  let requested;
  const posts = await fetchPublishedPosts(
    manifest.source_endpoint,
    [10],
    async (url) => {
      requested = new URL(url);
      return new Response(JSON.stringify([post]), {
        headers: { 'x-wp-total': '1', 'x-wp-totalpages': '1' },
      });
    },
  );
  assert.equal(requested.origin, 'https://cms.happinesea.com');
  assert.equal(requested.pathname, '/wp-json/wp/v2/posts');
  assert.equal(requested.searchParams.get('status'), 'publish');
  const article = normalizePost(posts[0], mapping);
  assert.equal(
    article.contract.canonical,
    'https://happinesea.com/news/10.html',
  );
  assert.equal(
    article.contract.source_url,
    'https://happinesea.com/news/10.html',
  );
  assert.equal(article.route, '/insights/example/');
});
