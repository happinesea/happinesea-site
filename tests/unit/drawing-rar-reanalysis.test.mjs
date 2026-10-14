import assert from 'node:assert/strict';
import test from 'node:test';
import {
  catalog,
  ownerCatalog,
  reanalysis,
  publicationRecords,
  recordDownloads,
  ownerExclusions,
} from '../../src/lib/drawing-publication.mjs';

test('RAR reanalysis is owner-only and leaves the canonical source catalog intact', () => {
  assert.equal(catalog.records.length, 43);
  assert.equal(publicationRecords({}).length, 6);
  assert.equal(reanalysis.archives.length, 44);
  assert.equal(reanalysis.exact_duplicate_replay.length, 20);
  assert.ok(reanalysis.exact_duplicate_replay.every((r) => r.sha_replay));
  assert.ok(
    reanalysis.dedup_decisions.every((d) => d.decision !== 'REVIEW_REQUIRED'),
  );
  assert.ok(
    ownerCatalog.records.every(
      (r) => r.publication_right === 'REVIEW_REQUIRED',
    ),
  );
  assert.ok(
    ownerCatalog.records.every((r) => r.grouping_status !== 'REVIEW_REQUIRED'),
  );
  const records = publicationRecords({ DRAWING_OWNER_PREVIEW: '1' });
  const active = records.flatMap((r) =>
    recordDownloads(r, { DRAWING_OWNER_PREVIEW: '1' }),
  );
  assert.equal(active.length, 47);
  assert.equal(records.length, 39);
  for (const exclusion of ownerExclusions) {
    assert.ok(!records.some((r) => r.id === exclusion.record_id));
    const retired = reanalysis.records.find(
      (r) => r.id === exclusion.record_id,
    );
    assert.ok(active.every((d) => !retired.downloads.includes(d.id)));
  }
  assert.ok(active.every((d) => d.extension !== '.rar'));
  assert.equal(new Set(active.map((d) => d.sha256)).size, active.length);
  assert.equal(reanalysis.distributions.length, 39);
  assert.equal(reanalysis.repacked_source_zips.length, 1);
  for (const d of reanalysis.distributions) {
    assert.ok(d.source_rar_sha256 !== d.sha256);
    assert.match(
      d.target_url,
      /^\/downloads\/drawings\/staged\/[a-z0-9-]+\.zip$/,
    );
    assert.ok(d.bytes < 100 * 1024 * 1024);
  }
});

test('recovered previews retain exact member provenance and missing images stay explicit', () => {
  const recovered = reanalysis.updates.filter((u) => u.image_recovered);
  assert.equal(recovered.length, 12);
  assert.equal(reanalysis.missing_images.length, 4);
  for (const u of recovered) {
    assert.match(u.preview.thumbnail_sha256, /^[a-f0-9]{64}$/);
    assert.match(u.preview.member_sha256, /^[a-f0-9]{64}$/);
    assert.ok(u.preview.member);
  }
  assert.equal(
    ownerCatalog.records.find((r) => r.slug === 'jet-engine-manual').downloads
      .length,
    1,
  );
  assert.equal(
    catalog.records.find((r) => r.slug === 'jet-engine-manual').downloads
      .length,
    2,
  );
});
