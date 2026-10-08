import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';
import {
  reviewedArticleHtml,
  htmlText,
  resolveInventoryDecision,
  normalizePost,
} from '../../scripts/lib/wordpress-publication.mjs';

const read = (file) =>
  JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const fixture = read('../fixtures/wordpress-phase6-completion-review.json');
const manifest = read('../../src/data/wordpress-insight-manifest.json');
const decisions = read('../../src/data/wordpress-phase6-decisions.json');

test('legacy refresh retains owner-approved manual rebuild notices', () => {
  const script = readFileSync(
    new URL('../../scripts/sync-legacy-compatibility.mjs', import.meta.url),
    'utf8',
  );
  assert.match(
    script,
    /'manual_rebuild_notice',\s*\]\s*\.includes\(page.type\)/,
  );
});

test('owner-approved literals remove only Amazon ads, preserving prose, source identity and hash gates', () => {
  for (const [id, count] of [
    [1998, 3],
    [1895, 2],
    [1857, 5],
  ]) {
    const original = fixture.articles.find((x) => x.id === id);
    const mapping = manifest.articles.find((x) => x.id === id);
    assert.ok(mapping, `missing approved migration ${id}`);
    assert.equal(mapping.canonical, original.source_url);
    assert.equal(mapping.slug, original.slug);
    const review = mapping.content_review;
    assert.equal(review.source_content_sha256, original.source_content_sha256);
    assert.equal(review.replacements.length, count);
    const approval = read(
      '../../src/data/wordpress-owner-resolutions.json',
    ).approvals.find((x) => x.id === id);
    assert.equal(approval.source_content_sha256, review.source_content_sha256);
    assert.equal(approval.removal_count, count);
    assert.deepEqual(
      approval.removals,
      review.replacements.map(({ from }) => ({
        sha256: createHash('sha256').update(from).digest('hex'),
        literal: from,
      })),
    );
    for (const { from, to } of review.replacements) {
      assert.equal(to, '');
      assert.match(from, /^<(?:iframe|script)\b/);
      assert.match(from, /amazon-adsystem\.com|amzn_assoc_/);
      assert.equal(createHash('sha256').update(from).digest('hex').length, 64);
    }
    const source = original.source_record.content.rendered;
    const transformed = reviewedArticleHtml(source, review);
    assert.equal(htmlText(transformed), htmlText(source));
    assert.deepEqual(
      [...transformed.matchAll(/<img\b[^>]*>/g)].map((x) => x[0]),
      [...source.matchAll(/<img\b[^>]*>/g)].map((x) => x[0]),
    );
    assert.doesNotMatch(
      transformed,
      /amazon-adsystem|amzn_assoc_|<iframe|<script/,
    );
    assert.throws(
      () => reviewedArticleHtml(source + '<p>drift</p>', review),
      /source review drift/,
    );
    assert.throws(
      () =>
        reviewedArticleHtml(source, {
          ...review,
          replacements: [{ from: 'not in source', to: '' }],
        }),
      /replacement drift/,
    );
    assert.equal(
      decisions.articles.find((x) => x.id === id).decision,
      'TRANSFORM_AND_MIGRATE',
    );
    const article = read('../../src/data/wordpress-insights.json').find(
      (x) => x.contract.id === id,
    );
    assert.ok(article, `missing static publication ${id}`);
    assert.equal(
      article.content_html,
      normalizePost(original.source_record, mapping, {
        bodyAssets: new Map(article.body_assets.map((x) => [x.source_url, x])),
      }).contract.content,
    );
    assert.equal(htmlText(article.content_html), htmlText(source));
    assert.deepEqual(
      article.contract.category,
      original.category_names.map((x) => x.slug),
    );
    assert.equal(article.hero.sha256, original.featured_image_review.sha256);
    for (const image of original.body_image_reviews)
      assert.equal(
        article.body_assets.find((x) => x.source_url === image.source_url)
          .sha256,
        image.sha256,
      );
  }
});

test('905 deferral remains hash-gated and never becomes a published manual article', () => {
  const original = fixture.articles.find((x) => x.id === 905);
  const decision = {
    ...original,
    decision: 'DEFER_TO_MANUAL_REBUILD',
    reason: 'Owner confirmed unfinished manual concept; rebuild later.',
  };
  const result = resolveInventoryDecision(
    original.source_record,
    { status: 'BLOCKED', reasons: ['unsupported legacy iframe'] },
    decision,
  );
  assert.equal(result.status, 'DEFERRED');
  assert.equal(
    manifest.articles.some((x) => x.id === 905),
    false,
  );
  assert.throws(
    () =>
      resolveInventoryDecision(
        { ...original.source_record, content: { rendered: 'drift' } },
        { status: 'BLOCKED' },
        decision,
      ),
    /source review drift/,
  );
  const notice = read('../../src/data/legacy-compatibility.json').pages.find(
    (x) => x.id === 905,
  );
  assert.equal(notice.noindex, true);
  const legacy = read('../../src/data/legacy-public-surface.json').entries.find(
    (x) => x.legacy_url === notice.source_url,
  );
  assert.equal(notice.http_status, legacy.current_status);
  assert.match(notice.observation_note, /not a fresh source capture/);
  assert.equal(notice.canonical, original.source_url);
  assert.equal(
    notice.target_route,
    '/radiolink-support/minipix-manual/20200511905.html',
  );
  assert.match(notice.content_html, /Mini Pixマニュアルは再編中です/);
  assert.doesNotMatch(
    notice.content_html,
    /<iframe|<script|href=|以下のページへ移動/,
  );
});
