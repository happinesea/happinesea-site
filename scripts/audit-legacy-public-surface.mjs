import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';
import { execFileSync } from 'node:child_process';
import { reconcileArticleRoutes } from './reconcile-legacy-public-surface.mjs';
import { fetchWithRetry, htmlText } from './lib/wordpress-publication.mjs';
import {
  publicUrls,
  surfaceType,
  cutoverSummary,
  sameCanonical,
} from './lib/legacy-public-surface.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://happinesea.com';
const baseline = execFileSync('git', ['rev-parse', 'origin/main'], {
  cwd: root,
  encoding: 'utf8',
}).trim();
const manifest = JSON.parse(
  await readFile(
    join(root, 'src/data/wordpress-insight-manifest.json'),
    'utf8',
  ),
);
const endpoint = process.env.WORDPRESS_API_URL ?? manifest.source_endpoint;
const articleInventory = JSON.parse(
  await readFile(
    join(root, 'src/data/wordpress-insight-inventory.json'),
    'utf8',
  ),
);
const entries = new Map();
const failures = [];
const observedAt = new Date().toISOString();
function add(url, source, type = surfaceType(url), canonical = null) {
  const normalized = publicUrls(`<a href="${url}">`, origin)[0];
  if (!normalized) return null;
  if (!entries.has(normalized))
    entries.set(normalized, {
      legacy_url: normalized,
      content_type: type,
      current_status: 'UNVERIFIED',
      source: [],
      target_route: null,
      canonical,
      migration_status: 'NEEDS_REVIEW',
      redirect_required: false,
      asset_dependencies: [],
      notes: [],
    });
  const entry = entries.get(normalized);
  if (!entry.source.includes(source)) entry.source.push(source);
  if (type !== 'page') entry.content_type = type;
  if (canonical) entry.canonical = canonical;
  return entry;
}
async function paged(type, fields) {
  const results = [];
  let total = 0,
    pages = 1;
  for (let page = 1; page <= pages; page++) {
    const url = new URL(type, endpoint);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    url.searchParams.set('_fields', fields);
    if (['posts', 'pages'].includes(type))
      url.searchParams.set('status', 'publish');
    const response = await fetchWithRetry(url, {});
    const nextTotal = Number(response.headers.get('x-wp-total'));
    const nextPages = Number(response.headers.get('x-wp-totalpages'));
    if (
      !response.headers.has('x-wp-total') ||
      !Number.isInteger(nextTotal) ||
      !Number.isInteger(nextPages)
    )
      throw new Error(`invalid ${type} pagination`);
    if (page === 1) {
      total = nextTotal;
      pages = nextPages;
    } else if (total !== nextTotal || pages !== nextPages)
      throw new Error(`${type} changed during pagination`);
    const items = await response.json();
    if (!Array.isArray(items)) throw new Error(`invalid ${type} response`);
    results.push(...items);
  }
  if (results.length !== total) {
    if (type !== 'media') throw new Error(`incomplete ${type} inventory`);
    failures.push(
      `Public media REST returned ${results.length} records while advertising ${total}; omitted records are not inferred or fetched with privileged access.`,
    );
  }
  console.log(`${type}: ${results.length} / advertised ${total}`);
  return results;
}

const posts = await paged(
  'posts',
  'id,status,link,slug,title,content,categories',
);
const pages = await paged('pages', 'id,status,link,slug,title,content');
const categories = await paged('categories', 'id,link,slug,name,count');
const media = await paged('media', 'id,link,source_url,mime_type');
const faqs = await paged('ufaq', 'id,status,link,title,content');
for (const faq of faqs) {
  if (faq.status !== 'publish') throw new Error(`non-public FAQ ${faq.id}`);
  const entry = add(faq.link, `REST FAQ ${faq.id}`, 'faq', faq.link);
  entry.notes.push(`Source title: ${htmlText(faq.title.rendered)}`);
  for (const url of publicUrls(faq.content?.rendered, faq.link))
    add(url, `FAQ content ${faq.id}`);
}
if (posts.length !== 97)
  throw new Error(`published post baseline changed: ${posts.length}`);
