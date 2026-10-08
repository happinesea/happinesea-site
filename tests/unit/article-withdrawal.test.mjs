import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as wp from '../../scripts/lib/wordpress-publication.mjs';
import { reconcileArticleRoutes } from '../../scripts/reconcile-legacy-public-surface.mjs';

const read = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`../../src/data/${name}.json`, import.meta.url),
      'utf8',
    ),
  );

test('owner-approved 1627 withdrawal excludes publication without accepting source drift', () => {
  const manifest = read('wordpress-insight-manifest');
  const withdrawal = manifest.withdrawals.find((x) => x.id === 1627);
  assert.ok(withdrawal, '1627 must have an explicit approved withdrawal');
  const posts = [
    {
      id: 1627,
      link: withdrawal.canonical,
      content: { rendered: 'unreviewed source drift' },
    },
    { id: 905, link: 'https://happinesea.com/other.html' },
  ];
  assert.deepEqual(
    wp.publicationPosts(posts, manifest.withdrawals).map((x) => x.id),
    [905],
  );
  assert.throws(
    () =>
      wp.publicationPosts(posts, [
        { ...withdrawal, canonical: 'https://happinesea.com/wrong.html' },
      ]),
    /withdrawal/,
  );
  assert.throws(
    () => wp.publicationPosts(posts, [{ ...withdrawal, approved_at: '' }]),
    /withdrawal/,
  );
  assert.throws(
    () =>
      wp.reviewedArticleHtml('changed', {
        source_content_sha256: '0'.repeat(64),
      }),
    /source review drift/,
  );
  const inventory = read('wordpress-insight-inventory');
  assert.equal(inventory.source_count, 97);
  assert.equal(inventory.expected_count, 96);
  assert.equal(
    inventory.articles.some((x) => x.id === 1627),
    false,
  );
  assert.equal(
    read('wordpress-insights').some((x) => x.contract.id === 1627),
    false,
  );
  const entry = read('legacy-public-surface').entries.find(
    (x) => x.legacy_url === withdrawal.canonical,
  );
  assert.equal(entry.migration_status, 'REMOVED_WITH_APPROVAL');
  assert.equal(entry.redirect_required, false);
  assert.equal(entry.target_route, null);
});

test('legacy reconciliation retains approved retirement instead of reopening migration', async () => {
  const manifest = read('wordpress-insight-manifest');
  const withdrawal = manifest.withdrawals.find((x) => x.id === 1627);
  assert.ok(withdrawal);
  const snapshot = {
    entries: [
      {
        legacy_url: withdrawal.canonical,
        canonical: withdrawal.canonical,
        content_type: 'post',
        migration_status: 'MIGRATE',
        current_status: 200,
        source: [],
        notes: [],
      },
    ],
  };
  await reconcileArticleRoutes(
    snapshot,
    { articles: [], expected_count: 0, withdrawals: [withdrawal] },
    '',
    'baseline',
  );
  assert.equal(snapshot.entries[0].migration_status, 'REMOVED_WITH_APPROVAL');
  assert.equal(snapshot.entries[0].redirect_required, false);
  assert.equal(snapshot.summary.unresolved_surfaces, 0);
  assert.equal(snapshot.summary.preserved_routes, 0);
});
