import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  publicUrls,
  surfaceType,
  cutoverSummary,
  sameCanonical,
} from '../../scripts/lib/legacy-public-surface.mjs';

test('legacy discovery preserves download paths and query links but excludes private interfaces', () => {
  assert.deepEqual(
    publicUrls(
      '<a href="/files/plan.pdf?download=1&amp;x=2">PDF</a><img src="/wp-content/uploads/a.gif"><a href="/wp-admin/">admin</a><a href="#part">part</a>',
      'https://happinesea.com/drawinglibrary',
    ),
    [
      'https://happinesea.com/files/plan.pdf?download=1&x=2',
      'https://happinesea.com/wp-content/uploads/a.gif',
    ],
  );
  assert.equal(
    surfaceType('https://happinesea.com/files/plane.dxf'),
    'download',
  );
  assert.equal(
    surfaceType('https://happinesea.com/wp-content/uploads/a.gif'),
    'image',
  );
});

test('cutover remains closed for unmigrated routes, unavailable downloads and unknown status', () => {
  const result = cutoverSummary(
    [
      {
        content_type: 'post',
        current_status: 200,
        migration_status: 'REDIRECT',
        target_route: '/insights/test/',
        canonical: 'https://happinesea.com/news/test.html',
      },
      {
        content_type: 'download',
        current_status: 404,
        migration_status: 'BLOCKED',
        target_route: null,
      },
      {
        content_type: 'page',
        current_status: 'UNVERIFIED',
        migration_status: 'NEEDS_REVIEW',
        target_route: null,
      },
    ].map((entry) => ({ source: ['test public source'], notes: [], ...entry })),
  );
  assert.equal(result.domain_cutover, 'NOT READY');
  assert.equal(result.redirect_required, 1);
  assert.equal(result.missing_downloads, 1);
  assert.equal(result.unverified, 1);
});

test('canonical comparison ignores percent-escape case without changing source URLs', () => {
  assert.ok(
    sameCanonical(
      'https://happinesea.com/ufaq/受信機',
      'https://happinesea.com/ufaq/%e5%8f%97%e4%bf%a1%e6%a9%9f',
    ),
  );
  assert.equal(
    sameCanonical('https://happinesea.com/one', 'https://happinesea.com/two'),
    false,
  );
});

test('an observed canonical conflict vetoes cutover even when a route is preserved', () => {
  const result = cutoverSummary([
    {
      content_type: 'post',
      current_status: 200,
      migration_status: 'READY',
      source: ['REST post 1'],
      notes: ['canonical conflict: HTML /other, REST /old'],
    },
  ]);
  assert.equal(result.canonical_conflicts, 1);
  assert.equal(result.domain_cutover, 'NOT READY');
});

test('public surface snapshot retains critical legacy routes and unresolved discovery gates', () => {
  const snapshot = JSON.parse(
    readFileSync(
      new URL('../../src/data/legacy-public-surface.json', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(snapshot.discovery.posts, 97);
  assert.equal(snapshot.discovery.pages, 22);
  assert.equal(snapshot.discovery.complete, false);
  assert.ok(snapshot.discovery.failures.length > 0);
  const urls = new Set(snapshot.entries.map((entry) => entry.legacy_url));
  assert.equal(urls.size, snapshot.entries.length);
  for (const path of [
    '/drawinglibrary',
    '/drone-rc-glossary',
    '/radiolink-q-and-a',
  ])
    assert.ok(urls.has(`https://happinesea.com${path}`), path);
  for (const entry of snapshot.entries) {
    for (const key of [
      'legacy_url',
      'content_type',
      'current_status',
      'source',
      'target_route',
      'canonical',
      'migration_status',
      'redirect_required',
      'asset_dependencies',
      'notes',
    ])
      assert.ok(Object.hasOwn(entry, key), key);
    assert.ok(entry.source.length > 0);
    assert.notEqual(entry.migration_status, 'REMOVE_WITH_APPROVAL');
    for (const url of entry.asset_dependencies) assert.ok(urls.has(url), url);
  }
  assert.deepEqual(snapshot.summary, cutoverSummary(snapshot.entries));
  assert.equal(snapshot.summary.domain_cutover, 'NOT READY');
});
