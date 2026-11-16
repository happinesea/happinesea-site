import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import data from '../../src/data/manuals/receiver-web-pilot.json' with { type: 'json' };
import catalogue from '../../src/data/product-catalogue.json' with { type: 'json' };
import { manualCards } from '../../src/lib/manual-directory.mjs';

const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
test('five receiver publication copies retain source/canonical identities and safe holds', () => {
  assert.equal(data.manuals.length, 5);
  for (const manual of data.manuals) {
    const mdx = fs.readFileSync(
      `src/content/docs/manuals/${manual.product_id}/index.mdx`,
    );
    assert.equal(sha(mdx), manual.mdx_sha256);
    assert.equal(manual.pdf, 'DEFERRED');
    assert.equal(manual.knowledge, 'DEFERRED');
    assert.equal(manual.publication_status, 'UNPUBLISHED');
    assert.equal(
      (mdx.toString().match(/data-translation-unit=/g) ?? []).length,
      manual.unit_ids.length,
    );
    assert(!mdx.toString().includes('PDFをダウンロード'));
    assert(!mdx.toString().includes('TECHNICAL_CONFIRMATION_REQUIRED'));
    assert(
      catalogue.find((p) => p.id === manual.product_id).detailPath ===
        manual.product_route,
    );
    assert(
      manualCards
        .find((m) => m.id === manual.product_id)
        .links.some((l) => l.href === manual.route),
    );
    for (const f of manual.figures) {
      const file = `public/assets/radiolink/${manual.product_id}/web-ja-v1/${f.path.split('/').at(-1)}`;
      assert.equal(sha(fs.readFileSync(file)), f.sha256);
    }
    const assets = fs.readdirSync(
      `public/assets/radiolink/${manual.product_id}/web-ja-v1`,
    );
    for (const id of manual.withheld_figure_ids) {
      assert(!assets.some((name) => name.startsWith(`${id}.`)));
      assert(!mdx.toString().includes(`figureId="${id}"`));
    }
  }
});
