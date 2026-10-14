import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  productionCatalog,
  publicationRecords,
  recordDownloads,
  ownerExclusions,
} from '../../src/lib/drawing-publication.mjs';
test('owner-approved publication is complete and preserves asset hashes without retired records', async () => {
  const records = publicationRecords({});
  assert.equal(records.length, productionCatalog.records.length);
  assert.ok(records.length > 6);
  assert.equal(records.filter((r) => r.existing).length, 6);
  const downloads = records.flatMap((r) => recordDownloads(r, {}));
  assert.equal(new Set(downloads.map((d) => d.sha256)).size, downloads.length);
  for (const r of records) {
    assert.equal(r.publication_right, 'OWNER_APPROVED');
    assert.ok(!ownerExclusions.some((e) => e.record_id === r.id));
    assert.ok(r.featured_image.src);
    await readFile(
      new URL('../../public' + r.featured_image.src, import.meta.url),
    );
  }
  for (const d of downloads) {
    assert.equal(d.publication_right, 'OWNER_APPROVED');
    assert.ok(!d.target_url.endsWith('.rar'));
    const data = await readFile(
      new URL('../../public' + d.target_url, import.meta.url),
    );
    assert.equal(data.length, d.bytes);
    assert.equal(createHash('sha256').update(data).digest('hex'), d.sha256);
  }
});
