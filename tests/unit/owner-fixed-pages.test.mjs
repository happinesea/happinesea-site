import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { reviewedArticleHtml } from '../../scripts/lib/wordpress-publication.mjs';
const load = (p) =>
  JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url)));

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
