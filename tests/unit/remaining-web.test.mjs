import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import remaining from '../../src/data/manuals/remaining-web.json' with { type: 'json' };

const sha = (value) => createHash('sha256').update(value).digest('hex');

test('Remaining manual candidates isolate held units and images and preserve source hashes', () => {
  assert.equal(remaining.manuals.length, 4);
  assert.equal(
    new Set(remaining.manuals.map((m) => m.inventory_product_id)).size,
    4,
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
    assert.equal(
      manual.figures.length + manual.withheld_figure_ids.length,
      manual.source_figures_total,
    );
    assert.equal(
      (mdx.toString().match(/:::caution\[原典確認待ち\]/g) ?? []).length,
      manual.withheld_unit_ids.length,
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
        !readdirSync(dir).some((filename) => filename.startsWith(id + '.')),
      );
    }
  }
});
