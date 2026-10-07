import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('download filenames are decoded before rejecting unsafe leaf names', async () => {
  const { downloadFilename } =
    await import('../../scripts/lib/legacy-compatibility.mjs');
  assert.equal(
    downloadFilename('%E8%A8%AD%E8%A8%88%E5%9B%B3.zip'),
    '設計図.zip',
  );
  for (const name of [
    '%2e%2e%2fpackage.json',
    '%5cpackage.json',
    '..',
    'a%00.zip',
    'a%3a.zip',
    'NUL.zip',
  ])
    assert.throws(() => downloadFilename(name), /unsafe/);
});

test('legacy publication module preserves nested entry content and glossary anchors', async () => {
  const module = '../..' + '/scripts/lib/legacy-compatibility.mjs';
  assert.ok(
    await readFile(new URL(module, import.meta.url), 'utf8').catch(() => ''),
    'compatibility implementation missing',
  );
  const { entryContent, prepareLegacyHtml, assetPath } = await import(module);
  assert.equal(
    entryContent(
      '<aside>x</aside><div class="entry-content"><p>A</p><div><p>B</p></div></div><footer>C</footer>',
    ),
    '<p>A</p><div><p>B</p></div>',
  );
  assert.equal(
    assetPath('https://happinesea.com/wp-content/uploads/a.zip'),
    '/wp-content/uploads/a.zip',
  );
  assert.throws(() => assetPath('https://evil.example/a.zip'), /origin/);
  const html = prepareLegacyHtml(
    '<h3 id="1">あ行</h3><a href="#1">目次</a><a href="#" data-downloadurl="https://happinesea.com/download/x?wpdmdl=1&amp;refresh=a">Download</a>',
    new Map(),
    new Map([['1', '/wp-content/uploads/a.zip']]),
  );
  assert.match(html, /id="1"/);
  assert.match(html, /href="#1"/);
  assert.match(html, /href="\/wp-content\/uploads\/a.zip"/);
  assert.doesNotMatch(html, /data-downloadurl/);
  assert.throws(
    () =>
      prepareLegacyHtml(
        '<a href="#" data-downloadurl="https://happinesea.com/download/x?wpdmdl=2">Download</a>',
        new Map(),
        new Map(),
      ),
    /unresolved download/,
  );
  assert.throws(
    () => prepareLegacyHtml('<script>alert(1)</script>', new Map(), new Map()),
    /forbidden HTML/,
  );
});

test('legacy .html output becomes an exact file, and digest drift fails closed', async () => {
  const module = await import('../../scripts/lib/legacy-compatibility.mjs');
  assert.equal(
    typeof module.finalizeLegacyOutputs,
    'function',
    'static compatibility finalizer missing',
  );
  const dir = await mkdtemp(join(tmpdir(), 'legacy-compat-test-'));
  try {
    await mkdir(join(dir, 'engineering-drawing/123.html'), { recursive: true });
    const html =
      '<link rel="canonical" href="https://happinesea.com/engineering-drawing/123.html"><h1>Drawing</h1>';
    await writeFile(join(dir, 'engineering-drawing/123.html/index.html'), html);
    const snapshot = {
      pages: [
        {
          target_route: '/engineering-drawing/123.html',
          canonical: 'https://happinesea.com/engineering-drawing/123.html',
        },
      ],
      assets: [],
    };
    await module.finalizeLegacyOutputs(snapshot, dir);
    assert.equal(
      await readFile(join(dir, 'engineering-drawing/123.html'), 'utf8'),
      html,
    );
    await module.finalizeLegacyOutputs(snapshot, dir);
    await writeFile(join(dir, 'wrong.zip'), 'wrong');
    await assert.rejects(
      () =>
        module.finalizeLegacyOutputs(
          {
            pages: [],
            assets: [{ target_route: '/wrong.zip', sha256: '0'.repeat(64) }],
          },
          dir,
        ),
      /checksum/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
