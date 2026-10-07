import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { htmlText } from '../../scripts/lib/wordpress-publication.mjs';
const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const review = read('../fixtures/legacy-editorial-review.json');
const snapshot = read('../../src/data/legacy-compatibility.json');

test('editorial compatibility preserves every reviewed source text, link, archive member and canonical', () => {
  for (const source of review.pages) {
    const page = snapshot.pages.find(
      (x) => x.target_route === source.target_route,
    );
    assert.ok(page, `missing compatibility page: ${source.target_route}`);
    assert.equal(page.canonical, source.canonical);
    assert.equal(page.title, source.title);
    assert.equal(htmlText(page.content_html), source.source_text);
    assert.deepEqual(
      [...page.content_html.matchAll(/href="([^"]+)"/g)].map((x) =>
        x[1].replaceAll('&amp;', '&'),
      ),
      source.source_links,
    );
    assert.deepEqual(page.archive_entries, source.archive_entries);
    assert.deepEqual(page.pagination_links, source.pagination_links);
    assert.doesNotMatch(
      page.content_html,
      /<script\b|<input\b|<form\b|<iframe\b|<img\b/,
    );
    assert.equal(page.source_sha256, source.source_sha256);
  }
});

test('variant readiness requires observed HTTP success, approved classification and verified matching canonical/route', async () => {
  const { reconcileObservedVariants } =
    await import('../../scripts/lib/legacy-compatibility.mjs');
  assert.equal(
    typeof reconcileObservedVariants,
    'function',
    'variant proof gate missing',
  );
  const ready = {
    target_route: '/ufaq/%E5%8F%97',
    canonical: 'https://happinesea.com/ufaq/受',
  };
  const valid = {
    ...ready,
    current_status: 200,
    compatibility_class: 'READY_AS_IS',
    migration_status: 'NEEDS_REVIEW',
  };
  const entries = [
    valid,
    { ...valid, current_status: 'UNVERIFIED' },
    { ...valid, canonical: 'https://happinesea.com/wrong' },
    { ...valid, target_route: '/wrong' },
    { ...valid, compatibility_class: 'BLOCKED' },
    { ...valid, compatibility_class: 'NEEDS_REVIEW' },
  ];
  reconcileObservedVariants(entries, [ready]);
  assert.equal(entries[0].migration_status, 'READY');
  assert.equal(entries[0].static_output, 'VERIFIED');
  assert.ok(
    entries
      .slice(1)
      .every((x) => x.migration_status === 'NEEDS_REVIEW' && !x.static_output),
  );
});
