import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  assertCollection,
  assertManifestContinuity,
  fetchJson,
  fetchImage,
  fetchPublishedPosts,
  normalizePost,
  sanitizeArticleHtml,
  validateContracts,
} from '../../scripts/lib/wordpress-publication.mjs';

const schema = JSON.parse(
  await readFile(
    new URL(
      '../../src/data/contracts/publication-content-v0.1.schema.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

const mapping = {
  id: 10,
  content_type: 'insight',
  topic: 'RC技術',
  article_kind: 'article',
  slug: 'percent-%e3%83%86%e3%82%b9%e3%83%88',
  route: '/insights/percent-%e3%83%86%e3%82%b9%e3%83%88/',
  featured_image_role: 'decorative',
  canonical: 'https://happinesea.com/news/10.html',
};

const post = {
  id: 10,
  slug: 'percent-%e3%83%86%e3%82%b9%e3%83%88',
  status: 'publish',
  link: mapping.canonical,
  date_gmt: '2026-01-01T00:00:00',
  modified_gmt: '2026-01-02T00:00:00',
  title: { rendered: '記事タイトル' },
  excerpt: { rendered: '<p>記事の概要です。</p>' },
  content: {
    rendered:
      '<p>本文</p><iframe src="https://www.youtube-nocookie.com/embed/abc123" title="動画"></iframe>',
  },
  _embedded: {
    'wp:term': [[{ taxonomy: 'category', slug: 'news' }], []],
    'wp:featuredmedia': [
      {
        source_url: 'https://happinesea.com/image.jpg',
        alt_text: '',
        media_details: { width: 640, height: 360 },
      },
    ],
  },
};

test('normalizes a published insight with percent-encoded slug and source fields', () => {
  const article = normalizePost(post, mapping);

  assert.equal(article.contract.slug, post.slug);
  assert.equal(article.contract.content_type, 'insight');
  assert.equal(article.contract.status, 'publish');
  assert.equal(article.contract.canonical, mapping.canonical);
  assert.equal(article.contract.featured_image_alt, '');
  assert.match(article.contract.content, /youtube-nocookie\.com/);
  assert.doesNotThrow(() => validateContracts([article], schema));
});

test('rejects non-published and incomplete WordPress records', () => {
  assert.throws(
    () => normalizePost({ ...post, status: 'draft' }, mapping),
    /publish/,
  );
  assert.throws(
    () => normalizePost({ ...post, title: { rendered: '' } }, mapping),
    /title/,
  );
  assert.throws(
    () => normalizePost(post, { ...mapping, content_type: 'support' }),
    /content_type/,
  );
  assert.throws(
    () => normalizePost(post, { ...mapping, slug: 'changed-slug' }),
    /slug drift/,
  );
  assert.throws(
    () => normalizePost(post, { ...mapping, route: '/insights/changed/' }),
    /route mapping/,
  );
  assert.throws(
    () =>
      normalizePost(post, {
        ...mapping,
        featured_image_role: 'content',
      }),
    /image alt/,
  );
  const article = normalizePost(post, mapping);
  assert.throws(
    () =>
      validateContracts(
        [{ ...article, contract: { ...article.contract, status: 'draft' } }],
        schema,
      ),
    /contract validation failed/,
  );
  assert.throws(
    () =>
      validateContracts(
        [
          {
            ...article,
            contract: { ...article.contract, canonical: 'not-a-url' },
          },
        ],
        schema,
      ),
    /contract validation failed/,
  );
});

test('keeps allowlisted YouTube embeds and rejects active or unknown embeds', () => {
  const youtube = sanitizeArticleHtml(
    '<iframe src="https://www.youtube.com/embed/abc123" title="動画"></iframe>',
  );
  assert.match(youtube, /youtube\.com\/embed\/abc123/);
  assert.throws(
    () => sanitizeArticleHtml('<script>alert(1)</script>'),
    /script/,
  );
  assert.throws(
    () =>
      sanitizeArticleHtml(
        '<iframe src="https://example.com/embed/1"></iframe>',
      ),
    /iframe/,
  );
  assert.throws(
    () => sanitizeArticleHtml('<iframe title="動画"></iframe>'),
    /without src/,
  );
  assert.throws(
    () => sanitizeArticleHtml('<a href="javascript:alert(1)">x</a>'),
    /javascript:/,
  );
  assert.throws(() => sanitizeArticleHtml('[unsupported id="1"]'), /shortcode/);
});

test('strips inline styles and event handlers instead of publishing them', () => {
  assert.equal(
    sanitizeArticleHtml('<p style="color:red" onclick="x()">本文</p>'),
    '<p>本文</p>',
  );
});

test('rejects duplicate ids, slugs, canonicals, and missing approved articles', () => {
  const article = normalizePost(post, mapping);
  assert.throws(() => assertCollection([article, article]), /duplicate id/);
  assert.throws(
    () =>
      assertCollection([
        article,
        {
          ...article,
          contract: {
            ...article.contract,
            id: 11,
            canonical: 'https://happinesea.com/news/11.html',
          },
        },
      ]),
    /duplicate slug/,
  );
  assert.throws(
    () =>
      assertCollection([
        article,
        {
          ...article,
          contract: {
            ...article.contract,
            id: 11,
            slug: 'another-article',
          },
        },
      ]),
    /duplicate canonical/,
  );
  assert.throws(
    () =>
      assertManifestContinuity(
        [article],
        [mapping, { id: 11, canonical: 'https://happinesea.com/news/11.html' }],
        [],
      ),
    /missing approved article 11/,
  );
  assert.doesNotThrow(() =>
    assertManifestContinuity(
      [article],
      [mapping, { id: 11, canonical: 'https://happinesea.com/news/11.html' }],
      [
        {
          id: 11,
          canonical: 'https://happinesea.com/news/11.html',
          reason: 'Reviewed withdrawal',
          approved_at: '2026-10-03',
        },
      ],
    ),
  );
});

test('fails closed when WordPress or an image fetch fails', async () => {
  await assert.rejects(
    fetchJson('https://example.test/posts', async () => {
      throw new Error('offline');
    }),
    /offline/,
  );
  await assert.rejects(
    fetchImage(
      'https://example.test/image.jpg',
      async () => new Response('', { status: 404 }),
    ),
    /HTTP 404/,
  );
  await assert.rejects(
    fetchImage(
      'https://example.test/image.jpg',
      async () =>
        new Response('not an image', {
          headers: { 'content-type': 'text/plain' },
        }),
    ),
    /invalid image content type/,
  );
  await assert.rejects(
    fetchPublishedPosts(
      'https://example.test/posts',
      [10, 11],
      async () =>
        new Response(JSON.stringify([post]), {
          headers: {
            'content-type': 'application/json',
            'x-wp-total': '1',
            'x-wp-totalpages': '1',
          },
        }),
    ),
    /expected 2 published posts/,
  );
});
