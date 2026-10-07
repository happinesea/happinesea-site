import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import * as wp from '../../scripts/lib/wordpress-publication.mjs';
const read = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const review = read('../fixtures/wordpress-phase6-review-batch4.json');

test('RC4GS linked batch preserves source text, categories, links, canonical and reviewed image bytes', () => {
  const published = read('../../src/data/wordpress-insights.json');
  const manifest = read('../../src/data/wordpress-insight-manifest.json');
  assert.equal(review.remaining_clusters.length, 40);
  assert.equal(review.articles.length, 15);
  for (const source of review.articles) {
    const article = published.find(({ contract }) => contract.id === source.id);
    assert.ok(article, `missing reviewed article ${source.id}`);
    assert.equal(
      createHash('sha256')
        .update(source.source_record.content.rendered)
        .digest('hex'),
      source.source_content_sha256,
    );
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
    const mapping = manifest.articles.find((x) => x.id === source.id);
    const assets = new Map(article.body_assets.map((x) => [x.source_url, x]));
    assert.equal(
      wp.normalizePost(source.source_record, mapping, { bodyAssets: assets })
        .contract.content,
      article.content_html,
    );
    assert.equal(
      article.body_assets.length,
      new Set(source.body_image_reviews.map((x) => x.source_url)).size,
    );
    for (const image of source.body_image_reviews) {
      assert.equal(assets.get(image.source_url).sha256, image.sha256);
      assert.ok(article.content_html.includes(`alt="${image.alt}"`));
    }
    if (source.featured_image_review) {
      assert.equal(article.hero.source_url, source.source_featured_image);
      assert.equal(article.hero.sha256, source.featured_image_review.sha256);
      assert.equal(
        article.hero.alt,
        source.source_record._embedded['wp:featuredmedia'][0].alt_text ||
          source.featured_image_review.alt,
      );
    } else assert.equal(article.hero, null);
    assert.doesNotMatch(
      article.content_html,
      /<iframe|<script|happinesea\.com\/wp-content/i,
    );
  }
});

test('PMIX old category paths and manual shortcut have evidence-bound compatibility copies', () => {
  const compat = read('../../src/data/legacy-compatibility.json');
  const published = read('../../src/data/wordpress-insights.json');
  for (const url of [
    'https://happinesea.com/news/202006281075.html',
    'https://happinesea.com/news/202006281086.html',
    'https://happinesea.com/rc4gs-manual',
  ]) {
    const observed = review.link_evidence.find((x) => x.url === url);
    assert.equal(observed.status, 200);
    const page = compat.pages.find((x) => x.source_url === url);
    assert.ok(page, `missing compatibility ${url}`);
    assert.equal(page.target_route, new URL(url).pathname);
    assert.equal(page.canonical, observed.canonical);
    const canonicalPage =
      published.find((x) => x.canonical === observed.canonical) ??
      compat.pages.find((x) => x.source_url === observed.canonical);
    assert.ok(canonicalPage);
    assert.equal(page.content_html, canonicalPage.content_html);
  }
});
