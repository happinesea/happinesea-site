import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import * as wp from '../../scripts/lib/wordpress-publication.mjs';
const read = (p) =>
  JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const review = read('../fixtures/wordpress-phase6-completion-review.json');
const resolutions = read('../../src/data/wordpress-owner-resolutions.json');
const resolvedIds = new Set([
  1627,
  resolutions.deferred.id,
  ...resolutions.approvals.map((x) => x.id),
]);

test('every remaining source has a final evidence-bound decision and only approved copies are published', () => {
  const published = read('../../src/data/wordpress-insights.json');
  const decisions = read('../../src/data/wordpress-phase6-decisions.json');
  assert.equal(review.articles.length, 34);
  assert.equal(new Set(review.articles.map((x) => x.id)).size, 34);
  assert.deepEqual(
    decisions.articles
      .filter((x) => !resolvedIds.has(x.id))
      .map((x) => [x.id, x.decision]),
    review.articles
      .filter((x) => !resolvedIds.has(x.id))
      .map((x) => [x.id, x.decision]),
  );
  for (const source of review.articles) {
    if (resolvedIds.has(source.id)) continue;
    assert.equal(
      createHash('sha256')
        .update(source.source_record.content.rendered)
        .digest('hex'),
      source.source_content_sha256,
    );
    const article = published.find((x) => x.contract.id === source.id);
    if (source.decision === 'BLOCKED_WITH_EXPLICIT_REASON') {
      assert.equal(article, undefined);
      assert.ok(
        source.reason && source.owner_decision_needed && source.cutover_impact,
      );
      continue;
    }
    assert.ok(article, `missing approved article ${source.id}`);
    assert.equal(article.canonical, source.source_url);
    assert.equal(article.slug, source.slug);
    assert.deepEqual(
      article.contract.category,
      source.category_names.map((x) => x.slug),
    );
    const assets = new Map(article.body_assets.map((x) => [x.source_url, x]));
    assert.equal(
      wp.normalizePost(source.source_record, source.mapping, {
        bodyAssets: assets,
      }).contract.content,
      article.content_html,
    );
    assert.equal(wp.htmlText(article.content_html), source.transformed_text);
    assert.deepEqual(
      [...article.content_html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]),
      source.transformed_links
        .map((x) => x.replaceAll('&amp;', '&'))
        .map((x) => x.replaceAll('&', '&amp;')),
    );
    assert.equal(article.body_assets.length, source.body_image_reviews.length);
    for (const image of source.body_image_reviews)
      assert.equal(assets.get(image.source_url).sha256, image.sha256);
    if (source.featured_image_review) {
      assert.equal(
        article.hero.source_url,
        source.featured_image_review.source_url,
      );
      assert.equal(article.hero.sha256, source.featured_image_review.sha256);
      const oldAlt =
        source.source_record._embedded['wp:featuredmedia'][0]?.alt_text;
      assert.equal(
        article.hero.alt,
        oldAlt?.trim() ? oldAlt : source.featured_image_review.alt,
      );
    }
    for (const original of wp.extractRemoteArticleImages(
      wp.reviewedArticleHtml(
        source.source_record.content.rendered,
        source.mapping.content_review,
      ),
    )) {
      if (original.alt.trim())
        assert.ok(
          article.content_html.includes(`alt="${original.alt}"`),
          `source alt lost ${source.id}`,
        );
    }
    assert.doesNotMatch(
      article.content_html,
      /<script|rcm-fe\.amazon-adsystem|_wp_link_placeholder/,
    );
  }
});

test('Byme-A publishes all six exact chapter routes but does not silently publish the unresolved parent advertisement', () => {
  const published = read('../../src/data/wordpress-insights.json');
  for (const id of [1673, 1675, 1679, 1682, 1687, 1691])
    assert.ok(
      published.some((x) => x.contract.id === id),
      `missing Byme-A chapter ${id}`,
    );
  const compatibility = read('../../src/data/legacy-compatibility.json');
  assert.equal(
    compatibility.pages.some(
      (x) => x.target_route === '/radiolink-productions-manual/byme-a-manual',
    ),
    false,
  );
  assert.equal(review.byme_a_parent.decision, 'BLOCKED_WITH_EXPLICIT_REASON');
  const download = compatibility.pages.find(
    (x) => x.title === 'COOL9030、ブラシモーター用ESC日本語マニュアル',
  );
  assert.equal(download.download_id, '2047');
  assert.equal(
    download.download_target,
    '/wp-content/uploads/2022/11/cool9030_manual_jp.pdf',
  );
});

test('96 active posts are migrated or explicitly deferred; 1627 is owner-withdrawn', () => {
  const inventory = read('../../src/data/wordpress-insight-inventory.json');
  const compatibility = read('../../src/data/legacy-compatibility.json');
  const published = read('../../src/data/wordpress-insights.json');
  const drawings = compatibility.pages.filter((x) => x.type === 'drawing');
  assert.equal(inventory.articles.length, 96);
  assert.equal(inventory.withdrawals.length, 1);
  assert.equal(inventory.withdrawals[0].id, 1627);
  assert.equal(drawings.length, 5);
  const completed = new Set([
    ...published.map((x) => x.contract.id),
    ...drawings.map((x) => x.id),
  ]);
  assert.equal(completed.size, 95);
  for (const drawing of drawings)
    assert.equal(
      drawing.canonical,
      inventory.articles.find((x) => x.id === drawing.id).canonical,
    );
  const remaining = inventory.articles.filter((x) => !completed.has(x.id));
  assert.deepEqual(
    remaining.map((x) => x.id).sort((a, b) => a - b),
    [905],
  );
  for (const article of remaining) {
    assert.equal(article.readiness.status, 'DEFERRED');
    assert.equal(article.readiness.decision, 'DEFER_TO_MANUAL_REBUILD');
  }
});
