import assert from 'node:assert/strict';
import test from 'node:test';
const lib = await import('../../src/lib/drawing-publication.mjs').catch(
  () => ({}),
);
test('owner preparation is rejected in production and requires a complete catalog', () => {
  assert.equal(typeof lib.publicationRecords, 'function');
  assert.throws(
    () =>
      lib.publicationRecords({
        PUBLICATION_MODE: 'production',
        DRAWING_OWNER_PREVIEW: '1',
      }),
    /production/,
  );
});

test('publication catalog covers every source with evidence and gates every candidate', () => {
  const { catalog } = lib;
  assert.equal(catalog.records.length, 43);
  assert.equal(catalog.downloads.length, 77);
  assert.equal(lib.publicationRecords({}).length, 39);
  assert.equal(
    lib.publicationRecords({ DRAWING_OWNER_PREVIEW: '1' }).length,
    39,
  );
  assert.throws(
    () => lib.publicationRecords({ DRAWING_OWNER_PREVIEW: '1', CI: 'true' }),
    /production/,
  );
  const ids = new Set(catalog.downloads.map((d) => d.id));
  const paths = new Set(catalog.records.flatMap((r) => r.source_paths));
  assert.equal(paths.size, 71);
  for (const r of catalog.records) {
    assert.equal(r.publication_right, 'REVIEW_REQUIRED');
    assert.equal(r.publication_status, 'READY_FOR_OWNER_PUBLICATION_APPROVAL');
    assert.ok(r.downloads.length > 0);
    assert.ok(r.downloads.every((id) => ids.has(id)));
    assert.equal(r.tags.length, r.tag_confidence.length);
    assert.ok(
      r.tag_confidence.every((t) => r.tags.includes(t.tag) && t.evidence),
    );
    assert.ok(lib.recordDownloads(r, {}).every((d) => d.source_path === null));
  }
  const downloads = catalog.downloads.filter((d) =>
    catalog.records.some((r) => r.downloads.includes(d.id)),
  );
  assert.equal(new Set(downloads.map((d) => d.sha256)).size, downloads.length);
  assert.ok(downloads.every((d) => d.duplicate_status !== 'EXACT_DUPLICATE'));
  assert.equal(
    catalog.dedup_decisions.filter((d) => d.decision === 'DUPLICATE_CONFIRMED')
      .length,
    4,
  );
  assert.ok(
    catalog.dedup_decisions
      .filter((d) => d.decision === 'DUPLICATE_CONFIRMED')
      .every((d) => d.reuse_download_id && d.evidence[0].includes('SHA-256')),
  );
});

test('candidate routes are unique and cannot alias the public index', () => {
  const candidates = lib.catalog.records.filter((r) => !r.existing);
  assert.equal(new Set(candidates.map((r) => r.route)).size, candidates.length);
  assert.ok(candidates.every((r) => r.route === `/drawinglibrary/${r.slug}/`));
});

test('RC tags cannot come from aircraft/rotorcraft identifier substrings', () => {
  for (const slug of [
    'paper-aircraft',
    'light-aircraft-no1',
    'rotorcraft-unidentified',
  ]) {
    assert.ok(
      !lib.catalog.records.find((r) => r.slug === slug).tags.includes('RC模型'),
    );
  }
  assert.ok(
    lib.catalog.records.find((r) => r.slug === 'f4d').tags.includes('RC模型'),
  );
});

test('split RAR filenames retain a common basename and numbered part suffixes', () => {
  const r = lib.catalog.records.find((r) => r.slug === 'jet-engine-manual');
  const d = lib.catalog.downloads.filter((d) => r.downloads.includes(d.id));
  assert.equal(d.length, 2);
  assert.ok(d.every((d) => /\.part[12]\.rar$/.test(d.target_url)));
  assert.equal(
    new Set(d.map((d) => d.target_url.replace(/\.part[12]\.rar$/, ''))).size,
    1,
  );
});
