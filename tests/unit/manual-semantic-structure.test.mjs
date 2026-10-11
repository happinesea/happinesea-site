import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { verifyExistingJapaneseManuals } from '../../scripts/lib/existing-ja-manuals.mjs';
import {
  headingText,
  renderSemanticSection,
  semanticMarkdown,
  pageHeading,
  verifySemanticStructure,
  semanticHeadingPunctuation,
} from '../../scripts/lib/manual-semantic-structure.mjs';
import { createHash } from 'node:crypto';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';

const root = new URL('../../', import.meta.url);
const inventory = JSON.parse(
  readFileSync(new URL('src/data/manuals/existing-ja.json', root)),
);

test('source pages are evidence segments, never the semantic section hierarchy', () => {
  const manual = inventory.manuals.find((entry) => entry.product === 'rc8x');
  assert(manual.semantic_sections?.length, 'reviewed semantic outline missing');
  const receiver = manual.semantic_sections.find(
    (section) => section.title === 'R8FG 受信機',
  );
  assert(receiver);
  assert(
    !manual.semantic_sections.some((section) =>
      /原資料|[（(]\d+ページ[）)]/.test(section.title ?? ''),
    ),
  );
  const all = manual.semantic_sections.flatMap((section) => section.blocks);
  assert(all.some((block) => block.source_section === 'section-009'));
  assert(
    manual.sections.find((section) => section.id === 'section-009')
      .source_locator.page === 9,
  );
});

test('heading checks reject physical-page containers but allow page references in prose', () => {
  for (const title of [
    '原資料（9ページ）',
    '原資料 10ページ',
    'RC8X（1ページ）',
    '取扱説明書(12ページ)',
    'ページ 9',
  ])
    assert(pageHeading.test(title));
  assert(!pageHeading.test('設定方法（詳細は9ページを参照）'));
  const html = '<p>詳細は原資料の9ページを参照してください。</p>';
  const manual = {
    id: 'prose',
    sources: [{ path: 'manual.pdf', sha256: 'a'.repeat(64) }],
    sections: [
      {
        id: 'source-1',
        content_html: html,
        source_locator: { file: 'manual.pdf', page: 9 },
      },
    ],
    semantic_sections: [
      {
        id: 'intro',
        title: null,
        blocks: [{ source_section: 'source-1', start: 0, end: html.length }],
      },
    ],
  };
  verifySemanticStructure(manual);
  assert(renderSemanticSection(manual, 'intro').includes(html));
  manual.sections[0].content_html = '<h3>原資料（9ページ）</h3>';
  manual.semantic_sections[0].blocks[0].end =
    manual.sections[0].content_html.length;
  assert.throws(
    () => verifySemanticStructure(manual),
    /Page-derived source heading/,
  );
});

test('publication gate rejects page placeholders and lost source ranges', () => {
  for (const mutation of ['title', 'coverage']) {
    const candidate = globalThis.structuredClone(inventory);
    const manual = candidate.manuals.find((entry) => entry.product === 'rc8x');
    assert(
      manual.semantic_sections?.length,
      'reviewed semantic outline missing',
    );
    if (mutation === 'title')
      manual.semantic_sections[1].title = '原資料（9ページ）';
    if (mutation === 'coverage') manual.semantic_sections.at(-1).blocks.pop();
    assert.throws(
      () => verifyExistingJapaneseManuals(candidate, new URL('public/', root)),
      /semantic|source range/i,
    );
  }
});

test('all six semantic outlines preserve every original reading segment, source locator, table, figure and anchor', () => {
  const baseline = JSON.parse(
    readFileSync(new URL('tests/fixtures/manual-semantic-baseline.json', root)),
  );
  const rc6gsReview = JSON.parse(
    readFileSync(new URL('tests/fixtures/rc6gs-publication-review.json', root)),
  );
  for (const manual of inventory.manuals) {
    const previous = baseline.manuals.find((entry) => entry.id === manual.id);
    for (const key of [
      'sections',
      'sources',
      'assets',
      'technical_changes',
      'safety_review',
      'publication_status',
      'knowledge_status',
    ])
      assert.equal(
        createHash('sha256')
          .update(JSON.stringify(manual[key] ?? null))
          .digest('hex'),
        rc6gsReview[manual.id]?.[key] ?? previous.hashes[key],
        `${manual.id} changed ${key}`,
      );
    if (manual.publication_status !== 'publication_copy') continue;
    verifyExistingJapaneseManuals(inventory, new URL('public/', root));
    const original = manual.sections
      .map((source) => source.content_html)
      .join('\n');
    const rendered = manual.semantic_sections
      .map(
        (section) =>
          (section.heading
            ? `<h${section.depth} id="${section.id}">${section.title}</h${section.depth}>`
            : '') + renderSemanticSection(manual, section.id),
      )
      .join('\n');
    for (const id of previous.compatibility_anchors ?? [])
      assert(
        rendered.includes(`id="${id}"`) ||
          semanticMarkdown(manual).includes(`id="${id}"`),
        `${manual.id} lost published heading anchor ${id}`,
      );
    const normalize = (html) =>
      headingText(
        html.replace(
          /<figcaption>(?:図版・配置の原資料（\d+ページ）|図版)<\/figcaption>/g,
          '',
        ),
      ).replace(/\s/g, '');
    assert.equal(
      normalize(rendered),
      normalize(original),
      `${manual.id} content loss/reordering`,
    );
    for (const pattern of [/<table\b/g, /<figure\b/g, /<img\b/g])
      assert.equal(
        [...rendered.matchAll(pattern)].length,
        [...original.matchAll(pattern)].length,
      );
    for (const match of original.matchAll(/id="([^"]+)"/g))
      assert(rendered.includes(`id="${match[1]}"`));
    const mdx = readFileSync(
      new URL(`src/content/docs${manual.route}index.mdx`, root),
      'utf8',
    );
    assert(
      mdx
        .replace(/\s/g, '')
        .includes(semanticMarkdown(manual).replace(/\s/g, '')),
      'MDX is stale relative to reviewed semantic outline',
    );
    for (const match of mdx.matchAll(/^#{1,6} (.+)$/gm))
      assert(!pageHeading.test(match[1]));
  }
});

test('actual Markdown processor retains exact reviewed punctuation and leaves other pages unchanged', async () => {
  const processor = await createSatteriMarkdownProcessor({
    syntaxHighlight: false,
    hastPlugins: [semanticHeadingPunctuation(inventory.manuals)],
  });
  const input = '### 2.1 "LANGUAGE"言語選択';
  const reviewed = await processor.render(input, {
    frontmatter: { slug: 'manuals/rc4gs-v3' },
  });
  assert.equal(reviewed.metadata.headings[0].text, '2.1 "LANGUAGE"言語選択');
  assert(reviewed.code.includes('2.1 "LANGUAGE"言語選択'));
  const other = await processor.render(input, {
    frontmatter: { slug: 'manuals/rc8x' },
  });
  assert.equal(other.metadata.headings[0].text, '2.1 “LANGUAGE”言語選択');
});
