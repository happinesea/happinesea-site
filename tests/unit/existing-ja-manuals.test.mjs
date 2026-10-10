import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const hash = (value) => createHash('sha256').update(value).digest('hex');

test('safety-blocked links navigate to a notice while external and approved downloads remain unchanged', async () => {
  const { rewriteSafetyBlockedDownloads } =
    await import('../../scripts/lib/existing-ja-manuals.mjs');
  const files = JSON.parse(
    await readFile(new URL('src/data/static-downloads.json', root), 'utf8'),
  ).files;
  assert.equal(
    files.filter((file) => file.status === 'BLOCKED_SAFETY_REVIEW').length,
    6,
  );
  const blocked = files.find((file) => file.status === 'BLOCKED_SAFETY_REVIEW');
  for (const path of [blocked.target_route, ...blocked.legacy_routes]) {
    const html = `<a href="${path}?version=1" download>Download</a>`;
    const rewritten = rewriteSafetyBlockedDownloads(
      html,
      files,
      '/downloads/#manual-safety-review',
    );
    assert(rewritten.includes('href="/downloads/#manual-safety-review"'));
    assert(!rewritten.includes(' download>'));
    assert(rewritten.includes('data-safety-withheld-download'));
    const external = `<a href="https://example.com${path}" download>Download</a>`;
    assert.equal(
      rewriteSafetyBlockedDownloads(external, files, '/downloads/'),
      external,
    );
  }
  const approved = files.find((file) => file.status === 'KEEP');
  const html = `<a href="${approved.target_route}" download>Download</a>`;
  assert.equal(rewriteSafetyBlockedDownloads(html, files, '/downloads/'), html);
});

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
    6,
  );
  assert.equal(
    inventory.manuals.filter(
      (manual) => manual.publication_status === 'BLOCKED_SAFETY_REVIEW',
    ).length,
    2,
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

test('R7FG V1.4 quick reference records exact corrections without exposing unsafe text or QR', async () => {
  const { verifyExistingJapaneseManuals } =
    await import('../../scripts/lib/existing-ja-manuals.mjs');
  const inventory = JSON.parse(
    await readFile(new URL('src/data/manuals/existing-ja.json', root), 'utf8'),
  );
  const quick = inventory.manuals.find(
    (manual) => manual.route === '/manuals/rc6gs-v3-quick-reference/',
  );
  assert.equal(quick.publication_status, 'publication_copy');
  assert.equal(quick.safety_review.applicability_established, true);
  assert.equal(quick.technical_changes.length, 9);
  const text = quick.sections.map((section) => section.content_html).join('');
  for (const correction of quick.technical_changes) {
    assert(correction.source_locator.paragraphs.length);
    assert.match(correction.evidence.sha256, /^[a-f0-9]{64}$/);
    assert(correction.evidence.physical_pages.length);
    if (!correction.before.startsWith('図')) {
      assert(!text.includes(correction.before));
      assert(text.includes(correction.after));
    }
  }
  assert(
    !quick.assets.some(
      (asset) => asset.source_locator.part === 'media/image5.png',
    ),
  );
  assert(!text.includes('figure-005.png'));
  const figure = quick.assets.find((asset) => asset.src.endsWith('.svg'));
  const svg = await readFile(new URL(`public${figure.src}`, root), 'utf8');
  assert(svg.includes('CH6拡張(PPM)'));
  assert(svg.includes('CH7拡張(SBUS)'));
  assert.equal(
    figure.source_sha256,
    '8c76c76c0f12e0d6deb877686bce929eef53596b23fa9b918efc6836e2d4ce94',
  );
  for (const mutation of [
    'decision',
    'applicability',
    'source',
    'correction',
    'page',
    'unsafe',
  ]) {
    const candidate = globalThis.structuredClone(inventory);
    const manual = candidate.manuals.find((manual) => manual.id === quick.id);
    if (mutation === 'decision') manual.safety_review.decision = 'pending';
    if (mutation === 'applicability')
      manual.safety_review.applicability_established = false;
    if (mutation === 'source') manual.safety_review.authoritative_sources = [];
    if (mutation === 'correction') delete manual.technical_changes[0].evidence;
    if (mutation === 'page')
      manual.technical_changes[0].evidence.physical_pages = [999];
    if (mutation === 'unsafe') {
      const correction = manual.technical_changes[0];
      manual.sections[0].content_html = manual.sections[0].content_html.replace(
        correction.after,
        correction.before,
      );
      manual.sections[0].sha256 = hash(manual.sections[0].content_html);
    }
    assert.throws(
      () => verifyExistingJapaneseManuals(candidate, new URL('public/', root)),
      /authoritative (evidence|correction)/i,
    );
  }
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

test('a safety exclusion cannot become publication content without applicable authoritative evidence', async () => {
  const { verifyExistingJapaneseManuals } =
    await import('../../scripts/lib/existing-ja-manuals.mjs');
  const inventory = JSON.parse(
    await readFile(new URL('src/data/manuals/existing-ja.json', root), 'utf8'),
  );
  const candidate = globalThis.structuredClone(inventory);
  const blocked = candidate.manuals.find(
    (manual) => manual.publication_status === 'BLOCKED_SAFETY_REVIEW',
  );
  const published = candidate.manuals.find(
    (manual) => manual.publication_status === 'publication_copy',
  );
  blocked.publication_status = 'publication_copy';
  blocked.assets = published.assets;
  blocked.sections = published.sections;
  assert.throws(
    () => verifyExistingJapaneseManuals(candidate, new URL('public/', root)),
    /authoritative evidence/i,
  );
  delete blocked.blocker;
  delete blocked.safety_review;
  assert.throws(
    () => verifyExistingJapaneseManuals(candidate, new URL('public/', root)),
    /authoritative evidence/i,
  );
});
