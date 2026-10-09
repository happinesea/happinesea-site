import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { reviewedArticleHtml } from '../../scripts/lib/wordpress-publication.mjs';
import { prepareLegacyHtml } from '../../scripts/lib/legacy-compatibility.mjs';
const load = (p) =>
  JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url)));

test('privacy publication retains the full authoritative baseline before additive owner-approved explanations', () => {
  const source = load(
    'tests/fixtures/owner-fixed-pages-source.json',
  ).privacy_policy;
  assert.equal(
    createHash('sha256').update(source.content_html).digest('hex'),
    'd2be68ae99f6c5b49327ffcd50cc85244c54a0fcad2af72b1e641ba53a31b3e3',
  );
  const page = load('src/data/legacy-compatibility.json').pages.find(
    (x) => x.id === 3,
  );
  assert.ok(page, 'privacy policy is not published');
  const baseline = prepareLegacyHtml(source.content_html, new Map(), new Map());
  assert.ok(page.content_html.startsWith(baseline), 'formal baseline changed');
  assert.equal(page.source_content_sha256, source.source_content_sha256);
  assert.equal(page.canonical, 'https://happinesea.com/privacy-policy');
  assert.equal(page.target_route, '/privacy-policy');
  const additions = page.content_html.slice(baseline.length);
  assert.match(additions, /当該機能が提供・利用される場合に適用/);
  assert.match(additions, /Google Analytics.*Google AdSense/);
  assert.match(additions, /現在導入していません/);
  assert.doesNotMatch(additions, /cms\.happinesea\.com/);
  assert.deepEqual(page.legal_diff, {
    retained: source.sections,
    added: 5,
    deleted: 0,
    meaning_changed: 0,
  });
});

test('Byme-A index preserves all six chapter links and cover after explicit advertisement removal', () => {
  const snapshot = load('src/data/legacy-compatibility.json');
  const page = snapshot.pages.find((x) => x.id === 1664);
  assert.ok(page, 'Byme-A parent index missing');
  assert.equal(
    page.canonical,
    'https://happinesea.com/radiolink-productions-manual/byme-a-manual',
  );
  const review = load('tests/fixtures/owner-fixed-pages-source.json').byme_a;
  const html = reviewedArticleHtml(review.content_html, review.content_review);
  assert.deepEqual(
    [...html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]),
    review.chapter_urls,
  );
  assert.deepEqual(
    [...page.content_html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]),
    review.chapter_urls,
  );
  assert.doesNotMatch(page.content_html, /amazon|Kindle|<iframe|<script/i);
  const asset = snapshot.assets.find((x) =>
    x.source_url.endsWith('/2021/09/book.jpg'),
  );
  assert.equal(
    createHash('sha256')
      .update(
        readFileSync(
          new URL(`../../public${asset.target_route}`, import.meta.url),
        ),
      )
      .digest('hex'),
    '84b4dc5a8dde375ace2a1b7f3a3a11de3268861f41d225307f144b05d0f9ee77',
  );
  assert.throws(
    () =>
      reviewedArticleHtml(review.content_html + 'drift', review.content_review),
    /source review drift/,
  );
});

test('style-guide withdrawal is explicit and does not publish a replacement or redirect', () => {
  const resolution = load(
    'src/data/legacy-fixed-page-resolution.json',
  ).pages.find((x) => x.id === 207);
  assert.equal(resolution.disposition, 'REMOVE_WITH_EXPLICIT_APPROVAL');
  assert.equal(resolution.legacy_disposition, 'HTTP_404_NO_REDIRECT');
  assert.equal(resolution.redirect_approved, false);
  assert.equal(
    load('src/data/legacy-compatibility.json').pages.some((x) => x.id === 207),
    false,
  );
});
