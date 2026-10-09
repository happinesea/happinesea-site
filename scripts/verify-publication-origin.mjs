import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { format } from 'prettier';
import { references } from './audit-domain-cutover.mjs';

const production = process.env.PUBLICATION_MODE === 'production';
const mode = production ? 'production' : 'staging';
const dist = process.argv[2] ?? 'dist';
const base = process.env.E2E_BASE_URL;
assert(base, 'E2E_BASE_URL must point to this build served over HTTP');
const publicBase = production
  ? 'https://happinesea.com/'
  : 'https://happinesea.github.io/happinesea-site/';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const load = async (path) => JSON.parse(await readFile(path, 'utf8'));
const checks = new Set();
const expectedCanonicals = new Map();
for (const page of (await load('src/data/legacy-compatibility.json')).pages)
  expectedCanonicals.set(
    decodeURIComponent(page.target_route).replace(/^\//, '') +
      (page.target_route.endsWith('.html') ? '' : '/index.html'),
    page.canonical,
  );
const manifest = await load('src/data/wordpress-insight-manifest.json');
for (const article of manifest.articles) {
  checks.add(new URL('.' + new URL(article.canonical).pathname, base).href);
  expectedCanonicals.set(
    `insights/${decodeURIComponent(article.slug)}/index.html`,
    article.canonical,
  );
  expectedCanonicals.set(
    new URL(article.canonical).pathname.slice(1),
    article.canonical,
  );
}
expectedCanonicals.set(
  'radiolink/index.html',
  'https://happinesea.com/radiolink',
);
let htmlCount = 0;
let canonicalCount = 0;
let ogCount = 0;
for (const entry of await readdir(dist, { recursive: true })) {
  const path = entry.replaceAll('\\', '/');
  if (!/\.(html|js|xml|txt|css)$/.test(path)) continue;
  const text = await readFile(`${dist}/${path}`, 'utf8');
  if (production) {
    assert(
      !text.includes('happinesea.github.io/happinesea-site'),
      `staging origin: ${path}`,
    );
    assert(!text.includes('/happinesea-site/'), `staging prefix: ${path}`);
  }
  if (/\.(html|js)$/.test(path))
    assert(
      !text.includes('cms.happinesea.com'),
      `public CMS reference: ${path}`,
    );
  if (!path.endsWith('.html')) continue;
  htmlCount++;
  const canonical = [
    ...text.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/g),
  ].map((m) => m[1]);
  if (path === '404.html') {
    assert.equal(
      canonical.length,
      0,
      '404 must not acquire an indexable canonical',
    );
    continue;
  }
  assert.equal(canonical.length, 1, `canonical count: ${path}`);
  if (expectedCanonicals.has(path))
    assert.equal(
      canonical[0],
      expectedCanonicals.get(path),
      `legacy canonical drift: ${path}`,
    );
  canonicalCount++;
  if (production)
    assert.equal(new URL(canonical[0]).origin, 'https://happinesea.com', path);
  const og = /<meta\b[^>]*property="og:url"[^>]*content="([^"]+)"/.exec(
    text,
  )?.[1];
  if (og) {
    assert.equal(og, canonical[0], `OpenGraph canonical conflict: ${path}`);
    ogCount++;
  }
  const page = new URL(path.replace(/index\.html$/, ''), base);
  for (const ref of references(text, page)) {
    const url = new URL(ref.url);
    if (ref.kind === 'metadata') continue;
    assert(
      !(
        ref.kind === 'runtime' &&
        (/cms\.happinesea\.com|\/wp-json\//.test(ref.url) ||
          /^(www\.)?happinesea\.com$/.test(url.hostname))
      ),
      `old-origin runtime: ${path}`,
    );
    if (/^(www\.)?happinesea\.com$/.test(url.hostname))
      checks.add(
        new URL('.' + url.pathname + url.search, base).href.split('#')[0],
      );
    else if (url.origin === new URL(base).origin)
      checks.add(ref.url.split('#')[0]);
  }
}
for (const name of ['sitemap-index.xml', 'sitemap-0.xml']) {
  const xml = await readFile(`${dist}/${name}`, 'utf8');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert(urls.length > 0, `empty sitemap: ${name}`);
  for (const url of urls)
    assert(url.startsWith(publicBase), `sitemap origin: ${url}`);
}
assert.equal(
  await readFile(`${dist}/robots.txt`, 'utf8'),
  `User-agent: *\nAllow: /\nSitemap: ${publicBase}sitemap-index.xml\n`,
);
const failures = [];
const queue = [...checks];
let next = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < queue.length) {
      const url = queue[next++];
      const response = await fetch(url);
      await response.arrayBuffer();
      if (response.status !== 200)
        failures.push({ url, status: response.status });
    }
  }),
);
assert.deepEqual(failures, [], 'broken first-party links/assets');
const downloads = await load('src/data/static-downloads.json');
let downloadCount = 0;
for (const file of downloads.files)
  for (const route of [file.target_route, ...file.legacy_routes]) {
    const response = await fetch(new URL('.' + route, base));
    assert.equal(response.status, 200, route);
    assert.equal(
      hash(Buffer.from(await response.arrayBuffer())),
      file.sha256,
      route,
    );
    downloadCount++;
  }
const aliases = (await load('src/data/cutover-compatibility.json')).aliases;
for (const alias of aliases) {
  const response = await fetch(new URL('.' + alias.target_route, base));
  assert.equal(response.status, 200, alias.target_route);
  assert.deepEqual(
    Buffer.from(await response.arrayBuffer()),
    await readFile(`${dist}${alias.source_route}`),
  );
}
const result = {
  mode,
  observed_at: new Date().toISOString(),
  evidence_scope: 'local static HTTP; no production deployment',
  public_base: publicBase,
  html_count: htmlCount,
  canonicals_checked: canonicalCount,
  open_graph_urls_checked: ogCount,
  first_party_http_checks: checks.size,
  broken_links_assets: 0,
  canonical_conflicts: 0,
  cms_runtime_references: 0,
  download_http_hash_checks: downloadCount,
  manual_aliases: aliases.length,
  article_aliases: manifest.articles.length,
  staging_origin_residuals: production ? 0 : null,
  staging_prefix_residuals: production ? 0 : null,
};
await writeFile(
  `docs/audits/publication-origin-${mode}.json`,
  await format(JSON.stringify(result), { parser: 'json' }),
);
console.log(JSON.stringify(result));
