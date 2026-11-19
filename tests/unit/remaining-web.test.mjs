import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import remaining from '../../src/data/manuals/remaining-web.json' with { type: 'json' };

const sha = (value) => createHash('sha256').update(value).digest('hex');

test('Remaining manual candidates isolate held units and images and preserve source hashes', () => {
  assert.equal(remaining.manuals.length, 13);
  assert.equal(
    new Set(remaining.manuals.map((m) => m.inventory_product_id)).size,
    13,
  );
  for (const manual of remaining.manuals) {
    const dir = `public/assets/radiolink/${manual.product_id}/web-ja-v1`;
    const mdx = readFileSync(
      `src/content/docs/manuals/${manual.product_id}/index.mdx`,
    );
    assert.equal(sha(mdx), manual.mdx_sha256);
    assert.match(mdx.toString(), /status: draft[\s\S]*noindex, nofollow/);
    assert.equal(manual.publication_status, 'UNPUBLISHED');
    assert.equal(manual.publication_readiness, 'WEB_HOLD');
    if (manual.product_id === 'f405') {
      assert.equal(
        manual.source.document_scope,
        'QUICK_START_GUIDE_NOT_FULL_MANUAL',
      );
      assert.match(mdx.toString(), /^title: F405 V1\.1 日本語クイックガイド$/m);
    }
    if (manual.product_id === 'f121') {
      assert(manual.withheld_notice_count > 0);
      assert(manual.withheld_notice_count < manual.withheld_unit_ids.length);
    }
    const shown = manual.figures.flatMap(
      (figure) => figure.source_figure_ids ?? [figure.figure_id],
    );
    assert.equal(new Set(shown).size, shown.length);
    assert(!shown.some((id) => manual.withheld_figure_ids.includes(id)));
    assert.equal(
      shown.length + manual.withheld_figure_ids.length,
      manual.source_figures_total,
    );
    assert.equal(
      (mdx.toString().match(/:::caution\[原典確認待ち\]/g) ?? []).length,
      manual.withheld_notice_count ?? manual.withheld_unit_ids.length,
    );
    for (const figure of manual.figures) {
      assert.equal(
        sha(readFileSync(`${dir}/${figure.path.split('/').at(-1)}`)),
        figure.sha256,
      );
    }
    for (const id of manual.withheld_figure_ids) {
      assert(!mdx.includes(`figureId="${id}"`));
      assert(
        !existsSync(dir) ||
          !readdirSync(dir).some((filename) => filename.startsWith(id + '.')),
      );
    }
  }
});
