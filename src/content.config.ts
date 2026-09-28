import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

const productCategory = z.enum([
  '送信機',
  '受信機',
  'フライトコントローラー',
  'GPS・RTK・センサー',
  '機体',
  '電源・ESC',
  'モジュール・アクセサリー',
]);

const mediaSchema = z.object({
  src: z.string().nullable(),
  alt: z.string(),
  source_image_url: z.url().nullable(),
  source_page_url: z.url().nullable(),
  retrieved_at: z.coerce.date().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  image_status: z.enum(['verified', 'unverified', 'unavailable']),
});

const products = defineCollection({
  loader: file('src/data/products.json'),
  schema: z.object({
    id: z.string(),
    manufacturer: z.string(),
    model: z.string(),
    slug: z.string(),
    category: productCategory,
    title: z.string(),
    description: z.string(),
    content_status: z.enum(['sample', 'draft', 'published']),
    features: z.array(z.string()),
    specifications: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
        status: z.enum(['verified', 'unverified']),
      }),
    ),
    media: z.object({ hero: mediaSchema }),
    manuals: z.array(
      z.object({
        title: z.string(),
        href: z.string(),
        status: z.enum(['sample', 'draft', 'published']),
      }),
    ),
    firmware: z.array(
      z.object({
        title: z.string(),
        version: z.string().optional(),
        url: z.url().optional(),
        status: z.enum(['verified', 'unverified']),
      }),
    ),
    support: z.object({
      href: z.string(),
      faq_count: z.number().int().nonnegative(),
    }),
    relations: z.object({
      products: z.array(z.string()),
      receivers: z.array(z.string()),
    }),
    official_url: z.url().nullable(),
    last_checked_at: z.coerce.date().nullable(),
  }),
});

const insights = defineCollection({
  loader: glob({ base: './src/content/insights', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    topic: z.enum([
      '航空・ドローン',
      'RC技術',
      '法規・制度',
      '業界動向',
      '技術解説',
      '導入事例',
    ]),
    article_kind: z.enum(['article', 'technical_explainer', 'case_study']),
    published_at: z.coerce.date(),
    updated_at: z.coerce.date(),
    hero: z.object({
      src: z.string().nullable(),
      alt: z.string(),
      image_status: z.enum(['verified', 'unverified', 'unavailable']),
    }),
    related_products: z.array(z.string()),
    related_manuals: z.array(z.string()),
    related_articles: z.array(z.string()),
    content_status: z.enum(['sample', 'draft', 'published']),
  }),
});

const productUpdates = defineCollection({
  loader: file('src/data/product-updates.json'),
  schema: z.object({
    id: z.string(),
    manufacturer: z.string(),
    product: z.string(),
    update_type: z.enum([
      'new_product',
      'firmware',
      'manual_update',
      'manufacturer_notice',
    ]),
    title: z.string(),
    published_at: z.coerce.date(),
    source_url: z.url(),
  }),
});

const support = defineCollection({
  loader: file('src/data/support.json'),
  schema: z.object({
    id: z.string(),
    product: z.string(),
    title: z.string(),
    description: z.string(),
    status: z.enum(['sample', 'draft', 'published']),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })),
    line_account: z.string(),
  }),
});

export const collections = {
  products,
  insights,
  productUpdates,
  support,
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        product: z.string(),
        slug: z.string(),
        status: z.enum(['sample', 'draft', 'published']),
        source: z.object({
          kind: z.enum(['publication_sample', 'canonical_public']),
          url: z.url().optional(),
        }),
      }),
    }),
  }),
};
