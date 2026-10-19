import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  fetchPublishedPosts,
  normalizePost,
  publicationSourceMatches,
  publicationPosts,
  reviewedArticleHtml,
} from '../../scripts/lib/wordpress-publication.mjs';

const manifest = JSON.parse(
  await readFile(
    new URL('../../src/data/wordpress-insight-manifest.json', import.meta.url),
    'utf8',
  ),
);

test('pinned CMS download renderings reproduce approved content and reject body drift', async () => {
  const load = async (path) =>
    JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const current = await load('../fixtures/cms-rendering-variants.json');
  const prior = await load(
    '../fixtures/wordpress-phase6-completion-review.json',
  );
  for (const { id, content } of current) {
    const review = manifest.articles.find((m) => m.id === id).content_review;
    const old = prior.articles.find((m) => m.id === id).source_record.content
      .rendered;
    assert.equal(
      reviewedArticleHtml(content, review),
      reviewedArticleHtml(old, review),
    );
    assert.throws(
      () => reviewedArticleHtml(content + '<p>unreviewed change</p>', review),
      /source review drift/,
    );
  }
});

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
    link: 'https://cms.happinesea.com/news/10.html',
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
    'https://cms.happinesea.com/news/10.html',
  );
  assert.equal(article.route, '/insights/example/');
  for (const change of [
    { id: 11 },
    { slug: 'other' },
    { link: 'https://evil.example/news/10.html' },
  ])
    assert.throws(() => normalizePost({ ...post, ...change }, mapping));
  assert.throws(() =>
    normalizePost(post, { ...mapping, canonical: post.link }),
  );
});

test('CMS-origin withdrawals remain excluded and unknown posts are not adopted', () => {
  const withdrawal = {
    id: 1627,
    canonical: 'https://happinesea.com/experience/202107081627.html',
    reason: 'owner withdrawal',
    approved_at: '2026-10-09',
  };
  const retired = {
    id: 1627,
    link: 'https://cms.happinesea.com/experience/202107081627.html',
  };
  const approved = { id: 10 };
  const unregistered = { id: 2197 };
  assert.deepEqual(
    publicationPosts(
      [retired, approved, unregistered],
      [withdrawal],
      new Set([10, 1627]),
    ),
    [approved],
  );
  assert.throws(
    () =>
      publicationPosts(
        [
          {
            ...retired,
            link: 'https://cms.happinesea.com/experience/wrong.html',
          },
        ],
        [withdrawal],
      ),
    /invalid withdrawal/,
  );
});

test('CMS source identity accepts only the pinned public path on trusted HTTPS origins', () => {
  const canonical = 'https://happinesea.com/news/10.html';
  for (const source of [canonical, 'https://cms.happinesea.com/news/10.html'])
    assert.equal(publicationSourceMatches(source, canonical), true);
  for (const source of [
    'http://cms.happinesea.com/news/10.html',
    'https://evil.example/news/10.html',
    'https://cms.happinesea.com/news/11.html',
    'https://cms.happinesea.com/news/10.html?preview=true',
    'https://cms.happinesea.com/news/10.html#fragment',
    'https://user@cms.happinesea.com/news/10.html',
    'not a URL',
  ])
    assert.equal(publicationSourceMatches(source, canonical), false);
  assert.equal(
    publicationSourceMatches(
      canonical,
      canonical.replace('happinesea.com', 'cms.happinesea.com'),
    ),
    false,
  );
});
