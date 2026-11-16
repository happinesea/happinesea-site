import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import batch from '../../src/data/manuals/receiver-web-batch2.json' with { type: 'json' };
import all from '../../src/lib/receiver-manuals.mjs';
import { manualCards } from '../../src/lib/manual-directory.mjs';

const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
test('batch2 copies retain independent provenance, untranslated original figures and safe holds', () => {
  assert.equal(batch.manuals.length, 5);
  assert.equal(all.manuals.length, 10);
  for (const m of batch.manuals) {
    const mdx = fs.readFileSync(
      `src/content/docs/manuals/${m.product_id}/index.mdx`,
    );
    assert.equal(sha(mdx), m.mdx_sha256);
    assert.equal(
      (mdx.toString().match(/data-translation-unit=/g) ?? []).length,
      m.unit_ids.length,
    );
    assert.equal(m.figure_localization, 'DEFERRED');
    assert.equal(m.pdf, 'DEFERRED');
    assert.equal(m.knowledge, 'DEFERRED');
    assert.equal(m.publication_status, 'UNPUBLISHED');
    assert(!mdx.toString().includes('PDFをダウンロード'));
    assert(
      manualCards
        .find((c) => c.id === m.product_id)
        .links.some((l) => l.href === m.route),
    );
    const dir = `public/assets/radiolink/${m.product_id}/web-ja-v1`;
    for (const f of m.figures)
      assert.equal(
        sha(fs.readFileSync(`${dir}/${f.path.split('/').at(-1)}`)),
        f.sha256,
      );
    for (const id of m.withheld_figure_ids)
      assert(!fs.readdirSync(dir).some((name) => name.startsWith(id + '.')));
    if (m.withheld_unit_ids.length)
      assert.equal(m.publication_readiness, 'WEB_HOLD');
  }
});
