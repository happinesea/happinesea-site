import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import sanitizeHtml from 'sanitize-html';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

const forbiddenMarkup = [
  [/<script\b/i, 'script'],
  [/<(?:object|embed)\b/i, 'object/embed'],
  [
    /\b(?:href|src)\s*=\s*["']?\s*(?:javascript|data):/i,
    'javascript:/data: URL',
  ],
  [/\[[a-z][\w-]*(?:\s[^\]]*)?\]/i, 'shortcode'],
];

export function htmlText(value) {
  return sanitizeHtml(value ?? '', { allowedTags: [], allowedAttributes: {} })
    .replaceAll(/\s+/g, ' ')
    .trim();
}

function isoUtc(value, field) {
  if (!value) throw new Error(`missing ${field}`);
  const date = new Date(value.endsWith('Z') ? value : `${value}Z`);
  if (Number.isNaN(date.valueOf())) throw new Error(`invalid ${field}`);
  return date.toISOString();
}

export function sanitizeArticleHtml(input) {
  const value = String(input ?? '');
  for (const [pattern, label] of forbiddenMarkup) {
    if (pattern.test(value)) throw new Error(`forbidden HTML: ${label}`);
  }

  for (const iframe of value.matchAll(/<iframe\b[^>]*>/gi)) {
    const match = iframe[0].match(/\bsrc=["']([^"']+)["']/i);
    if (!match) throw new Error('unsafe iframe without src');
    let url;
    try {
      url = new URL(match[1]);
    } catch {
      throw new Error('unsafe iframe URL');
    }
    if (
      url.protocol !== 'https:' ||
      !YOUTUBE_HOSTS.has(url.hostname.toLowerCase()) ||
      !url.pathname.startsWith('/embed/')
    ) {
      throw new Error(`unsafe iframe host: ${url.hostname}`);
    }
  }

  return sanitizeHtml(value, {
    allowedTags: [
      'p',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'blockquote',
      'strong',
      'em',
      'a',
      'img',
      'figure',
      'figcaption',
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'th',
      'td',
      'code',
      'pre',
      'br',
      'hr',
      'iframe',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading', 'decoding'],
      iframe: [
        'src',
        'title',
        'width',
        'height',
        'loading',
        'allow',
        'allowfullscreen',
        'referrerpolicy',
      ],
      th: ['scope', 'colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['https', 'mailto'],
    allowedIframeHostnames: [...YOUTUBE_HOSTS],
    transformTags: {
      a(tagName, attribs) {
        if (attribs.target === '_blank') {
          attribs.rel = 'noopener noreferrer';
        }
        return { tagName, attribs };
      },
    },
  }).trim();
}

export function normalizePost(post, mapping) {
  if (post?.status !== 'publish')
    throw new Error(`post ${post?.id ?? '?'} is not publish`);
  if (post.id !== mapping.id)
    throw new Error(`mapping id mismatch for post ${post.id}`);
  if (mapping.content_type !== 'insight')
    throw new Error('invalid content_type');
  if (mapping.canonical !== post.link)
    throw new Error(`canonical drift for post ${post.id}`);
  if (mapping.slug !== post.slug)
    throw new Error(`slug drift for post ${post.id}`);
  if (mapping.route !== `/insights/${mapping.slug}/`)
    throw new Error(`invalid route mapping for post ${post.id}`);

  const title = htmlText(post.title?.rendered);
  if (!title) throw new Error(`missing title for post ${post.id}`);
  const excerpt = sanitizeArticleHtml(post.excerpt?.rendered);
  const content = sanitizeArticleHtml(post.content?.rendered);
  if (!excerpt) throw new Error(`missing excerpt for post ${post.id}`);
  if (!content) throw new Error(`missing content for post ${post.id}`);

  const termGroups = post._embedded?.['wp:term'] ?? [];
  const terms = termGroups.flat();
  const category = terms
    .filter((term) => term.taxonomy === 'category')
    .map((term) => term.slug);
  const tags = terms
    .filter((term) => term.taxonomy === 'post_tag')
    .map((term) => term.slug);
  if (!category.length) throw new Error(`missing category for post ${post.id}`);

  const media = post._embedded?.['wp:featuredmedia']?.[0];
  const width = Number(media?.media_details?.width);
  const height = Number(media?.media_details?.height);
  const featuredImage = media
    ? {
        url: media.source_url,
        width,
        height,
        source_url: media.source_url,
      }
    : null;
  if (media && (!media.source_url || width < 1 || height < 1)) {
    throw new Error(`invalid featured image for post ${post.id}`);
  }
  const featuredImageAlt = media?.alt_text ?? '';
  if (
    media &&
    !featuredImageAlt &&
    mapping.featured_image_role !== 'decorative'
  ) {
    throw new Error(`missing content image alt for post ${post.id}`);
  }

  return {
    contract: {
      contract_version: '0.1',
      id: post.id,
      slug: mapping.slug,
      title,
      excerpt,
      content,
      published_at: isoUtc(post.date_gmt, 'published_at'),
      modified_at: isoUtc(post.modified_gmt, 'modified_at'),
      category: [...new Set(category)],
      tags: [...new Set(tags)],
      featured_image: featuredImage,
      featured_image_alt: featuredImageAlt,
      canonical: mapping.canonical,
      content_type: mapping.content_type,
      status: 'publish',
      source_url: post.link,
      author: post._embedded?.author?.[0]?.name || 'happinesea',
      language: 'ja-JP',
      noindex: Boolean(mapping.noindex),
    },
    route: mapping.route,
    topic: mapping.topic,
    article_kind: mapping.article_kind,
  };
}

export function assertCollection(articles) {
  const seen = {
    id: new Set(),
    slug: new Set(),
    canonical: new Set(),
    route: new Set(),
  };
  for (const article of articles) {
    for (const [key, value] of [
      ['id', article.contract.id],
      ['slug', article.contract.slug],
      ['canonical', article.contract.canonical],
      ['route', article.route],
    ]) {
      if (seen[key].has(value)) throw new Error(`duplicate ${key}: ${value}`);
      seen[key].add(value);
    }
  }
}

export function validateContracts(articles, schema) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  for (const article of articles) {
    if (!validate(article.contract)) {
      throw new Error(
        `contract validation failed for ${article.contract.id}: ${ajv.errorsText(validate.errors)}`,
      );
    }
  }
}

export function assertManifestContinuity(articles, mappings, withdrawals) {
  const present = new Set(articles.map(({ contract }) => contract.id));
  const withdrawn = new Map(withdrawals.map((entry) => [entry.id, entry]));
  for (const mapping of mappings) {
    const withdrawal = withdrawn.get(mapping.id);
    if (withdrawal) {
      if (
        withdrawal.canonical !== mapping.canonical ||
        !withdrawal.reason ||
        Number.isNaN(Date.parse(withdrawal.approved_at))
      ) {
        throw new Error(`invalid withdrawal for article ${mapping.id}`);
      }
    }
    if (!present.has(mapping.id) && !withdrawal) {
      throw new Error(`missing approved article ${mapping.id}`);
    }
  }
}

export async function fetchJson(url, fetchImpl = fetch) {
  const response = await fetchWithRetry(
    url,
    {
      headers: {
        accept: 'application/json',
        'user-agent': 'happinesea-build/0.1',
      },
    },
    fetchImpl,
  );
  return response.json();
}

export async function fetchWithRetry(url, options, fetchImpl = fetch) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(url, {
        ...options,
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      lastError = error;
    }
    if (response) {
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status} for ${url}`);
      if (response.status < 500) throw lastError;
    }
    if (attempt < 3)
      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
  }
  throw lastError;
}

export async function fetchPublishedPosts(endpoint, ids, fetchImpl = fetch) {
  const url = new URL(endpoint);
  url.searchParams.set('status', 'publish');
  url.searchParams.set('include', ids.join(','));
  url.searchParams.set('per_page', String(ids.length));
  url.searchParams.set('_embed', '1');
  const response = await fetchWithRetry(
    url,
    {
      headers: {
        accept: 'application/json',
        'user-agent': 'happinesea-build/0.1',
      },
    },
    fetchImpl,
  );
  const total = Number(response.headers.get('x-wp-total'));
  const pages = Number(response.headers.get('x-wp-totalpages'));
  const posts = await response.json();
  if (total !== ids.length || pages !== 1 || posts.length !== ids.length) {
    throw new Error(
      `expected ${ids.length} published posts, received total=${total}, pages=${pages}, body=${posts.length}`,
    );
  }
  const received = new Set(posts.map(({ id }) => id));
  for (const id of ids) {
    if (!received.has(id)) throw new Error(`missing published post ${id}`);
  }
  return posts;
}

export async function fetchImage(url, fetchImpl = fetch) {
  const response = await fetchWithRetry(
    url,
    { headers: { accept: 'image/*', 'user-agent': 'happinesea-build/0.1' } },
    fetchImpl,
  );
  const contentType = response.headers
    .get('content-type')
    ?.split(';')[0]
    .toLowerCase();
  if (!contentType?.startsWith('image/')) {
    throw new Error(
      `invalid image content type ${contentType ?? '(missing)'}: ${url}`,
    );
  }
  return { contentType, bytes: Buffer.from(await response.arrayBuffer()) };
}

export { YOUTUBE_HOSTS };