const drawingCategory = categories.find(
  (category) => category.slug === 'engineering-drawing',
)?.id;
for (const item of [...posts, ...pages]) {
  if (item.status !== 'publish')
    throw new Error(`non-public source ${item.id}`);
  const type = posts.includes(item)
    ? item.categories.includes(drawingCategory)
      ? 'drawing'
      : 'post'
    : surfaceType(item.link);
  const entry = add(
    item.link,
    `REST ${posts.includes(item) ? 'post' : 'page'} ${item.id}`,
    type,
    item.link,
  );
  entry.notes.push(`Source title: ${htmlText(item.title.rendered)}`);
  const mapping = manifest.articles.find(
    (article) => article.canonical === item.link,
  );
  if (mapping) {
    entry.target_route = mapping.route;
    entry.migration_status = 'NEEDS_REVIEW';
    entry.redirect_required = false;
    entry.notes.push(
      'Article generated at target_route; exact legacy alias output must be verified before READY.',
    );
  } else {
    const article = articleInventory.articles.find(
      (article) => article.canonical === item.link,
    );
    entry.migration_status =
      article?.readiness.status === 'BLOCKED'
        ? 'BLOCKED'
        : article
          ? 'NEEDS_REVIEW'
          : 'MIGRATE';
    if (article)
      entry.notes.push(
        `Article readiness ${article.readiness.status}: ${article.readiness.reasons.join('; ')}`,
      );
  }
  for (const url of publicUrls(item.content?.rendered, item.link)) {
    const dependency = add(url, `content ${item.id}`);
    if (dependency && ['image', 'download'].includes(dependency.content_type))
      entry.asset_dependencies.push(dependency.legacy_url);
  }
}
for (const category of categories) {
  const entry = add(
    category.link,
    `REST category ${category.id}`,
    'category_archive',
    category.link,
  );
  entry.notes.push(
    `Category: ${category.name}; ${category.count} published posts. Archive compatibility is not implemented.`,
  );
  entry.migration_status = 'MIGRATE';
}
for (const item of media) {
  add(
    item.source_url,
    `REST media ${item.id}`,
    item.mime_type.startsWith('image/') ? 'image' : 'download',
  );
  add(item.link, `REST media page ${item.id}`, 'attachment');
}
for (const path of ['/', '/drawinglibrary', '/drone-rc-glossary'])
  add(new URL(path, origin).href, 'explicit critical entry');

async function scanSource(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) await scanSource(path);
    else if (
      item.name !== 'legacy-public-surface.json' &&
      /\.(?:astro|ts|json|mdx?)$/.test(item.name)
    ) {
      const text = await readFile(path, 'utf8');
      for (const [url] of text.matchAll(
        /https?:\/\/happinesea\.com[^\s"'<>\\)]+/g,
      ))
        add(
          url,
          `frontend ${path.slice(root.length + 1).replaceAll('\\', '/')}`,
        );
    }
  }
}
await scanSource(join(root, 'src'));

