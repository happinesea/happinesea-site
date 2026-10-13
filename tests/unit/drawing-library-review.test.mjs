import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const lib = await import('../../scripts/lib/drawing-library-review.mjs').catch(
  () => ({}),
);
const read = async (path) =>
  JSON.parse(await readFile(new URL('../../' + path, import.meta.url), 'utf8'));

test('owner review model is available independently of production routes', () => {
  assert.equal(typeof lib.buildReviewModel, 'function');
});

test('public index derives exactly six existing downloads and retains legacy destinations', async () => {
  const snapshot = await read('src/data/legacy-compatibility.json');
  const downloads = await read('src/data/static-downloads.json');
  const cards = lib.publicDrawings(snapshot, downloads);
  assert.equal(cards.length, 6);
  assert.equal(new Set(cards.map((c) => c.downloadHref)).size, 6);
  assert.ok(
    cards.some(
      (c) => c.packageIds.includes('1712') && c.packageIds.includes('1717'),
    ),
  );
  const f14 = cards.find((c) => c.packageIds.includes('2168'));
  assert.ok(f14.href.toLowerCase().includes('f4d'));
  for (const card of cards) {
    assert.ok(snapshot.pages.some((p) => p.target_route === card.href));
    assert.ok(card.hero?.src);
    assert.notEqual(card.description, 'Download');
    assert.equal(card.category, '機体の設計図');
  }
});

test('all twenty exact and nine probable cases expose target evidence individually', async () => {
  const model = await lib.loadReviewModel(new URL('../../', import.meta.url));
  assert.equal(model.files.length, 77);
  assert.equal(model.exact.length, 20);
  assert.equal(model.probable.length, 9);
  assert.ok(
    model.exact.every(
      (row) => row.matches.length > 0 && row.source.sha256.length === 64,
    ),
  );
  assert.ok(
    model.exact.flatMap((row) => row.matches).some((m) => m.memberPath),
  );
  assert.ok(
    model.probable.every(
      (row) => row.action === 'REVIEW_REQUIRED' && row.matches.length > 0,
    ),
  );
  assert.equal(model.groups.length, 42);
  assert.equal(model.titles.length, 26);
  assert.equal(model.rights.length, 77);
  assert.ok(
    model.groups.every(
      (g) => g.files.length && g.grouping_status === 'REVIEW_REQUIRED',
    ),
  );
});

test('category summary distinguishes records, files, and pending rights', async () => {
  const model = await lib.loadReviewModel(new URL('../../', import.meta.url));
  assert.deepEqual(
    model.categories.map((c) => [
      c.category,
      c.records,
      c.files,
      c.reviewRequired,
    ]),
    [
      ['機体の設計図', 31, 69, 69],
      ['エンジン・製作資料', 2, 8, 8],
    ],
  );
});

test('rendered local review escapes source metadata and never makes rights decisions', async () => {
  const model = await lib.loadReviewModel(new URL('../../', import.meta.url));
  model.files[0].title = '<script>alert(1)</script>';
  const html = lib.renderReview(model);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.equal((html.match(/data-exact-case=/g) ?? []).length, 20);
  assert.equal((html.match(/data-probable-case=/g) ?? []).length, 9);
  assert.equal((html.match(/data-group-case=/g) ?? []).length, 42);
  assert.equal((html.match(/data-title-case=/g) ?? []).length, 26);
  assert.ok(!html.includes('gtag('));
});

test('review server rejects non-loopback hosts and unknown asset routes', () => {
  assert.equal(lib.allowedReviewHost('127.0.0.1:4380', 4380), true);
  for (const host of [
    'example.com:4380',
    'localhost.evil:4380',
    '0.0.0.0:4380',
  ]) {
    assert.equal(lib.allowedReviewHost(host, 4380), false);
  }
});

test('review model rejects source path drift and rights promotion before rendering', async () => {
  const data = {
    records: await read('src/data/drawing-library/records.proposed.json'),
    downloads: await read('src/data/drawing-library/downloads.proposed.json'),
    groups: await read('src/data/drawing-library/grouping-review-queue.json'),
    titleQueue: await read('src/data/drawing-library/title-review-queue.json'),
    rights: await read(
      'src/data/drawing-library/publication-right-review-queue.json',
    ),
    refresh: await read(
      'src/data/drawing-library/existing-refresh-proposals.json',
    ),
    summary: await read('src/data/drawing-library/summary.json'),
    inventory: await read('docs/drawing-library-task0/inventory.json'),
    titles: await read(
      'docs/drawing-library-task0/title-candidate-ledger.json',
    ),
    dedup: await read('docs/drawing-library-task0/duplicate-ledger.json'),
    existingDownloads: await read(
      'docs/drawing-library-task0/existing-downloads.json',
    ),
  };
  const file = data.downloads.find((f) => f.source_path);
  const source = file.source_path;
  file.source_path = '../outside.pdf';
  assert.throws(() => lib.buildReviewModel(data), /mapping drift/);
  file.source_path = source;
  file.publication_right = 'OWNER_APPROVED';
  assert.throws(() => lib.buildReviewModel(data), /invalid review/);
});

test('malformed request targets are rejected without throwing', () => {
  assert.equal(
    lib.reviewRequestPath('/drawing-library-review/?x=1'),
    '/drawing-library-review/',
  );
  for (const target of [
    '//[',
    '//example.com/',
    'http://example.com/',
    undefined,
  ]) {
    assert.equal(lib.reviewRequestPath(target), null);
  }
});
