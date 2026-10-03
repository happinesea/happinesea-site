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

const publicationStatus = z.enum([
  'sample',
  'draft',
  'manufacturer_review',
  'published',
]);

const verificationStatus = z.enum([
  'verified',
  'review_required',
  'unverified',
]);

const insightTopic = z.enum([
  '航空・ドローン',
  'RC技術',
  '法規・制度',
  '業界動向',
  '技術解説',
  '導入事例',
]);

const insightKind = z.enum(['article', 'technical_explainer', 'case_study']);

const mediaSchema = z.object({
  src: z.string().nullable(),
  alt: z.string(),
  source_image_url: z.url().nullable(),
  source_page_url: z.url().nullable(),
  retrieved_at: z.coerce.date().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  image_status: z.enum([
    'verified',
    'unverified',
    'unavailable',
    'manufacturer_source_required',
  ]),
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
    content_status: publicationStatus,
    review_note: z.string().optional(),
    features: z.array(z.string()),
    feature_sections: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          points: z.array(z.string()),
          media: mediaSchema.optional(),
        }),
      )
      .default([]),
    package_contents: z.array(z.string()).default([]),
    videos: z
      .array(
        z.object({
          youtube_id: z.string(),
          title: z.string(),
          description: z.string(),
          source_url: z.url(),
        }),
      )
      .default([]),
    specifications: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
        status: verificationStatus,
      }),
    ),
    media: z.object({
      hero: mediaSchema,
      gallery: z.array(mediaSchema).default([]),
    }),
    manuals: z.array(
      z.object({
        title: z.string(),
        href: z.string(),
        status: publicationStatus,
      }),
    ),
    firmware: z.array(
      z.object({
        title: z.string(),
        version: z.string().optional(),
        url: z.url().optional(),
        status: verificationStatus,
        note: z.string().optional(),
      }),
    ),
    support: z.object({
      href: z.string(),
      faq_count: z.number().int().nonnegative(),
    }),
    relations: z.object({
      products: z.array(z.string()),
      receivers: z.array(z.string()),
      receiver_status: verificationStatus.optional(),
    }),
    official_url: z.url().nullable(),
    firmware_url: z.url().optional(),
    manual_url: z.url().optional(),
    last_checked_at: z.coerce.date().nullable(),
  }),
});

const insights = defineCollection({
  loader: glob({ base: './src/content/insights', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    topic: insightTopic,
    article_kind: insightKind,
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

const wordpressInsights = defineCollection({
  loader: file('src/data/wordpress-insights.json'),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    topic: insightTopic,
    article_kind: insightKind,
    published_at: z.coerce.date(),
    updated_at: z.coerce.date(),
    content_status: z.literal('published'),
    content_html: z.string(),
    canonical: z.url(),
    noindex: z.boolean(),
    hero: z
      .object({
        src: z.string(),
        alt: z.string(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        image_status: z.literal('verified'),
      })
      .nullable(),
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

const manualSections = defineCollection({
  loader: file('src/data/manual-sections.json'),
  schema: z.object({
    id: z.string(),
    product: z.string(),
    chapter: z.string(),
    section: z.string(),
    figures: z
      .array(
        z.object({
          src: z.string(),
          alt: z.string(),
          caption: z.string(),
          source_document_url: z.url(),
          source_page: z.number().int().positive(),
          source_image_name: z.string(),
          retrieved_at: z.coerce.date(),
        }),
      )
      .default([]),
    videos: z
      .array(
        z.object({
          youtube_id: z.string(),
          title: z.string(),
          description: z.string().optional(),
          source_url: z.url(),
        }),
      )
      .default([]),
  }),
});

export const collections = {
  products,
  insights,
  wordpressInsights,
  productUpdates,
  support,
  manualSections,
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        product: z.string(),
        slug: z.string(),
        status: publicationStatus,
        source: z.object({
          kind: z.enum([
            'publication_sample',
            'canonical_public',
            'publication_contract',
          ]),
          url: z.url().optional(),
        }),
      }),
    }),
  }),
};