let htmlProbed = 0;
async function checkpoint() {
  const records = [...entries.values()].sort((a, b) =>
    a.legacy_url.localeCompare(b.legacy_url),
  );
  await writeFile(
    join(root, 'src/data/legacy-public-surface.json'),
    await format(
      JSON.stringify({
        version: '0.1',
        observed_at: observedAt,
        source_origin: origin,
        baseline_commit: baseline,
        discovery: {
          posts: posts.length,
          pages: pages.length,
          categories: categories.length,
          media: media.length,
          faqs: faqs.length,
          html_probed: htmlProbed,
          failures,
          complete: false,
        },
        summary: cutoverSummary(records),
        entries: records,
      }),
      { parser: 'json' },
    ),
  );
}
failures.push(
  'Bounded discovery: rendered attachment/post pages and exhaustive asset reachability are deferred; unprobed URLs remain UNVERIFIED. No URL disappearance is approved.',
);
await checkpoint();
try {
  const index = await (
    await fetch(`${origin}/sitemap_index.xml`, {
      signal: AbortSignal.timeout(10000),
    })
  ).text();
  for (const [, child] of index.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    if (new URL(child).origin !== origin)
      throw new Error('unexpected sitemap origin');
    try {
      const response = await fetch(child, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xml = await response.text();
      for (const [, url] of xml.matchAll(/<loc>([^<]+)<\/loc>/g))
        add(url, `sitemap ${child}`);
    } catch (error) {
      failures.push(`Sitemap child unverified ${child}: ${error.name}`);
    }
    await checkpoint();
  }
} catch (error) {
  failures.push(`Sitemap discovery failed: ${error.name}`);
}

// One concurrency ceiling protects the legacy CMS; a failed probe is recorded, never treated as absence.
async function concurrent(items, action) {
  let index = 0;
  await Promise.all(
    Array.from({ length: 2 }, async () => {
      while (index < items.length) await action(items[index++]);
    }),
  );
}
const crawled = new Set();
for (const entry of entries.values()) {
  if (entry.content_type === 'attachment') {
    entry.notes.push(
      'Attachment page from public REST; rendered route not probed in this batch. Retain until individually reviewed.',
    );
  }
}
failures.push(
  'Attachment-page HTML probes deferred; public media metadata and original asset URLs are inventoried, not assumed migrated.',
);
let rounds = 0;
while (true) {
  const pending = [...entries.values()].filter(
    (entry) =>
      !crawled.has(entry.legacy_url) &&
      !['image', 'download', 'attachment', 'post', 'drawing'].includes(
        entry.content_type,
      ),
  );
  if (!pending.length) break;
  if (++rounds > 3 || htmlProbed >= 40) {
    failures.push('HTML crawl ceiling reached; inventory incomplete');
    break;
  }
  await concurrent(pending.slice(0, 40 - htmlProbed), async (entry) => {
    crawled.add(entry.legacy_url);
    htmlProbed++;
    try {
      const response = await fetch(entry.legacy_url, {
        signal: AbortSignal.timeout(8000),
      });
      entry.current_status = response.status;
      if (!response.ok) {
        await response.body?.cancel();
        entry.migration_status = 'BLOCKED';
        entry.notes.push(`Source HTTP ${response.status}; no removal approved`);
        return;
      }
      if (!response.headers.get('content-type')?.includes('text/html')) {
        await response.body?.cancel();
        return;
      }
      const html = await response.text();
      const canonicalTag = html.match(
        /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/i,
      )?.[1];
      if (
        canonicalTag &&
        entry.canonical &&
        !sameCanonical(
          new URL(canonicalTag, entry.legacy_url).href,
          entry.canonical,
        )
      )
        entry.notes.push(
          `canonical conflict: HTML ${canonicalTag}, REST ${entry.canonical}`,
        );
      if (!entry.canonical && canonicalTag)
        entry.canonical = new URL(canonicalTag, entry.legacy_url).href;
      for (const url of publicUrls(html, response.url)) {
        const dependency = add(url, `rendered ${entry.legacy_url}`);
        if (
          dependency &&
          ['image', 'download'].includes(dependency.content_type) &&
          !entry.asset_dependencies.includes(url)
        )
          entry.asset_dependencies.push(url);
      }
    } catch (error) {
      entry.notes.push(`Probe failed: ${error.name}`);
      failures.push(`Unverified ${entry.legacy_url}`);
    }
  });
  await checkpoint();
  console.log(`HTML processed ${htmlProbed}; discovered ${entries.size}`);
}
await concurrent(
  [...entries.values()]
    .filter((entry) => ['image', 'download'].includes(entry.content_type))
    .sort(
      (a, b) =>
        (a.content_type === 'download' ? 0 : 1) -
        (b.content_type === 'download' ? 0 : 1),
    )
    .slice(0, 30),
  async (entry) => {
    try {
      let response = await fetch(entry.legacy_url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(8000),
      });
      if (response.status === 405)
        response = await fetch(entry.legacy_url, {
          signal: AbortSignal.timeout(8000),
        });
      entry.current_status = response.status;
      if (!response.ok) {
        entry.migration_status = 'BLOCKED';
        entry.notes.push(`Source HTTP ${response.status}; no removal approved`);
      } else
        entry.notes.push(
          'Source reachable; bytes/rights/local compatibility path not yet reviewed.',
        );
      await response.body?.cancel();
    } catch (error) {
      entry.notes.push(`Probe failed: ${error.name}`);
      failures.push(`Unverified ${entry.legacy_url}`);
    }
  },
);
const records = [...entries.values()].sort((a, b) =>
  a.legacy_url.localeCompare(b.legacy_url),
);
const summary = cutoverSummary(records);
const output = {
  version: '0.1',
  observed_at: observedAt,
  source_origin: origin,
  baseline_commit: baseline,
  discovery: {
    posts: posts.length,
    pages: pages.length,
    categories: categories.length,
    media: media.length,
    faqs: faqs.length,
    html_probed: htmlProbed,
    failures,
    complete: failures.length === 0,
  },
  summary,
  entries: records,
};
await reconcileArticleRoutes(output, manifest, join(root, 'dist'), baseline);
await writeFile(
  join(root, 'src/data/legacy-public-surface.json'),
  await format(JSON.stringify(output), { parser: 'json' }),
);
console.log(JSON.stringify(output.summary, null, 2));
