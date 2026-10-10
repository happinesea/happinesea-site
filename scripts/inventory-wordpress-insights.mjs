import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { format } from 'prettier';

import {
  analyzePostMarkup,
  assertInventoryContinuity,
  classifyInventoryPost,
  fetchJson,
  fetchWithRetry,
  htmlText,
  publicationPosts,
  publicationSourceAssetUrl,
  reviewedArticleHtml,
  resolveInventoryDecision,
} from './lib/wordpress-publication.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(
  await readFile(
    join(root, 'src/data/wordpress-insight-manifest.json'),
    'utf8',
  ),
);
const outputPath = join(root, 'src/data/wordpress-insight-inventory.json');
const endpoint = process.env.WORDPRESS_API_URL ?? manifest.source_endpoint;
const decisions = JSON.parse(
  await readFile(
    join(root, 'src/data/wordpress-phase6-decisions.json'),
    'utf8',
  ),
);

async function fetchPaged(path, parameters = {}) {
  const values = [];
  let total;
  let pages;
  for (let page = 1; page === 1 || page <= pages; page += 1) {
    const url = new URL(path, endpoint);
    for (const [key, value] of Object.entries({
      per_page: '10',
      page: String(page),
      ...parameters,
    })) {
      url.searchParams.set(key, value);
    }
    const response = await fetchWithRetry(url, {
      headers: { accept: 'application/json' },
    });
    const count = Number(response.headers.get('x-wp-total'));
    const pageCount = Number(response.headers.get('x-wp-totalpages'));
    if (
      !response.headers.has('x-wp-total') ||
      !response.headers.has('x-wp-totalpages') ||
      !Number.isInteger(count) ||
      !Number.isInteger(pageCount) ||
      count < 0 ||
      pageCount < 0
    )
      throw new Error('invalid WordPress pagination headers');
    if (page === 1) {
      total = count;
      pages = pageCount;
    }
    if (count !== total || pageCount !== pages)
      throw new Error('WordPress pagination changed during inventory');
    const items = await response.json();
    if (!Array.isArray(items))
      throw new Error('invalid WordPress paginated response');
    values.push(...items);
  }
  if (values.length !== total)
    throw new Error(
      `WordPress pagination count mismatch: ${values.length} / ${total}`,
    );
  return values;
}

const posts = await fetchPaged(endpoint, {
  status: 'publish',
  _fields:
    'id,slug,link,date_gmt,modified_gmt,status,title,featured_media,categories,tags,content',
});
const activePosts = publicationPosts(posts, manifest.withdrawals);
const [categories, tags] = await Promise.all([
  fetchPaged(new URL('categories', endpoint), {
    per_page: '100',
    _fields: 'id,slug',
  }),
  fetchPaged(new URL('tags', endpoint), {
    per_page: '100',
    _fields: 'id,slug',
  }),
]);
const termMaps = {
  categories: new Map(categories.map(({ id, slug }) => [id, slug])),
  tags: new Map(tags.map(({ id, slug }) => [id, slug])),
};
const mediaIds = [
  ...new Set(activePosts.map(({ featured_media: id }) => id).filter(Boolean)),
];
const media = [];
for (let index = 0; index < mediaIds.length; index += 20) {
  const url = new URL('media', endpoint);
  url.searchParams.set('include', mediaIds.slice(index, index + 20).join(','));
  url.searchParams.set('per_page', '20');
  url.searchParams.set('_fields', 'id,source_url,alt_text,media_details');
  media.push(...(await fetchJson(url)));
}
const mediaById = new Map(media.map((item) => [item.id, item]));
const mappingById = new Map(manifest.articles.map((item) => [item.id, item]));

const articles = activePosts.map((post) => {
  const mapping = mappingById.get(post.id);
  const decision = decisions.articles.find(({ id }) => id === post.id);
  const markup = analyzePostMarkup(
    reviewedArticleHtml(post.content?.rendered, mapping?.content_review),
  );
  const featured = mediaById.get(post.featured_media);
  const readiness = classifyInventoryPost(
    {
      markup,
      featuredImage: Boolean(post.featured_media),
      featuredAlt: featured?.alt_text ?? '',
    },
    mapping,
  );
  if (
    mapping?.featured_image_recovery &&
    (featured ||
      mapping.featured_image_recovery.media_id !== post.featured_media)
  )
    throw new Error(`featured recovery drift: ${post.id}`);
  if (post.featured_media && !featured && !mapping?.featured_image_recovery) {
    readiness.status = 'BLOCKED';
    readiness.reasons.push('featured image metadata unavailable');
  }
  return {
    id: post.id,
    title: htmlText(post.title?.rendered),
    slug: post.slug,
    canonical: post.link,
    published_at: post.date_gmt,
    modified_at: post.modified_gmt,
    category: post.categories.map(
      (id) => termMaps.categories.get(id) ?? `unknown-${id}`,
    ),
    tags: post.tags.map((id) => termMaps.tags.get(id) ?? `unknown-${id}`),
    featured_image: featured
      ? {
          source_url: publicationSourceAssetUrl(featured.source_url),
          alt: featured.alt_text,
          width: featured.media_details?.width ?? null,
          height: featured.media_details?.height ?? null,
        }
      : null,
    body_images: markup.body_images.map(({ src, alt }) => ({
      source_url: src,
      alt,
    })),
    embeds: markup.iframes,
    shortcodes: markup.shortcodes,
    script_count: markup.script_count,
    unresolved_links: markup.unresolved_links,
    content_type: mapping?.content_type ?? null,
    route: mapping?.route ?? null,
    readiness: resolveInventoryDecision(
      post,
      readiness,
      decision && {
        ...decision,
        source_variants: mapping?.content_review?.source_variants,
      },
    ),
  };
});

let previous = null;
try {
  previous = JSON.parse(await readFile(outputPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (previous) {
  assertInventoryContinuity(articles, previous.articles, manifest.withdrawals);
  const withdrawnCount = previous.articles.filter(
    ({ id }) => !articles.some((article) => article.id === id),
  ).length;
  if (articles.length !== previous.expected_count - withdrawnCount) {
    throw new Error(
      `publication inventory count changed: ${previous.expected_count} -> ${articles.length}`,
    );
  }
}

const duplicate = (key) => {
  const seen = new Set();
  return articles
    .map((article) => article[key])
    .filter((value) => seen.size === seen.add(value).size);
};
for (const key of ['id', 'slug', 'canonical']) {
  if (duplicate(key).length) throw new Error(`duplicate ${key} in inventory`);
}

const statusCounts = Object.fromEntries(
  ['READY', 'NEEDS_REVIEW', 'NEEDS_TRANSFORM', 'BLOCKED', 'DEFERRED'].map(
    (status) => [
      status,
      articles.filter(({ readiness }) => readiness.status === status).length,
    ],
  ),
);
const output = {
  source_endpoint: endpoint,
  source_count: posts.length,
  expected_count: articles.length,
  withdrawals: manifest.withdrawals,
  status_counts: statusCounts,
  embed_hosts: Object.fromEntries(
    [
      ...new Set(
        articles.flatMap(({ embeds }) => embeds.map(({ host }) => host)),
      ),
    ].map((host) => [
      host,
      articles
        .flatMap(({ embeds }) => embeds)
        .filter((embed) => embed.host === host).length,
    ]),
  ),
  articles,
};

await writeFile(
  outputPath,
  await format(JSON.stringify(output), { parser: 'json' }),
);
console.log(
  `Inventoried ${posts.length} source posts; ${articles.length} publication candidates.`,
);
