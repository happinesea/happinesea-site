import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import remaining from '../../src/data/manuals/remaining-web.json' with { type: 'json' };

const sha = (value) => createHash('sha256').update(value).digest('hex');

test('Remaining manual candidates isolate held units and images and preserve source hashes', () => {
  assert.equal(remaining.manuals.length, 22);
  assert.equal(
    new Set(remaining.manuals.map((m) => m.inventory_product_id)).size,
    22,
  );
  for (const manual of remaining.manuals) {
    const dir = `public/assets/radiolink/${manual.product_id}/web-ja-v1`;
    const mdx = readFileSync(
      `src/content/docs/manuals/${manual.product_id}/index.mdx`,
    );
    assert.equal(sha(mdx), manual.mdx_sha256);
    assert.match(mdx.toString(), /status: draft[\s\S]*noindex, nofollow/);
    assert.equal(manual.publication_status, 'UNPUBLISHED');
    assert.equal(
      manual.publication_readiness,
      ['ld-a40', 'f450'].includes(manual.product_id)
        ? 'WEB_QA_REQUIRED'
        : 'WEB_HOLD',
    );
    if (manual.product_id === 'f405') {
      assert.equal(
        manual.source.document_scope,
        'QUICK_START_GUIDE_NOT_FULL_MANUAL',
      );
      assert.match(mdx.toString(), /^title: F405 V1\.1 日本語クイックガイド$/m);
    }
    if (
      ['f121', 'f121-pro', 'ts100-m10n', 'vds200'].includes(manual.product_id)
    ) {
      assert(manual.withheld_notice_count > 0);
      assert(manual.withheld_notice_count < manual.withheld_unit_ids.length);
    }
    if (manual.product_id === 'ts100-m10n') {
      assert.equal(manual.source.page_count, null);
      assert.match(mdx.toString(), /対象はTS100 V2\.0（M10N）です/);
    }
    if (manual.product_id === 'f125') {
      const text = mdx.toString();
      assert.equal(manual.source_figures_total, 100);
      assert.match(text, /CM120の給電元の出力電圧は5 Vを超えてはなりません/);
      assert.match(text, /FPVゴーグルのMicro USB充電端子はDC 5 V専用/);
      assert.match(text, /スロットルスティックを直ちに最下位置/);
      assert.doesNotMatch(text, /25 MW|200 MW|CH5スイッチを後方へ/);
    }
    if (manual.product_id === 'd460') {
      assert.match(mdx.toString(), /^## 第1章 D460の概要$/m);
      assert.match(mdx.toString(), /^## D460（PNP）取扱説明書$/m);
    }
    if (manual.product_id === 'd16pro-200') {
      const text = mdx.toString();
      assert.equal(manual.unit_ids.length, 74);
      assert.equal(manual.withheld_unit_ids.length, 58);
      assert.equal(manual.source_figures_total, 42);
      assert.match(
        text,
        /ディスアームが完了したことを確認[\s\S]*?具体的にいつバッテリーを取り外すかは、原典の記載から確認できていません[\s\S]*?9\. 離陸時/,
      );
      assert(!text.includes('Please unplug the battery until'));
      assert.match(
        text,
        /figureId="d16pro-p1-f3"[\s\S]*?figureId="d16pro-p1-f2"[\s\S]*?figureId="d16pro-p1-f1"/,
      );
      assert.doesNotMatch(text, /不明のためnull|scopeを維持/);
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
