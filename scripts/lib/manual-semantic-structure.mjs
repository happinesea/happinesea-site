import assert from 'node:assert/strict';

export const pageHeading =
  /原資料.*ページ|[（(]\s*\d+\s*ページ\s*[）)]\s*$|^\s*ページ\s*\d+\s*$/;

export function headingText(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function verifySemanticStructure(manual) {
  assert(
    manual.semantic_sections?.length,
    `Missing semantic structure: ${manual.id}`,
  );
  const cursor = new Map(manual.sections.map((segment) => [segment.id, 0]));
  const ids = new Set();
  const sourceOrder = manual.sections.map((segment) => segment.id);
  let previousSource = 0;
  for (const section of manual.semantic_sections) {
    assert(!ids.has(section.id), `Duplicate semantic anchor: ${section.id}`);
    ids.add(section.id);
    assert(
      !pageHeading.test(section.title ?? ''),
      `Page-derived semantic heading: ${section.id}`,
    );
    if (section.heading) {
      assert(
        [2, 3, 4, 5, 6].includes(section.depth),
        'Invalid semantic heading depth',
      );
      const segment = manual.sections.find(
        (entry) => entry.id === section.heading.source_section,
      );
      assert(
        segment &&
          headingText(
            segment.content_html.slice(
              section.heading.start,
              section.heading.end,
            ),
          ) === section.title,
        `Semantic title differs from source: ${section.id}`,
      );
    } else assert(section.title === null, 'Unlocated semantic heading');
    for (const block of [
      ...(section.heading ? [section.heading] : []),
      ...section.blocks,
    ]) {
      const segment = manual.sections.find(
        (entry) => entry.id === block.source_section,
      );
      assert(
        segment &&
          Number.isInteger(block.start) &&
          Number.isInteger(block.end) &&
          block.start === cursor.get(segment.id) &&
          block.end > block.start &&
          block.end <= segment.content_html.length,
        `Missing/overlapping source range: ${manual.id}`,
      );
      const order = sourceOrder.indexOf(segment.id);
      assert(order >= previousSource, 'Semantic source range reordered');
      previousSource = order;
      assert(
        !pageHeading.test(
          headingText(
            [
              ...segment.content_html
                .slice(block.start, block.end)
                .matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/g),
            ]
              .map((match) => match[1])
              .join(' '),
          ),
        ),
        'Page-derived source heading',
      );
      cursor.set(segment.id, block.end);
      assert(
        segment.source_locator.file &&
          manual.sources.some(
            (source) =>
              source.path === segment.source_locator.file &&
              /^[a-f0-9]{64}$/.test(source.sha256),
          ),
        'Semantic source hash/locator missing',
      );
    }
  }
  for (const segment of manual.sections)
    assert(
      cursor.get(segment.id) === segment.content_html.length,
      `Uncovered semantic source range: ${segment.id}`,
    );
}

export function renderSemanticSection(manual, id) {
  const section = manual.semantic_sections.find((entry) => entry.id === id);
  if (!section) throw new Error(`Unknown semantic manual section: ${id}`);
  return section.blocks
    .map((block) => {
      const source = manual.sections.find(
        (entry) => entry.id === block.source_section,
      );
      const alias = block.start === 0 ? sourceAnchors(manual, source.id) : '';
      return (
        alias +
        source.content_html
          .slice(block.start, block.end)
          .replace(/<(\/?)(?:h[1-6])\b/g, '<$1p')
          .replace(
            /<figcaption>図版・配置の原資料（\d+ページ）<\/figcaption>/g,
            '<figcaption>図版</figcaption>',
          )
          .replace(/(alt="[^"]*) 原資料の\d+ページ"/g, '$1 図版"')
      );
    })
    .join('\n');
}

function sourceAnchors(manual, sourceId) {
  return [
    sourceId,
    ...(manual.legacy_heading_anchors ?? [])
      .filter((anchor) => anchor.source_section === sourceId)
      .map((anchor) => anchor.id),
  ]
    .map((id) => `<span id="${id}"></span>`)
    .join('');
}

export function semanticMarkdown(
  manual,
  sections = manual.semantic_sections,
  firstHeading = true,
) {
  return sections
    .map((section, index) => {
      const heading = section.heading;
      const alias =
        heading?.start === 0
          ? `${sourceAnchors(manual, heading.source_section)}\n\n`
          : '';
      const title =
        section.title === null
          ? ''
          : `${alias}<span id="${section.id}"></span>\n\n${index === 0 && !firstHeading ? '' : `${'#'.repeat(section.depth)} ${section.title.replace(/([*_[\\])/g, '\\$1')}\n\n`}`;
      return `${title}<LegacyJapaneseBody manual="${manual.id}" section="${section.id}" />`;
    })
    .join('\n\n');
}

// Markdown typography must not rewrite reviewed source labels or display names.
export function semanticHeadingPunctuation(manuals) {
  return {
    name: 'manual-source-heading-punctuation',
    element: {
      filter: ['h2', 'h3', 'h4', 'h5', 'h6'],
      visit(node, ctx) {
        const manual = manuals.find(
          (entry) =>
            entry.route.slice(1, -1) === ctx.data.astro?.frontmatter.slug ||
            ctx.data.astro?.frontmatter.slug?.startsWith(entry.route.slice(1)),
        );
        if (!manual?.semantic_sections) return;
        const text = ctx.textContent(node);
        const title = manual.semantic_sections.find(
          (section) =>
            section.title?.replace(/["“”]/g, '') === text.replace(/["“”]/g, ''),
        )?.title;
        if (title)
          return {
            type: 'element',
            tagName: node.tagName,
            properties: node.properties,
            children: [{ type: 'text', value: title }],
          };
      },
    },
  };
}
