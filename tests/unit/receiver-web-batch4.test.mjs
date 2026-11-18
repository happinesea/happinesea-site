import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import batch from '../../src/data/manuals/receiver-web-batch4.json' with { type: 'json' };
import all from '../../src/lib/receiver-manuals.mjs';
import { manualCards } from '../../src/lib/manual-directory.mjs';

const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
test('batch4 copies retain independent provenance, untranslated original figures and safe holds', () => {
  assert.equal(batch.manuals.length, 5);
  assert(
    batch.manuals.every((m) =>
      all.manuals.some((r) => r.product_id === m.product_id),
    ),
  );
  assert.equal(
    new Set(all.manuals.map((m) => m.product_id)).size,
    all.manuals.length,
  );
  assert(all.manuals.length >= 20);
  const ts100 = batch.manuals.find((m) => m.product_id === 'ts100-m8n');
  assert.equal(ts100.inventory_product_id, 'ts100');
  assert.equal(ts100.model, 'TS100(M8N)');
  assert.equal(ts100.source.document_id, 'ts100_m8n_user_manual');
  const rtk = batch.manuals.find((m) => m.product_id === 'rtk-f9p');
  assert.equal(rtk.inventory_product_id, 'rtk_f9p');
  assert.equal(rtk.source_product_id, 'rtkf9p');
  assert.equal(rtk.source.document_id, 'rtkf9p_manual');
  assert(
    !batch.manuals.some((m) =>
      ['se100-m10n', 'ts100-m10n'].includes(m.product_id),
    ),
  );
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
