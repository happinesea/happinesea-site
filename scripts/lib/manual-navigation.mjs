import GithubSlugger from 'github-slugger';

export function manualChapters(manual) {
  const chapters = [];
  for (const section of manual.semantic_sections) {
    if (section.depth === 2)
      chapters.push({
        title: section.title,
        route: `${manual.route}chapter-${String(chapters.length + 1).padStart(2, '0')}/`,
        sections: [],
      });
    if (chapters.length) chapters.at(-1).sections.push(section);
  }
  return chapters;
}

export function manualSidebar(manual) {
  return {
    label: manual.title,
    items: [
      { label: 'はじめに・目次', slug: manual.route.slice(1, -1) },
      ...manualChapters(manual).map((chapter) => ({
        label: chapter.title,
        slug: chapter.route.slice(1, -1),
      })),
    ],
    collapsed: true,
  };
}

export function manualAnchorTargets(manual) {
  const targets = {};
  const slugger = new GithubSlugger();
  for (const chapter of manualChapters(manual))
    for (const section of chapter.sections) {
      targets[section.id] =
        `${chapter.route}#${encodeURIComponent(section.id)}`;
      if (section.title)
        targets[slugger.slug(section.title)] = targets[section.id];
      for (const block of [
        ...(section.heading ? [section.heading] : []),
        ...section.blocks,
      ]) {
        if (block.start !== 0) continue;
        for (const id of [
          block.source_section,
          ...(manual.legacy_heading_anchors ?? [])
            .filter((entry) => entry.source_section === block.source_section)
            .map((entry) => entry.id),
        ])
          targets[id] = `${chapter.route}#${encodeURIComponent(id)}`;
      }
    }
  return targets;
}
