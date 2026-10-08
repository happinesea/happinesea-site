import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import sanitizeHtml from 'sanitize-html';
import { createHash } from 'node:crypto';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

const forbiddenMarkup = [
  [/_wp_link_placeholder/i, 'unresolved WordPress link placeholder'],
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

export function metadataText(value) {
  const stripped = htmlText(value);
  let text = '';
  // Read the parser's decoded text, not its HTML-escaped output. Astro escapes it at render time.
  sanitizeHtml(`<div>${stripped}</div>`, {
    allowedTags: ['div'],
    exclusiveFilter: (frame) => {
      text = frame.text;
      return false;
    },
  });
  return text.replaceAll(/\s+/g, ' ').trim();
}

export function stableReviewedHtml(html) {
  return html
    .replaceAll(/<[^>]+>/g, (tag) =>
      tag
        .replaceAll(
          /(\bdata-downloadurl=["'][^"']*[?&]refresh=)[^"'&]*/g,
          '$1WPDM_REFRESH',
        )
        .replaceAll(
          /\bclass=(["'])(.*?)\1/g,
          (_attribute, quote, value) =>
            `class=${quote}${value.replaceAll(/\bwp-block-gallery-\d+\b/g, 'wp-block-gallery-INSTANCE')}${quote}`,
        ),
    )
    .replaceAll(/<p>(?=<div class='w3eden'>)/g, '')
    .replaceAll(/\n<\/div><\/p>/g, '\n</div>');
}

export function reviewedArticleHtml(input, review) {
  let value = String(input ?? '');
  if (!review) return value;
  const stable = (html) =>
    review.stable_content_sha256 ? stableReviewedHtml(html) : html;
  if (
    createHash('sha256').update(stable(value)).digest('hex') !==
    (review.stable_content_sha256 ?? review.source_content_sha256)
  )
    throw new Error(`source review drift: ${review.source_content_sha256}`);
  value = stable(value);
  for (const { from, to } of review.replacements ?? []) {
    if (
      typeof from !== 'string' ||
      !from ||
      typeof to !== 'string' ||
      value.split(stable(from)).length !== 2
    )
      throw new Error('source replacement drift');
    value = value.replace(stable(from), () => to);
  }
  return value;
}

export function resolveInventoryDecision(post, readiness, decision) {
  if (!decision) return readiness;
  if (
    decision.id !== post.id ||
    decision.slug !== post.slug ||
    decision.source_url !== post.link
  )
    throw new Error('publication decision drift');
  reviewedArticleHtml(post.content?.rendered, decision);
  if (
    decision.decision === 'BLOCKED_WITH_EXPLICIT_REASON' &&
    decision.reason?.trim()
  )
    return {
      status: 'BLOCKED',
      reasons: [...readiness.reasons, decision.reason],
      decision: decision.decision,
    };
  if (
    !['READY_AND_MIGRATE', 'TRANSFORM_AND_MIGRATE'].includes(
      decision.decision,
    ) ||
    readiness.status !== 'READY'
  )
    throw new Error('publication decision preflight not ready');
  return { ...readiness, decision: decision.decision };
}

export function extractRemoteArticleImages(input) {
  const images = [];
  for (const match of String(input ?? '').matchAll(/<img\b[^>]*>/gi)) {
    const src = match[0].match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (!src || !/^(?:https?:)?\/\//i.test(src)) continue;
    const alt = match[0].match(/\balt=["']([^"']*)["']/i)?.[1] ?? '';
    images.push({ src, alt });
  }
  return images;
}

export function analyzePostMarkup(input) {
  const value = String(input ?? '');
  const iframes = [...value.matchAll(/<iframe\b[^>]*>/gi)].map(([tag]) => {
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? null;
    const host = (() => {
      try {
        return new URL(src?.startsWith('//') ? `https:${src}` : src).hostname;
      } catch {
        return null;
      }
    })();
    const classification = YOUTUBE_HOSTS.has(host)
      ? 'A'
      : host === 'rcm-fe.amazon-adsystem.com'
        ? 'C'
        : 'D';
    return { src, host, classification };
  });
  return {
    body_images: extractRemoteArticleImages(value),
    iframes,
    shortcodes: [...value.matchAll(/\[[a-z][\w-]*(?:\s[^\]]*)?\]/gi)].map(
      ([shortcode]) => shortcode,
    ),
    script_count: (value.match(/<script\b/gi) ?? []).length,
    unresolved_links: (value.match(/_wp_link_placeholder/gi) ?? []).length,
  };
}

export function classifyInventoryPost(
  { markup, featuredAlt, featuredImage = false },
  mapping,
) {
  const priority = {
    READY: 0,
    NEEDS_REVIEW: 1,
    NEEDS_TRANSFORM: 2,
    BLOCKED: 3,
  };
  const reasons = [];
  let status = 'READY';
  const flag = (nextStatus, reason) => {
    if (priority[nextStatus] > priority[status]) status = nextStatus;
    reasons.push(reason);
  };
  if (markup.iframes.some(({ classification }) => classification === 'D')) {
    flag('BLOCKED', 'unsupported iframe');
  }
  if (markup.shortcodes.length) {
    flag('BLOCKED', 'unsupported shortcode');
  }
  if (
    markup.unresolved_links ||
    markup.script_count ||
    markup.iframes.some(({ classification }) => classification === 'C')
  ) {
    flag(
      'NEEDS_TRANSFORM',
      markup.unresolved_links
        ? 'unresolved WordPress link placeholder'
        : 'legacy script or advertising embed',
    );
  }
  if (!mapping) {
    flag('NEEDS_REVIEW', 'content mapping not approved');
  }
  if (
    featuredImage &&
    !featuredAlt?.trim() &&
    !mapping?.featured_image_review?.alt?.trim() &&
    mapping?.featured_image_role !== 'decorative'
  ) {
    flag('NEEDS_REVIEW', 'featured image alt not reviewed');
  }
  if (
    markup.body_images.some(
      ({ src, alt }) =>
        !alt.trim() &&
        !mapping?.body_image_reviews
          ?.find(({ source_url }) => source_url === src)
          ?.alt?.trim(),
    )
  ) {
    flag('NEEDS_REVIEW', 'body image alt not reviewed');
  }
  return { status, reasons };
}

export function localizeArticleImages(input, assets = new Map(), reviews = []) {
  const value = String(input ?? '');
  for (const [tag] of value.matchAll(/<img\b[^>]*>/gi))
    if (!/\bsrc=["'][^"']+["']/i.test(tag))
      throw new Error('image source missing');
  for (const { src, alt } of extractRemoteArticleImages(value)) {
    const review = reviews.find(({ source_url }) => source_url === src);
    if (review && !assets.get(src)?.sha256)
      throw new Error(`image review drift: missing source hash for ${src}`);
    const reviewedAlt = reviewedFeaturedImageAlt(
      { source_url: src, alt_text: alt },
      review,
      assets.get(src)?.sha256,
    );
    if (!reviewedAlt.trim())
      throw new Error(`missing alt for body image: ${src}`);
    if (!assets.has(src)) throw new Error(`body image not localized: ${src}`);
  }
  return value.replaceAll(/<img\b[^>]*>/gi, (tag) => {
    const source = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    const asset = assets.get(source);
    if (!asset) return tag;
    let cleaned = tag
      .replace(/\bsrc=["'][^"']+["']/i, `src="${asset.src}"`)
      .replace(/\s(?:width|height|loading|decoding)=["'][^"']*["']/gi, '');
    const sourceAlt = tag.match(/\balt=["']([^"']*)["']/i)?.[1] ?? '';
    if (!sourceAlt.trim()) {
      const alt = reviewedFeaturedImageAlt(
        { source_url: source, alt_text: sourceAlt },
        reviews.find(({ source_url }) => source_url === source),
        asset.sha256,
      )
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;');
      cleaned = /\balt=["'][^"']*["']/i.test(cleaned)
        ? cleaned.replace(/\balt=["'][^"']*["']/i, `alt="${alt}"`)
        : cleaned.replace(/\s*\/?>(?=$)/, (ending) => ` alt="${alt}"${ending}`);
    }
    return cleaned.replace(/\s*\/?>(?=$)/, (ending) => {
      const close = ending.includes('/') ? ' />' : '>';
      return ` width="${asset.width}" height="${asset.height}" loading="lazy" decoding="async"${close}`;
    });
  });
}

function isoUtc(value, field) {
  if (!value) throw new Error(`missing ${field}`);
  const date = new Date(value.endsWith('Z') ? value : `${value}Z`);
  if (Number.isNaN(date.valueOf())) throw new Error(`invalid ${field}`);
  return date.toISOString();
}

export function sanitizeArticleHtml(
  input,
  imageAssets = new Map(),
  { preserveAnchors = false, imageReviews = [] } = {},
) {
  const value = localizeArticleImages(input, imageAssets, imageReviews);
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
      'sup',
      'sub',
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
      ...(preserveAnchors ? { '*': ['id'] } : {}),
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

export function reviewedFeaturedImageAlt(media, review, sha256) {
  if (!review) return media?.alt_text ?? '';
  if (
    !media ||
    media.source_url !== review.source_url ||
    typeof review.alt !== 'string' ||
    !review.alt.trim() ||
    !/^[a-f0-9]{64}$/.test(review.sha256) ||
    (sha256 !== undefined && sha256 !== review.sha256)
  )
    throw new Error('featured image review drift');
  return media.alt_text?.trim() ? media.alt_text : review.alt;
}

export function normalizePost(post, mapping, { bodyAssets = new Map() } = {}) {
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

  const title = metadataText(post.title?.rendered);
  if (!title) throw new Error(`missing title for post ${post.id}`);
  const excerpt = sanitizeArticleHtml(post.excerpt?.rendered);
  const content = sanitizeArticleHtml(
    reviewedArticleHtml(post.content?.rendered, mapping.content_review),
    bodyAssets,
    {
      imageReviews: mapping.body_image_reviews ?? [],
      preserveAnchors: Boolean(mapping.preserve_anchors),
    },
  );
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

  const sourceMedia = post._embedded?.['wp:featuredmedia']?.[0];
  const recovery = mapping.featured_image_recovery;
  if (
    recovery &&
    (!mapping.content_review ||
      !Number.isSafeInteger(recovery.media_id) ||
      recovery.media_id !== post.featured_media ||
      sourceMedia?.source_url ||
      recovery.source_url !== mapping.featured_image_review?.source_url)
  )
    throw new Error('featured recovery drift');
  const media = recovery
    ? {
        source_url: recovery.source_url,
        alt_text: '',
        media_details: { width: recovery.width, height: recovery.height },
      }
    : sourceMedia;
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
  if (
    media &&
    (!media.source_url ||
      !Number.isSafeInteger(width) ||
      !Number.isSafeInteger(height) ||
      width < 1 ||
      height < 1)
  ) {
    throw new Error(`invalid featured image for post ${post.id}`);
  }
  const featuredImageAlt = reviewedFeaturedImageAlt(
    media,
    mapping.featured_image_review,
  );
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

export function publicationPosts(posts, withdrawals) {
  const ids = new Set();
  for (const withdrawal of withdrawals) {
    const post = posts.find(({ id }) => id === withdrawal.id);
    if (
      !Number.isInteger(withdrawal.id) ||
      ids.has(withdrawal.id) ||
      !withdrawal.reason?.trim() ||
      Number.isNaN(Date.parse(withdrawal.approved_at)) ||
      !/^https:\/\/happinesea\.com\//.test(withdrawal.canonical) ||
      (post && post.link !== withdrawal.canonical)
    )
      throw new Error(`invalid withdrawal for article ${withdrawal.id}`);
    ids.add(withdrawal.id);
  }
  return posts.filter(({ id }) => !ids.has(id));
}

export function assertInventoryContinuity(current, previous, withdrawals) {
  const currentById = new Map(current.map((article) => [article.id, article]));
  const withdrawn = new Map(withdrawals.map((item) => [item.id, item]));
  for (const article of previous) {
    const next = currentById.get(article.id);
    if (!next && !withdrawn.has(article.id)) {
      throw new Error(`published article disappeared: ${article.id}`);
    }
    if (!next) {
      const withdrawal = withdrawn.get(article.id);
      if (
        withdrawal.canonical !== article.canonical ||
        !withdrawal.reason?.trim() ||
        Number.isNaN(Date.parse(withdrawal.approved_at))
      ) {
        throw new Error(`invalid withdrawal for article ${article.id}`);
      }
      continue;
    }
    if (next.slug !== article.slug)
      throw new Error(`inventory slug drift: ${article.id}`);
    if (next.canonical !== article.canonical)
      throw new Error(`inventory canonical drift: ${article.id}`);
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
  if (new Set(ids).size !== ids.length)
    throw new Error('duplicate requested post ids');
  if (ids.length > 10) {
    const posts = [];
    for (let index = 0; index < ids.length; index += 10)
      posts.push(
        ...(await fetchPublishedPosts(
          endpoint,
          ids.slice(index, index + 10),
          fetchImpl,
        )),
      );
    return posts;
  }
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
