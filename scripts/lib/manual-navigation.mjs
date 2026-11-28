import { isInitialManualRelease } from '../../src/lib/manual-release.mjs';
import catalogue from '../../src/data/product-catalogue.json' with { type: 'json' };
import { categoryIds } from '../../src/lib/radiolink-categories.mjs';
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

export function catalogueManualSidebar({
  generated,
  existing,
  includePreview,
  legacy,
}) {
  const products = new Map(catalogue.map((product) => [product.slug, product]));
  const groups = new Map(
    Object.keys(categoryIds).map((category) => [category, []]),
  );
  const routes = new Set();
  function add(productSlug, route, item) {
    if (routes.has(route)) throw new Error(`Duplicate manual route: ${route}`);
    const product = products.get(productSlug);
    if (!product)
      throw new Error(`Manual missing catalogue product: ${productSlug}`);
    routes.add(route);
    groups.get(product.category).push(item);
  }
  for (const entry of legacy) {
    const route = entry.items[0].slug;
    const slug = route.split('/')[1];
    add(slug === 'rc4gs-v2' ? 'rc4gs-v3' : slug, route, {
      ...entry,
      collapsed: true,
    });
  }
  for (const entry of existing) {
    if (entry.publication_status !== 'publication_copy') continue;
    // The catalogue uses the current model slug for a manual family.
    const slug =
      { rc4gs: 'rc4gs-v3', rc6gs: 'rc6gs-v3', t8fb: 't8fb-bt' }[
        entry.product
      ] ?? entry.product;
    add(slug, entry.route.slice(1, -1), manualSidebar(entry));
  }
  for (const entry of generated) {
    if (
      entry.publication_status !== 'PUBLISHED' &&
      !includePreview &&
      !isInitialManualRelease(entry)
    )
      continue;
    // RTC8 has a draft detail route but is outside the official product catalogue.
    if (entry.product_id === 'rtc8' && !products.has('rtc8')) continue;
    const slug = entry.route.slice(1, -1);
    const label =
      entry.source.document_scope === 'QUICK_START_GUIDE_NOT_FULL_MANUAL'
        ? `${entry.model} クイックガイド`
        : entry.source.document_id === 'twc_typec_trainer_cable_official_html'
          ? `${entry.model} 公式Web手順`
          : entry.model;
    const productSlug = entry.product_route.split('/')[2];
    const scopeLabel =
      entry.product_id !== productSlug ? `${label}（現行英語版）` : label;
    add(productSlug, slug, { label: scopeLabel, slug });
  }
  return [...groups]
    .filter(([, items]) => items.length)
    .map(([label, items]) => ({
      label,
      items,
      collapsed: true,
    }));
}
