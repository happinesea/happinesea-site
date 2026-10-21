import { z } from 'astro/zod';
import { existsSync } from 'node:fs';
import { readFile, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { markdownToHtml } from 'satteri';
import sanitizeHtml from 'sanitize-html';
import { metadataText } from './wordpress-publication.mjs';

import catalogue from '../../src/data/product-catalogue.json' with { type: 'json' };
const productIds = new Set(catalogue.map((product) => product.id));
const unique = (values) => [...new Set(values)];
// Pages CMS may save YAML timestamps without quotes; Astro then supplies a Date.
const articleDate = z.union([
  z.date(),
  z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
]);

const articleImage = z
  .string()
  .regex(
    /^\/images\/articles\/(?:[a-z0-9_-][a-z0-9._-]*\/)*[a-z0-9_-][a-z0-9._-]*\.(?:png|jpe?g|webp|gif)$/i,
  );
export const cmsArticleSchema = z
  .looseObject({
    content_origin: z.literal('pages-cms'),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().trim().min(1),
    description: z
      .string()
      .trim()
      .nullish()
      .transform((value) => value ?? ''),
    topic: z.enum([
      '航空・ドローン',
      'RC技術',
      '法規・制度',
      '業界動向',
      '技術解説',
      '導入事例',
    ]),
    tags: z.array(z.string().trim().min(1)).default([]).transform(unique),
    hero: z.object({ src: articleImage, alt: z.string().trim().min(1) }),
    gallery: z
      .array(z.object({ src: articleImage, alt: z.string().trim().min(1) }))
      .default([]),
    content_status: z.enum(['draft', 'published']).default('draft'),
    published_at: articleDate,
    updated_at: articleDate.optional(),
    related_products: z
      .array(
        z
          .string()
          .refine((id) => productIds.has(id), 'Unknown Radiolink product ID'),
      )
      .default([])
      .transform(unique),
  })
  .transform((data) => ({
    ...data,
    updated_at: data.updated_at ?? data.published_at,
    article_kind: /** @type {'article'} */ ('article'),
    hero: {
      ...data.hero,
      image_status: /** @type {'verified'} */ ('verified'),
    },
  }));

export function publishedCmsArticles(entries) {
  return entries
    .filter((entry) => {
      if (entry.data.content_status !== 'published') return false;
      if (entry.id !== entry.data.slug)
        throw new Error(`CMS article filename must match slug: ${entry.id}`);
      // Astro moves this module into prerender chunks; source assets stay at the repo root.
      if (!existsSync(join('public', entry.data.hero.src.slice(1))))
        throw new Error(`Missing CMS article image: ${entry.data.hero.src}`);
      for (const image of entry.data.gallery ?? [])
        if (!existsSync(join('public', image.src.slice(1))))
          throw new Error(`Missing CMS gallery image: ${image.src}`);
      return true;
    })
    .map((entry) => ({
      ...entry,
      data: {
        ...entry.data,
        description:
          entry.data.description ||
          articleExcerpt(entry.body) ||
          entry.data.title,
      },
    }));
}

export function articleExcerpt(body = '') {
  const html = markdownToHtml(body).html;
  const text = metadataText(
    html.replaceAll(/<\/(?:p|h[1-6]|li|blockquote|pre)>/g, '$& '),
  );
  return Array.from(text).slice(0, 160).join('');
}

export function renderCmsArticle(body = '', base = '/') {
  const html = markdownToHtml(body, {
    hastPlugins: [cmsArticleImages(base)],
    data: { astro: { frontmatter: { content_origin: 'pages-cms' } } },
  }).html;
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title'],
      code: ['class'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      img(tagName, attributes) {
        // Raw HTML images bypass Markdown HAST visits; enforce the same boundary here.
        const prefix = base === '/' ? '' : base.replace(/\/$/, '');
        const original =
          prefix && attributes.src?.startsWith(prefix + '/')
            ? attributes.src.slice(prefix.length)
            : attributes.src;
        const src = articleImage.parse(original);
        if (!existsSync(join('public', src.slice(1))))
          throw new Error(`Missing CMS body image: ${src}`);
        if (!attributes.alt?.trim())
          throw new Error('CMS body image needs alt text');
        return { tagName, attribs: { ...attributes, src: prefix + src } };
      },
    },
  });
}

export function cmsArticleImages(base) {
  return {
    name: 'cms-article-images',
    element: {
      filter: ['img'],
      visit(node, ctx) {
        if (ctx.data.astro?.frontmatter.content_origin !== 'pages-cms') return;
        const src = articleImage.parse(node.properties.src);
        if (!existsSync(join('public', src.slice(1))))
          throw new Error(`Missing CMS body image: ${src}`);
        if (!node.properties.alt?.trim())
          throw new Error('CMS body image needs alt text');
        return {
          ...node,
          properties: {
            ...node.properties,
            src: base === '/' ? src : base.replace(/\/$/, '') + src,
          },
        };
      },
    },
  };
}

// Only images referenced by generated HTML enter the artifact; draft-only uploads stay in Git.
export async function finalizeCmsArticleImages(dir) {
  const folder = join(dir, 'images/articles');
  if (!existsSync(folder)) return;
  const used = new Set();
  for (const file of await readdir(dir, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!file.isFile() || !file.name.endsWith('.html')) continue;
    const html = await readFile(join(file.parentPath, file.name), 'utf8');
    for (const match of html.matchAll(
      /<img\b[^>]*\bsrc="[^"]*\/images\/articles\/([^"?#]+)"/g,
    ))
      used.add(decodeURIComponent(match[1]));
  }
  for (const file of await readdir(folder, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!file.isFile()) continue;
    const path = join(file.parentPath, file.name);
    const relative = path.slice(folder.length + 1).replaceAll('\\', '/');
    if (!used.has(relative)) await unlink(path);
  }
}
