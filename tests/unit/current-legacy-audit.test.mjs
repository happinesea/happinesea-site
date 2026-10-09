import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  classifyCurrent,
  inspectRequiredDownloads,
} from '../../scripts/audit-current-legacy.mjs';

test('cutover classification follows current references, not historical source-only references', () => {
  assert.equal(classifyCurrent({ referenced: false }), 'ORPHAN');
  assert.equal(
    classifyCurrent({ referenced: false, derivative: true }),
    'DERIVATIVE',
  );
  assert.equal(
    classifyCurrent({ referenced: true, derivative: true }),
    'REQUIRED_FOR_CUTOVER',
  );
  assert.equal(
    classifyCurrent({ referenced: true, resolved: true }),
    'ALREADY_RESOLVED',
  );
  assert.equal(classifyCurrent({ retired: true }), 'SAFE_TO_RETIRE');
  assert.equal(
    classifyCurrent({ ownerUnknown: true, resolved: true }),
    'UNKNOWN_OWNER_DECISION',
  );
});

test('download audit uses literal widget URL and does not accept an HTML error as a file', async (t) => {
  const page = 'https://happinesea.com/download/firmware';
  t.mock.method(
    globalThis,
    'fetch',
    async (url) =>
      new Response(
        url === page
          ? `<a href="#" data-downloadurl="${page}?wpdmdl=1&amp;refresh=literal">Download</a>`
          : 'No file attached',
        { status: 200, headers: { 'content-type': 'text/html' } },
      ),
  );
  const receipts = await inspectRequiredDownloads([{ url: page, status: 200 }]);
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].url, page + '?wpdmdl=1&refresh=literal');
  assert.equal(receipts[0].response_is_binary, false);
});

test('fresh audit counts include every observed legacy reference and distinguish localization from routes', async () => {
  const audit = JSON.parse(
    await readFile('docs/audits/current-legacy-reaudit.json', 'utf8'),
  );
  const keys = (url) =>
    new URL(url).href.replace(/%[a-f\d]{2}/gi, (s) => s.toUpperCase());
  const rows = new Map(audit.rows.map((r) => [keys(r.legacy_url), r]));
  assert.equal(audit.rows.length, audit.summary.classified_urls);
  assert.equal(
    Object.values(audit.summary.classifications).reduce((a, b) => a + b, 0),
    audit.rows.length,
  );
  for (const ref of audit.old_origin_checks)
    assert.ok(rows.has(keys(ref.legacy_url)), ref.legacy_url);
  for (const row of audit.rows) {
    if (new URL(row.legacy_url).searchParams.has('p'))
      assert.notEqual(row.classification, 'ALREADY_RESOLVED');
    if (row.resolution === 'localized source; exact source path not implied')
      assert.equal(row.target_route, null);
  }
});
