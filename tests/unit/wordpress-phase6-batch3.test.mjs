import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as wp from '../../scripts/lib/wordpress-publication.mjs';
const read = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const review = read('../fixtures/wordpress-phase6-review-batch3.json');

test('reviewed content-image alt resolves only for the inspected source URL and bytes, without overriding source alt', () => {
  const source = review.articles.find((item) => item.id === 863);
  const post = source.source_record;
  const mapping = {
    id: 863,
    content_type: 'insight',
    topic: 'RC技術',
    article_kind: 'article',
    slug: source.slug,
    route: `/insights/${source.slug}/`,
    canonical: source.source_url,
    featured_image_review: source.featured_image_review,
  };
  assert.equal(
    wp.normalizePost(post, mapping).contract.featured_image_alt,
    'RC4GSのRESET画面。YESとNOが並び、NOが選択されている。',
  );
  const media = post._embedded['wp:featuredmedia'][0];
  assert.equal(
    wp.reviewedFeaturedImageAlt(
      media,
      mapping.featured_image_review,
      source.featured_image_review.sha256,
    ),
    mapping.featured_image_review.alt,
  );
  assert.throws(
    () =>
      wp.reviewedFeaturedImageAlt(
        { ...media, source_url: 'https://happinesea.com/other.png' },
        mapping.featured_image_review,
      ),
    /review drift/,
  );
  assert.throws(
    () =>
      wp.reviewedFeaturedImageAlt(
        media,
        mapping.featured_image_review,
        '0'.repeat(64),
      ),
    /review drift/,
  );
  assert.throws(
    () =>
      wp.reviewedFeaturedImageAlt(media, {
        ...mapping.featured_image_review,
        alt: ' ',
      }),
    /review drift/,
  );
  assert.equal(
    wp.reviewedFeaturedImageAlt(
      { ...media, alt_text: '既存の説明' },
      mapping.featured_image_review,
    ),
    '既存の説明',
  );
  assert.equal(
    wp.classifyInventoryPost(
      {
        markup: wp.analyzePostMarkup(post.content.rendered),
        featuredImage: true,
        featuredAlt: '',
      },
      mapping,
    ).status,
    'READY',
  );
});

test('batch 3 published copies preserve reviewed body, source category, legacy canonical and image identity', () => {
  const articles = read('../../src/data/wordpress-insights.json');
  for (const source of review.articles) {
    const article = articles.find(({ contract }) => contract.id === source.id);
    assert.ok(article, `missing reviewed article ${source.id}`);
    assert.equal(article.canonical, source.source_url);
    assert.equal(article.slug, source.slug);
    assert.equal(wp.htmlText(article.content_html), source.source_text);
    assert.deepEqual(
      article.contract.category,
      source.category_names.map(({ slug }) => slug),
    );
    assert.deepEqual(
      [...article.content_html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]),
      source.source_links,
    );
    assert.deepEqual(article.body_assets, []);
    assert.equal(article.hero.source_url, source.source_featured_image);
    assert.equal(article.hero.sha256, source.featured_image_review.sha256);
    assert.equal(article.hero.alt, source.featured_image_review.alt);
    assert.doesNotMatch(article.content_html, /<iframe|<script/i);
  }
});
