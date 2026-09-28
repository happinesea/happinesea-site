export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface ProductJsonLdInput {
  name: string;
  description: string;
  manufacturer: string;
  url: string;
  image?: string;
  model?: string;
}

export interface ArticleJsonLdInput {
  kind: 'Article' | 'TechArticle';
  headline: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  image?: string;
  author?: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  } as const;
}

export function buildProductJsonLd(input: ProductJsonLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    brand: { '@type': 'Brand', name: input.manufacturer },
    url: input.url,
    ...(input.model ? { model: input.model } : {}),
    ...(input.image ? { image: input.image } : {}),
  } as const;
}

export function buildArticleJsonLd(input: ArticleJsonLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': input.kind,
    headline: input.headline,
    description: input.description,
    url: input.url,
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    ...(input.image ? { image: input.image } : {}),
    ...(input.author
      ? { author: { '@type': 'Organization', name: input.author } }
      : {}),
  } as const;
}
