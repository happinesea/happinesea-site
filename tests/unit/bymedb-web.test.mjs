import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import bymedb from '../../src/data/manuals/bymedb-web.json' with { type: 'json' };

const sha = (value) => createHash('sha256').update(value).digest('hex');

test('Byme-DB draft tracks all figures and isolates held assets', () => {
  assert.equal(bymedb.manuals.length, 1);
  const [manual] = bymedb.manuals;
  const dir = 'public/assets/radiolink/byme-db/web-ja-v1';
  const mdx = readFileSync('src/content/docs/manuals/byme-db/index.mdx');
  assert.equal(sha(mdx), manual.mdx_sha256);
  assert.match(mdx.toString(), /status: draft[\s\S]*noindex, nofollow/);
  assert.equal(manual.publication_status, 'UNPUBLISHED');
  assert.equal(manual.publication_readiness, 'WEB_HOLD');
  assert.equal(manual.figures.length + manual.withheld_figure_ids.length, 28);
  for (const figure of manual.figures) {
    assert.equal(
      sha(readFileSync(`${dir}/${figure.path.split('/').at(-1)}`)),
      figure.sha256,
    );
  }
  for (const id of manual.withheld_figure_ids) {
    assert(!mdx.includes(`figureId="${id}"`));
    assert(!readdirSync(dir).some((filename) => filename.startsWith(id + '.')));
  }
});
