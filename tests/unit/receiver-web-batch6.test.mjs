import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import batch from '../../src/data/manuals/receiver-web-batch6.json' with { type: 'json' };

const sha = (value) => createHash('sha256').update(value).digest('hex');

test('Batch 6 export retains source-bound figures and isolates held images', () => {
  for (const manual of batch.manuals) {
    const dir = `public/assets/radiolink/${manual.product_id}/web-ja-v1`;
    const mdx = readFileSync(
      `src/content/docs/manuals/${manual.product_id}/index.mdx`,
    );
    assert.equal(sha(mdx), manual.mdx_sha256);
    assert.match(mdx.toString(), /status: draft[\s\S]*noindex, nofollow/);
    assert.equal(manual.publication_status, 'UNPUBLISHED');
    for (const figure of manual.figures) {
      assert.equal(
        sha(readFileSync(`${dir}/${figure.path.split('/').at(-1)}`)),
        figure.sha256,
      );
    }
    for (const id of manual.withheld_figure_ids) {
      assert(!mdx.includes(id));
      assert(
        !readdirSync(dir).some((filename) => filename.startsWith(id + '.')),
      );
    }
  }
});
