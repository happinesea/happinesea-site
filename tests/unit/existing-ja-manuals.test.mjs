import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const hash = (value) => createHash('sha256').update(value).digest('hex');

test('all eleven existing Japanese source files resolve to distinct reviewed publication identities', async () => {
  const inventory = JSON.parse(
    await readFile(
      new URL('src/data/manuals/existing-ja.json', root),
      'utf8',
    ).catch(() => 'null'),
  );
  assert(inventory, 'existing Japanese manual inventory/publication missing');
  assert.equal(inventory.manuals.length, 8);
  const sources = inventory.manuals.flatMap((manual) => manual.sources);
  assert.equal(
    sources.filter((source) => source.path.endsWith('.pdf')).length,
    5,
  );
  assert.equal(
    sources.filter((source) => source.path.endsWith('.docx')).length,
    6,
  );
  assert.equal(new Set(sources.map((source) => source.path)).size, 11);
  assert.equal(
    new Set(inventory.manuals.map((manual) => manual.id)).size,
    inventory.manuals.length,
  );
  assert.equal(
    new Set(inventory.manuals.map((manual) => manual.route)).size,
    inventory.manuals.length,
  );
  for (const manual of inventory.manuals) {
    assert.equal(manual.language, 'ja');
    assert.notEqual(manual.route, '/manuals/rc4gs-v2/');
    assert.equal(manual.knowledge_status, 'NOT_VALIDATED');
    for (const source of manual.sources)
      assert.match(source.sha256, /^[a-f0-9]{64}$/);
    const contentPath = new URL(
      `src/content/docs${manual.route}index.mdx`,
      root,
    );
    if (manual.publication_status === 'BLOCKED_SAFETY_REVIEW') {
      assert(['rc6gs', 'rc4gs'].includes(manual.product));
      assert.equal(manual.sections.length, 0);
      assert.equal(manual.assets.length, 0);
      assert(manual.blocker);
      await assert.rejects(access(contentPath));
      continue;
    }
    const page = await readFile(contentPath, 'utf8');
    if (manual.download) {
      const pdf = manual.sources.find((source) => source.path.endsWith('.pdf'));
      assert.equal(
        manual.assets.find((asset) => asset.src === manual.download).sha256,
        pdf.sha256,
        'original PDF bytes must not change',
      );
    }
    for (const asset of manual.assets)
      assert.equal(
        hash(await readFile(new URL(`public${asset.src}`, root))),
        asset.sha256,
        asset.src,
      );
    for (const section of manual.sections) {
      assert.equal(
        hash(section.content_html),
        section.sha256,
        `${manual.id}/${section.id}`,
      );
      assert(section.source_locator);
      assert(
        page.includes(section.id),
        `${manual.id} missing source section link`,
      );
      assert(
        !/<script\b|<iframe\b|\son\w+=|javascript:/i.test(section.content_html),
      );
      for (const match of section.content_html.matchAll(/src="([^"]+)"/g))
        assert(
          manual.assets.some((asset) => asset.src === match[1]),
          `unregistered image ${match[1]}`,
        );
      for (const match of section.content_html.matchAll(/id="([^"]+)"/g))
        assert(
          page.includes(`#${match[1]}`),
          `unlinked source heading ${match[1]}`,
        );
    }
  }
  assert.equal(
    inventory.manuals.filter(
      (manual) => manual.publication_status === 'publication_copy',
    ).length,
    5,
  );
  assert.equal(
    inventory.manuals.filter(
      (manual) => manual.publication_status === 'BLOCKED_SAFETY_REVIEW',
    ).length,
    3,
  );
  const receiverTable = inventory.manuals
    .find((manual) => manual.product === 'rc8x')
    .sections.find(
      (section) => section.source_locator.page === 12,
    ).content_html;
  assert.match(receiverTable, /colspan="5"[^>]*>[^<]*外部バッテリー/);
  assert.match(receiverTable, /rowspan="5"/);
  assert.match(receiverTable, /<th[^>]*scope="/);
  assert.match(receiverTable, /<th scope="col">ノーマル<\/th>/);
});

test('direct Astro builds fail closed on changed bytes, missing files, changed text and blocked content', async () => {
  const { verifyExistingJapaneseManuals } =
    await import('../../scripts/lib/existing-ja-manuals.mjs');
  const inventory = JSON.parse(
    await readFile(new URL('src/data/manuals/existing-ja.json', root), 'utf8'),
  );
  verifyExistingJapaneseManuals(inventory, new URL('public/', root));
  for (const mutation of ['bytes', 'missing', 'text', 'blocked']) {
    const candidate = globalThis.structuredClone(inventory);
    const manual = candidate.manuals.find(
      (manual) => manual.publication_status === 'publication_copy',
    );
    if (mutation === 'bytes') manual.assets[0].sha256 = '0'.repeat(64);
    if (mutation === 'missing')
      manual.assets[0].src =
        '/assets/radiolink/rc8x/manuals/rc8x-quick-reference/does-not-exist.webp';
    if (mutation === 'text')
      manual.sections[0].content_html += '<p>unreviewed change</p>';
    if (mutation === 'blocked')
      candidate.manuals
        .find((manual) => manual.publication_status === 'BLOCKED_SAFETY_REVIEW')
        .sections.push(manual.sections[0]);
    assert.throws(
      () => verifyExistingJapaneseManuals(candidate, new URL('public/', root)),
      mutation,
    );
  }
});
