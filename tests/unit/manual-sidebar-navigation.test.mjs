import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  manualSidebar,
  manualAnchorTargets,
} from '../../scripts/lib/manual-navigation.mjs';

const root = new URL('../../', import.meta.url);
const inventory = JSON.parse(
  readFileSync(new URL('src/data/manuals/existing-ja.json', root)),
);

test('each reviewed top-level topic has a chapter route with all its semantic blocks exactly once', () => {
  for (const manual of inventory.manuals.filter(
    (entry) => entry.publication_status === 'publication_copy',
  )) {
    const groups = [];
    for (const section of manual.semantic_sections) {
      if (section.depth === 2) groups.push([]);
      if (groups.length) groups.at(-1).push(section);
    }
    assert(groups.length > 1);
    const pages = groups.map((group, index) => {
      const path = `src/content/docs${manual.route}chapter-${String(index + 1).padStart(2, '0')}.mdx`;
      const mdx = readFileSync(new URL(path, root), 'utf8');
      for (const section of group) {
        assert(
          mdx.includes(`section="${section.id}"`),
          `${path}: lost block ${section.id}`,
        );
        assert(mdx.includes(section.title ?? ''), `${path}: lost heading`);
      }
      return mdx;
    });
    const intro = readFileSync(
      new URL(`src/content/docs${manual.route}index.mdx`, root),
      'utf8',
    );
    const all = [intro, ...pages].join('\n');
    for (const section of manual.semantic_sections)
      assert.equal(
        [...all.matchAll(new RegExp(`section="${section.id}"`, 'g'))].length,
        1,
        `${manual.id}: duplicated/lost body`,
      );
    for (const page of [intro, ...pages])
      for (const heading of page.matchAll(/^#{1,6} (.+)$/gm))
        assert(!/原資料.*ページ|[（(]\d+ページ[）)]/.test(heading[1]));
  }
});

test('sidebar uses reviewed topics, and old source/semantic anchors resolve to their chapter', () => {
  const manual = inventory.manuals.find(
    (entry) => entry.route === '/manuals/rc8x-quick-reference/',
  );
  const sidebar = manualSidebar(manual);
  assert.deepEqual(
    sidebar.items.map((item) => item.label),
    [
      'はじめに・目次',
      'ご注意',
      '付属品リスト',
      'スペック情報',
      'RC8X 送信機',
      'ボタンとスイッチの表記等の説明',
      'メニュー',
      '電源を入れる',
      'R8FG 受信機',
    ],
  );
  const targets = manualAnchorTargets(manual);
  assert.equal(
    targets['r8fg-受信機'],
    '/manuals/rc8x-quick-reference/chapter-08/#section-008-r8fg-%E5%8F%97%E4%BF%A1%E6%A9%9F',
  );
  assert.equal(
    targets['section-009'],
    '/manuals/rc8x-quick-reference/chapter-08/#section-009',
  );
  assert.equal(
    targets['section-014-topic-1'],
    '/manuals/rc8x-quick-reference/chapter-08/#section-014-topic-1',
  );
  for (const item of sidebar.items)
    assert(!/原資料|ページ|section-\d/.test(item.label));
});
