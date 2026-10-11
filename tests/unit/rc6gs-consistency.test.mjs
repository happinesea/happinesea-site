import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { verifyExistingJapaneseManuals } from '../../scripts/lib/existing-ja-manuals.mjs';

const root = new URL('../../', import.meta.url);
const inventory = JSON.parse(
  readFileSync(new URL('src/data/manuals/existing-ja.json', root)),
);

test('RC6GS full and quick are independently published with preserved evidence and unvalidated Knowledge', () => {
  for (const route of [
    '/manuals/rc6gs-v3/',
    '/manuals/rc6gs-v3-quick-reference/',
  ]) {
    const manual = inventory.manuals.find((entry) => entry.route === route);
    assert.equal(manual.publication_status, 'publication_copy');
    assert.equal(manual.knowledge_status, 'NOT_VALIDATED');
    assert(manual.safety_review.applicability_established);
    assert(manual.semantic_sections.length);
    const page = readFileSync(
      new URL(`src/content/docs${route}index.mdx`, root),
      'utf8',
    );
    assert(!/R7FG\s+V1\.[24]/.test(page));
    const other = route.includes('quick')
      ? '/manuals/rc6gs-v3/'
      : '/manuals/rc6gs-v3-quick-reference/';
    assert(page.includes(other));
  }
});

test('technical drift fails closed even with a recomputed publication hash', () => {
  for (const route of [
    '/manuals/rc6gs-v3/',
    '/manuals/rc6gs-v3-quick-reference/',
  ]) {
    for (const topic of [
      '給電',
      'バインド',
      'テレメトリー',
      'PPM/SBUS',
      'ジャイロフェーズ',
      'LED',
      '電源投入',
      'フェイルセーフ',
    ]) {
      const candidate = globalThis.structuredClone(inventory);
      const manual = candidate.manuals.find((entry) => entry.route === route);
      const section = manual.sections[0];
      section.content_html += `<p>${topic}：未レビューの操作</p>`;
      section.sha256 = createHash('sha256')
        .update(section.content_html)
        .digest('hex');
      const last = manual.semantic_sections
        .flatMap((entry) => entry.blocks)
        .filter((block) => block.source_section === section.id)
        .at(-1);
      last.end = section.content_html.length;
      assert.throws(
        () =>
          verifyExistingJapaneseManuals(candidate, new URL('public/', root)),
        /source range|Unreviewed Japanese manual change/,
      );
    }
  }
});

test('revision provenance and original figures survive public name normalization', () => {
  for (const manual of inventory.manuals.filter((entry) =>
    entry.route.startsWith('/manuals/rc6gs-v3'),
  )) {
    assert.equal(manual.revision_provenance.receiver_type, 'R7FG');
    assert.match(manual.revision_provenance.source_revision, /^V1\.[24]$/);
    assert.match(manual.revision_provenance.source_sha256, /^[a-f0-9]{64}$/);
    assert(
      !/R7FG\s*V1\.[24]/.test(
        manual.sections.map((section) => section.content_html).join('\n'),
      ),
    );
  }
  const full = inventory.manuals.find(
    (entry) => entry.route === '/manuals/rc6gs-v3/',
  );
  assert.equal(full.sections.length, 46);
  assert.equal(full.assets.length, 62);
  assert(full.assets.every((asset) => asset.source_locator));
});
