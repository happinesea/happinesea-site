import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';

const run = promisify(execFile);
const hash = (text) => createHash('sha256').update(text).digest('hex');
const html = '<link rel="canonical" href="https://happinesea.com/">expected';

async function verify(t, { status = 200, body = html, canonical = html } = {}) {
  const dist = await mkdtemp(join(tmpdir(), 'html-evidence-test-'));
  await writeFile(join(dist, 'index.html'), canonical);
  for (const name of ['sitemap-index.xml', 'sitemap-0.xml'])
    await writeFile(join(dist, name), '<loc>https://happinesea.com/</loc>');
  await writeFile(
    join(dist, 'robots.txt'),
    'User-agent: *\nAllow: /\nSitemap: https://happinesea.com/sitemap-index.xml\n',
  );
  const server = createServer((req, res) => {
    res.writeHead(req.url === '/' ? status : 200, {
      'Content-Type': 'text/html',
      ETag: '"test"',
      Age: '12',
    });
    res.end(req.url === '/' ? body : 'wrong download bytes');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const base = `http://127.0.0.1:${server.address().port}/`;
  let failure;
  try {
    await run(
      process.execPath,
      ['scripts/verify-publication-origin.mjs', dist],
      {
        env: {
          ...process.env,
          PUBLICATION_MODE: 'production',
          E2E_BASE_URL: base,
        },
      },
    );
  } catch (error) {
    failure = error;
  }
  assert(failure, 'invalid publication must fail');
  return { failure, base };
}

test('HTML mismatch fails and preserves exact bytes plus selected cache headers', async (t) => {
  const { failure, base } = await verify(t, { body: 'stale HTML' });
  assert.match(failure.stderr, /deployed HTML differs from artifact/);
  const key = hash(base);
  const root = `test-results/artifact-mismatches/${key}`;
  assert.equal(await readFile(`${root}.expected.html`, 'utf8'), html);
  assert.equal(await readFile(`${root}.received.html`, 'utf8'), 'stale HTML');
  const evidence = JSON.parse(await readFile(`${root}.json`, 'utf8'));
  assert.equal(evidence.received_sha256, hash('stale HTML'));
  assert.equal(evidence.headers.age, '12');
  assert.equal(evidence.headers.etag, '"test"');
});

for (const status of [404, 500])
  test(`HTTP ${status} fails rather than becoming a retryable HTML mismatch`, async (t) => {
    const { failure } = await verify(t, { status });
    assert.match(failure.stderr, /deployed HTML HTTP status/);
  });

test('download hash mismatch remains fatal', async (t) => {
  const { failure } = await verify(t);
  assert.match(failure.stderr, /AssertionError/);
  assert.match(failure.stderr, /\/downloads\/drawings\//);
  assert.doesNotMatch(failure.stderr, /deployed HTML differs/);
});

test('canonical origin violation remains fatal before fetching', async (t) => {
  const { failure } = await verify(t, {
    canonical: '<link rel="canonical" href="https://wrong.example/">',
  });
  assert.match(failure.stderr, /wrong.example/);
});
