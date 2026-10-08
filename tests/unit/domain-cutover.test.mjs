import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import {
  classifyAsset,
  references,
  fetchRedirects,
} from '../../scripts/audit-domain-cutover.mjs';

test('native redirect resolution reaches a UTF-8 Location served as raw header bytes', async (t) => {
  const server = createServer((request, response) => {
    if (request.url === '/start') {
      response.writeHead(301, {
        location: Buffer.from('/設計/', 'utf8').toString('latin1'),
      });
    } else
      response.writeHead(
        decodeURIComponent(request.url) === '/設計/' ? 200 : 404,
      );
    response.end();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const result = await fetchRedirects(
    `http://127.0.0.1:${server.address().port}/start`,
    'HEAD',
  );
  assert.equal(result.response.status, 200);
  assert.equal(decodeURIComponent(new URL(result.current).pathname), '/設計/');
  assert.equal(result.redirects[0].resolution, 'native-fetch-follow');
});

test('raw non-ASCII redirect headers use native follow without manufacturing a mojibake URL', async () => {
  const url = 'https://example.test/%e8%a8%ad%e8%a8%88';
  const calls = [];
  const live = { status: 200, url: `${url}/` };
  const result = await fetchRedirects(url, 'HEAD', async (value, options) => {
    calls.push({ value, method: options.method, redirect: options.redirect });
    return options.redirect === 'follow'
      ? live
      : {
          status: 301,
          headers: { get: () => '/è¨­è¨\u0088/' },
          body: { cancel: async () => {} },
        };
  });
  assert.equal(result?.response, live);
  assert.equal(result.current, live.url);
  assert.deepEqual(calls, [
    { value: url, method: 'HEAD', redirect: 'manual' },
    { value: url, method: 'HEAD', redirect: 'follow' },
  ]);
});

test('referenced assets cannot be called orphan or optional because their URL resembles a thumbnail', () => {
  const asset = {
    legacy_url: 'https://happinesea.com/a-300x200.jpg',
    migration_status: 'NEEDS_REVIEW',
    source: ['REST media 1'],
  };
  assert.equal(classifyAsset(asset, ['live page']), 'REQUIRED_FOR_CUTOVER');
  assert.equal(classifyAsset(asset, []), 'DERIVATIVE');
  assert.equal(
    classifyAsset({ ...asset, migration_status: 'BLOCKED' }, ['live page']),
    'BLOCKED',
  );
  assert.equal(
    classifyAsset({ ...asset, legacy_url: 'https://happinesea.com/a.jpg' }, []),
    'ORPHAN',
  );
  assert.equal(
    classifyAsset(
      {
        ...asset,
        legacy_url: 'https://happinesea.com/a.jpg',
        source: ['historical attachment page'],
      },
      [],
    ),
    'OPTIONAL_ARCHIVE',
  );
});

test('resource extraction separates metadata and navigation from actual runtime dependencies', () => {
  const refs = references(
    '<link rel="canonical" href="https://happinesea.com/a"><a href="/b#c">b</a><img src="/x.gif" srcset="/y.jpg 2x"><script src="/wp-json/a"></script>',
    'https://happinesea.github.io/happinesea-site/',
  );
  assert.equal(refs.filter((x) => x.kind === 'runtime').length, 3);
  assert.equal(refs.find((x) => x.url.endsWith('/b#c')).kind, 'navigation');
  assert.equal(
    refs.find((x) => x.url === 'https://happinesea.com/a').kind,
    'metadata',
  );
});
