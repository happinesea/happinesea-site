import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const load = async () => {
  const path = new URL('../../src/data/manuals/rc4gs-v2.json', import.meta.url);
  const value = await readFile(path, 'utf8').catch(() => 'null');
  assert.notEqual(value, 'null', 'RC4GS V2 manual publication missing');
  return JSON.parse(value);
};

test('RC4GS V2 includes every original chapter section and binds source evidence', async () => {
  const manual = await load();
  assert.equal(manual.sections.length, 30);
  assert.deepEqual(
    manual.sections.filter((x) => x.chapter === 1).map((x) => x.number),
    ['1.1', '1.2', '1.3', '1.4', '1.5'],
  );
  for (let i = 1; i <= 22; i++)
    assert(manual.sections.some((x) => x.number === `2.${i}`));
  for (const number of ['2.16.1', '2.16.2', '2.16.3'])
    assert(manual.sections.some((x) => x.number === number));
  for (const section of manual.sections) {
    assert.match(section.source_sha256, /^[a-f0-9]{64}$/);
    assert.match(section.publication_sha256, /^[a-f0-9]{64}$/);
    assert.match(section.target, /^\/manuals\/rc4gs-v2\/chapter-0[12]\/#s-/);
  }
});

test('manual preserves image order, alt, captions, numbers and UI while rejecting source drift', async () => {
  const manual = await load();
  const { verifyRc4gsManual } =
    await import('../../scripts/lib/rc4gs-v2-manual.mjs');
  const articles = JSON.parse(
    await readFile(
      new URL('../../src/data/wordpress-insights.json', import.meta.url),
      'utf8',
    ),
  );
  verifyRc4gsManual(manual, articles);
  const broken = globalThis.structuredClone(manual);
  broken.sections[0].content_html += '<p>追加の仕様42</p>';
  assert.throws(() => verifyRc4gsManual(broken, articles), /publication drift/);
  const source = globalThis.structuredClone(articles);
  source.find((x) => x.contract.id === 199).content_html += '<p>変化</p>';
  assert.throws(() => verifyRc4gsManual(manual, source), /source drift/);
  const changedUi = globalThis.structuredClone(manual);
  const { sha256 } = await import('../../scripts/lib/rc4gs-v2-manual.mjs');
  changedUi.sections[0].content_html =
    changedUi.sections[0].content_html.replace('RC4GS', 'RC4GT');
  changedUi.sections[0].publication_sha256 = sha256(
    changedUi.sections[0].content_html,
  );
  assert.throws(
    () => verifyRc4gsManual(changedUi, articles),
    /UI\/technical label drift/,
  );
});

test('legacy manual URL mapping is exact, query/hash aware and does not catch unrelated content', async () => {
  const manual = await load();
  const { migratedManualTarget } =
    await import('../../scripts/lib/rc4gs-v2-manual.mjs');
  assert.equal(
    migratedManualTarget(
      'https://happinesea.com/radiolink-support/manual/20200315199.html?x=1',
      manual,
    ),
    '/manuals/rc4gs-v2/chapter-01/?x=1#s-1-1',
  );
  assert.equal(
    migratedManualTarget(
      'https://happinesea.com/radiolink-support/rc4gs-manual/20200316196.html#s-1-2-1',
      manual,
    ),
    '/manuals/rc4gs-v2/chapter-01/#s-1-2-1',
  );
  assert.equal(
    migratedManualTarget(
      'https://other.example/radiolink-support/manual/20200315199.html',
      manual,
    ),
    undefined,
  );
  assert.equal(
    migratedManualTarget('https://happinesea.com/news/unknown.html', manual),
    undefined,
  );
});

test('all reused local manual image bytes retain their reviewed publication hash', async () => {
  const manual = await load();
  const { sha256 } = await import('../../scripts/lib/rc4gs-v2-manual.mjs');
  assert.equal(manual.assets.length, 27);
  for (const asset of manual.assets)
    assert.equal(
      sha256(
        await readFile(new URL('../../public' + asset.src, import.meta.url)),
      ),
      asset.localized_sha256,
      asset.src,
    );
});
