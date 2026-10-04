import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const article = {
  id: 1876,
  slug: 'video',
  route: '/insights/video/',
  canonical: 'https://happinesea.com/product/202201041876.html',
};
const manifest = { expected_count: 1, articles: [article], withdrawals: [] };

test('static legacy aliases reuse article HTML at the exact source filename without redirect', async (t) => {
  const dist = await mkdtemp(join(tmpdir(), 'wordpress-alias-test-'));
  t.after(() => rm(dist, { recursive: true, force: true }));
  await mkdir(join(dist, 'insights/video'), { recursive: true });
  await writeFile(
    join(dist, 'insights/video/index.html'),
    '<html><link rel="canonical" href="https://happinesea.com/product/202201041876.html"><h1>video</h1></html>',
  );
  const module = await import('../../scripts/copy-wordpress-aliases.mjs').catch(
    () => null,
  );
  assert.equal(
    typeof module?.copyWordpressAliases,
    'function',
    'static legacy alias copier is missing',
  );
  await module.copyWordpressAliases(manifest, dist);
  assert.equal(
    await readFile(join(dist, 'product/202201041876.html'), 'utf8'),
    await readFile(join(dist, 'insights/video/index.html'), 'utf8'),
  );
  await assert.rejects(
    module.copyWordpressAliases(manifest, dist),
    /collision/,
  );
});

test('static legacy alias plan rejects unsafe paths, missing articles and duplicate targets before writing', async (t) => {
  const dist = await mkdtemp(join(tmpdir(), 'wordpress-alias-test-'));
  t.after(() => rm(dist, { recursive: true, force: true }));
  const module = await import('../../scripts/copy-wordpress-aliases.mjs').catch(
    () => null,
  );
  assert.equal(
    typeof module?.copyWordpressAliases,
    'function',
    'static legacy alias copier is missing',
  );
  for (const canonical of [
    'https://evil.example/news/1.html',
    'https://happinesea.com/news/../1.html',
    'https://happinesea.com/news/%2e%2e/1.html',
    'https://happinesea.com/news/1.html?x=1',
  ]) {
    await assert.rejects(
      module.copyWordpressAliases(
        { ...manifest, articles: [{ ...article, canonical }] },
        dist,
      ),
      /unsafe canonical/,
    );
  }
  await assert.rejects(
    module.copyWordpressAliases({ ...manifest, expected_count: 2 }, dist),
    /count/,
  );
  await assert.rejects(
    module.copyWordpressAliases(
      { ...manifest, articles: [{ ...article, route: '/wrong/' }] },
      dist,
    ),
    /route/,
  );
  await assert.rejects(
    module.copyWordpressAliases(
      {
        ...manifest,
        articles: [{ ...article, slug: '..', route: '/insights/../' }],
      },
      dist,
    ),
    /slug/,
  );
  await assert.rejects(
    module.copyWordpressAliases(
      {
        ...manifest,
        expected_count: 2,
        articles: [article, { ...article, id: 2 }],
      },
      dist,
    ),
    /duplicate/,
  );
  await assert.rejects(module.copyWordpressAliases(manifest, dist), /ENOENT/);
});
