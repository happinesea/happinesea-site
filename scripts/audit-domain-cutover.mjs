import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sanitizeHtml from 'sanitize-html';
import sharp from 'sharp';
import { format } from 'prettier';
import { entryContent } from './lib/legacy-compatibility.mjs';

const pagesBase = 'https://happinesea.github.io/happinesea-site';
const key = (url) =>
  new URL(url).href
    .replace(/%[0-9a-f]{2}/gi, (x) => x.toUpperCase())
    .split('#')[0];
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

export async function fetchRedirects(url, method = 'GET', fetchImpl = fetch) {
  let current = url;
  const redirects = [];
  for (let step = 0; step < 9; step++) {
    const response = await fetchImpl(current, {
      method,
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });
    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location)
      return { response, current, redirects };
    redirects.push({ url: current, status: response.status, location });
    await response.body?.cancel();
    if (/[\u0080-\uffff]/.test(location)) {
      // Raw UTF-8 Location bytes can appear as Latin-1; let native fetch resolve them.
      const followed = await fetchImpl(current, {
        method,
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });
      redirects.at(-1).resolution = 'native-fetch-follow';
      return { response: followed, current: followed.url, redirects };
    }
    current = new URL(location, current).href;
  }
  throw new Error('Redirect limit exceeded');
}

export function classifyAsset(asset, referencedBy) {
  // ponytail: HTML-observed scope only; backlink review is required before orphan removal.
  if (asset.migration_status === 'BLOCKED') return 'BLOCKED';
  if (referencedBy.length) return 'REQUIRED_FOR_CUTOVER';
  if (/-\d+x\d+(?:\.[a-z]+)$/i.test(new URL(asset.legacy_url).pathname))
    return 'DERIVATIVE';
  return asset.source.every((x) => x.startsWith('REST media'))
    ? 'ORPHAN'
    : 'OPTIONAL_ARCHIVE';
}

export function references(html, base) {
  const refs = [];
  sanitizeHtml(html, {
    allowedTags: false,
    allowVulnerableTags: true,
    transformTags: {
      '*': (tag, attrs) => {
        const add = (value, kind) => {
          try {
            const url = new URL(value, base);
            if (['http:', 'https:'].includes(url.protocol))
              refs.push({ url: url.href, kind, tag });
          } catch {
            /* Invalid links remain visible in source; no guessed repair. */
          }
        };
        if (attrs.src) add(attrs.src, 'runtime');
        if (attrs.poster) add(attrs.poster, 'runtime');
        if (attrs.srcset)
          for (const item of attrs.srcset.split(','))
            add(item.trim().split(/\s+/)[0], 'runtime');
        if (attrs.href)
          add(
            attrs.href,
            tag === 'link'
              ? /stylesheet/i.test(attrs.rel ?? '')
                ? 'runtime'
                : 'metadata'
              : 'navigation',
          );
        return { tagName: tag, attribs: attrs };
      },
    },
  });
  return refs;
}

async function audit() {
  const root = resolve('.');
  const load = async (name) =>
    JSON.parse(await readFile(join(root, 'src/data', `${name}.json`), 'utf8'));
  const inventory = await load('legacy-public-surface');
  const compatibility = await load('legacy-compatibility');
  const manifest = await load('wordpress-insight-manifest');
  const commit = execFileSync('git', ['rev-parse', 'origin/main'], {
    encoding: 'utf8',
  }).trim();
  const run = JSON.parse(
    execFileSync(
      'gh',
      [
        'run',
        'view',
        process.env.CUTOVER_RUN_ID ?? '37717122177',
        '--json',
        'headSha,jobs,url,status,conclusion',
      ],
      { encoding: 'utf8' },
    ),
  );
  if (
    run.headSha !== commit ||
    !run.jobs.some((x) => x.name === 'deploy' && x.conclusion === 'success')
  )
    throw new Error(
      'Latest main is not demonstrably deployed; do not audit stale Pages as current main.',
    );
  const observedAt = new Date().toISOString();
  const cache = new Map();
  const htmlBodies = new Map();
  async function probe(url, method = 'GET', decode = false) {
    const identity = `${method} ${key(url)} ${decode}`;
    if (cache.has(identity)) return cache.get(identity);
    const promise = (async () => {
      const result = {
        url,
        method,
        observed_at: new Date().toISOString(),
        redirects: [],
      };
      try {
        const { response, current, redirects } = await fetchRedirects(
          url,
          method,
        );
        result.redirects = redirects;
        Object.assign(result, {
          status: response.status,
          final_url: current,
          content_type: response.headers.get('content-type'),
          content_length: response.headers.get('content-length'),
        });
        if (method === 'HEAD') await response.body?.cancel();
        else {
          const bytes = Buffer.from(await response.arrayBuffer());
          Object.assign(result, {
            received_bytes: bytes.length,
            sha256: digest(bytes),
          });
          if (result.content_type?.includes('text/html')) {
            const html = bytes.toString('utf8');
            htmlBodies.set(key(url), html);
            const refs = references(html, current);
            result.canonical =
              refs.find(
                (x) =>
                  x.tag === 'link' &&
                  html.includes(`rel="canonical" href="${x.url}"`),
              )?.url ??
              /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*href=["']([^"']+)/i.exec(
                html,
              )?.[1] ??
              null;
          }
          if (
            decode &&
            response.status === 200 &&
            result.content_type?.startsWith('image/')
          ) {
            const image = sharp(bytes);
            const metadata = await image.metadata();
            await image.stats();
            result.image = {
              width: metadata.width,
              height: metadata.height,
              format: metadata.format,
              pages: metadata.pages ?? 1,
              decode: 'PASS',
            };
          }
        }
      } catch (error) {
        result.error = String(error.message);
      }
      return result;
    })();
    cache.set(identity, promise);
    return promise;
  }
  async function batch(items, worker) {
    let cursor = 0;
    const results = Array(items.length);
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        while (cursor < items.length) {
          const index = cursor++;
          results[index] = await worker(items[index]);
        }
      }),
    );
    return results;
  }
  const outputs = [];
  async function walk(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, item.name);
      if (item.isDirectory()) await walk(path);
      else if (item.name.endsWith('.html') && item.name !== '404.html') {
        const relative = path
          .slice(join(root, 'dist').length)
          .replaceAll('\\', '/');
        const route = relative.endsWith('/index.html')
          ? relative.slice(0, -10)
          : relative;
        const html = await readFile(path, 'utf8');
        outputs.push({
          route,
          canonical:
            /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*href=["']([^"']+)/i.exec(
              html,
            )?.[1] ?? null,
        });
      }
    }
  }
  await walk(join(root, 'dist'));
  const routes = await batch(outputs, async (item) => {
    const live = await probe(`${pagesBase}${item.route}`);
    return {
      ...item,
      live,
      canonical_matches_output: live.canonical === item.canonical,
    };
  });
  console.log(`Pages HTML routes: ${routes.length}`);
  const referencesByAsset = new Map();
  const publishedRefs = [];
  const remember = (url, page) => {
    const identity = key(url);
    if (!referencesByAsset.has(identity))
      referencesByAsset.set(identity, new Set());
    referencesByAsset.get(identity).add(page);
  };
  for (const item of routes) {
    for (const ref of references(
      htmlBodies.get(key(item.live.url)) ?? '',
      item.live.final_url ?? item.live.url,
    )) {
      publishedRefs.push({ ...ref, page: item.route });
      if (ref.kind !== 'metadata') remember(ref.url, item.live.url);
    }
  }
  const legacy = await batch(inventory.entries, async (entry) => {
    const isAsset = ['image', 'download'].includes(entry.content_type);
    const source = await probe(
      entry.legacy_url,
      isAsset || entry.content_type === 'attachment' ? 'HEAD' : 'GET',
    );
    const sourceHtml = htmlBodies.get(key(entry.legacy_url));
    if (source.status === 200 && sourceHtml) {
      let body;
      try {
        body = entryContent(sourceHtml);
      } catch {
        body = sourceHtml;
      }
      for (const ref of references(body, source.final_url))
        if (ref.kind !== 'metadata') remember(ref.url, entry.legacy_url);
    }
    const url = new URL(entry.legacy_url);
    const counterpart = await probe(
      `${pagesBase}${url.pathname}${url.search}`,
      'HEAD',
    );
    return {
      legacy_url: entry.legacy_url,
      content_type: entry.content_type,
      historical_status: entry.current_status,
      migration_status: entry.migration_status,
      target_route: entry.target_route,
      canonical: entry.canonical,
      source,
      pages_counterpart: counterpart,
    };
  });
  console.log(`Legacy URL observations: ${legacy.length}`);
  const candidates = inventory.entries.filter(
    (x) =>
      ['image', 'download'].includes(x.content_type) &&
      x.migration_status !== 'READY',
  );
  const assets = await batch(candidates, async (entry) => {
    const referencedBy = [
      ...(referencesByAsset.get(key(entry.legacy_url)) ?? []),
    ];
    const classification = classifyAsset(entry, referencedBy);
    const observation = legacy.find((x) => x.legacy_url === entry.legacy_url);
    return {
      legacy_url: entry.legacy_url,
      classification,
      referenced_by: referencedBy,
      source: observation.source,
      pages_counterpart: observation.pages_counterpart,
      ...(classification === 'REQUIRED_FOR_CUTOVER'
        ? {
            source_bytes: await probe(
              entry.legacy_url,
              'GET',
              entry.content_type === 'image',
            ),
          }
        : {}),
      notes:
        classification === 'ORPHAN'
          ? 'No reference found in the observed HTML scope; not approval for deletion or proof against external backlinks.'
          : entry.notes.slice(-1).join(' '),
    };
  });
  const localTargets = [
    ...new Set(
      publishedRefs
        .filter(
          (x) => x.kind !== 'metadata' && x.url.startsWith(`${pagesBase}/`),
        )
        .map((x) => key(x.url)),
    ),
  ];
  const localLinks = await batch(localTargets, async (url) => ({
    url,
    observation: await probe(
      url,
      /\.(?:pdf|zip|docx?|gif)(?:\?|$)/i.test(url) ? 'GET' : 'HEAD',
    ),
    referenced_by: [...(referencesByAsset.get(key(url)) ?? [])],
  }));
  const downloads = await batch(
    [
      ...new Map(
        compatibility.assets
          .filter((x) => x.kind === 'download')
          .map((x) => [x.target_route, x]),
      ).values(),
    ],
    async (asset) => {
      const response = await probe(
        `${pagesBase}${encodeURI(asset.target_route)}`,
      );
      return {
        source_url: asset.source_url,
        target_route: asset.target_route,
        expected_sha256: asset.sha256,
        live: response,
        bytes_match:
          response.status === 200 &&
          response.sha256 === asset.sha256 &&
          !response.content_type?.includes('text/html'),
      };
    },
  );
  const queries = await batch(
    compatibility.assets.filter((x) =>
      new URL(x.source_url).searchParams.has('wpdmdl'),
    ),
    async (asset) => {
      const url = new URL(asset.source_url);
      return {
        source_url: asset.source_url,
        expected_target: asset.target_route,
        expected_sha256: asset.sha256,
        live: await probe(`${pagesBase}${url.pathname}${url.search}`),
      };
    },
  );
  const runtime = publishedRefs.filter(
    (x) => x.kind === 'runtime' && new URL(x.url).hostname === 'happinesea.com',
  );
  const oldNavigation = publishedRefs.filter(
    (x) =>
      x.kind === 'navigation' && new URL(x.url).hostname === 'happinesea.com',
  );
  const oldNavigationTargets = await batch(
    [...new Set(oldNavigation.map((x) => key(x.url)))],
    async (url) => {
      const value = new URL(url);
      return {
        url,
        live_counterpart: await probe(
          `${pagesBase}${value.pathname}${value.search}`,
        ),
        referenced_by: [
          ...new Set(
            oldNavigation.filter((x) => key(x.url) === url).map((x) => x.page),
          ),
        ],
      };
    },
  );
  const articleAliases = manifest.articles.map((article) => {
    const alias = new URL(article.canonical).pathname;
    const old = routes.find(
      (item) => key(item.live.url) === key(`${pagesBase}${alias}`),
    );
    const modern = routes.find(
      (item) => key(item.live.url) === key(`${pagesBase}${article.route}`),
    );
    return {
      id: article.id,
      legacy_route: alias,
      route: article.route,
      canonical: article.canonical,
      status: old?.live.status ?? null,
      canonical_preserved: old?.live.canonical === article.canonical,
      exact_live_bytes: Boolean(
        old?.live.sha256 && old.live.sha256 === modern?.live.sha256,
      ),
    };
  });
  const drawingAliases = compatibility.pages
    .filter((page) => page.type === 'drawing')
    .map((page) => {
      const route = routes.find(
        (item) =>
          key(item.live.url) === key(`${pagesBase}${page.target_route}`),
      );
      return {
        id: page.id,
        legacy_route: page.target_route,
        canonical: page.canonical,
        status: route?.live.status ?? null,
        canonical_preserved: route?.live.canonical === page.canonical,
      };
    });
  const counts = (items, field) =>
    Object.fromEntries(
      [...new Set(items.map((x) => x[field]))]
        .sort()
        .map((value) => [
          value,
          items.filter((x) => x[field] === value).length,
        ]),
    );
  const report = {
    version: '0.1',
    observed_at: observedAt,
    baseline_commit: commit,
    pages_base: `${pagesBase}/`,
    deployment: {
      run_url: run.url,
      head_sha: run.headSha,
      jobs: run.jobs.map(({ name, status, conclusion }) => ({
        name,
        status,
        conclusion,
      })),
    },
    scope:
      'Read-only HTTP GET/HEAD audit of deployed main and all historical inventory URLs. No DNS, deployment or content mutation. Orphan means unreferenced in this bounded HTML observation, not deletion approval.',
    summary: {
      domain_cutover: 'NOT READY',
      legacy_urls: legacy.length,
      legacy_http_verified: legacy.filter((x) =>
        Number.isInteger(x.source.status),
      ).length,
      legacy_http_unknown: legacy.filter(
        (x) => !Number.isInteger(x.source.status),
      ).length,
      legacy_source_http_errors: legacy.filter((x) => x.source.status >= 400)
        .length,
      pages_html_routes: routes.length,
      pages_html_errors: routes.filter(
        (x) => x.live.status !== 200 || x.live.error,
      ).length,
      canonical_output_conflicts: routes.filter(
        (x) => !x.canonical_matches_output,
      ).length,
      legacy_counterpart_unresolved: legacy.filter(
        (x) => x.pages_counterpart.status !== 200 || x.pages_counterpart.error,
      ).length,
      old_origin_asset_candidates: assets.length,
      asset_classification: counts(assets, 'classification'),
      internal_broken_targets: localLinks.filter(
        (x) => x.observation.status >= 400 || x.observation.error,
      ).length,
      old_origin_navigation_targets: oldNavigationTargets.length,
      old_origin_navigation_unresolved: oldNavigationTargets.filter(
        (x) => x.live_counterpart.status !== 200 || x.live_counterpart.error,
      ).length,
      old_origin_runtime_resources: runtime.length,
      checked_downloads: downloads.length,
      download_failures: downloads.filter((x) => !x.bytes_match).length,
      query_non_file_responses: queries.filter(
        (x) => x.live.sha256 !== x.expected_sha256,
      ).length,
      migrated_article_aliases:
        articleAliases.length +
        compatibility.pages.filter((x) => x.type === 'drawing').length,
      exact_article_alias_failures: articleAliases.filter(
        (x) =>
          x.status !== 200 || !x.canonical_preserved || !x.exact_live_bytes,
      ).length,
      drawing_alias_failures: drawingAliases.filter(
        (x) => x.status !== 200 || !x.canonical_preserved,
      ).length,
    },
    routes,
    article_aliases: articleAliases,
    drawing_aliases: drawingAliases,
    legacy,
    assets,
    local_links: localLinks,
    downloads,
    query_downloads: queries,
    old_origin_runtime: runtime,
    old_origin_navigation: oldNavigationTargets,
    indexing_candidates: await Promise.all(
      ['/robots.txt', '/sitemap-index.xml', '/sitemap-0.xml'].map((path) =>
        probe(`${pagesBase}${path}`),
      ),
    ),
  };
  await mkdir(join(root, 'docs/audits'), { recursive: true });
  await writeFile(
    join(root, 'docs/audits/domain-cutover-http.json'),
    await format(JSON.stringify(report), { parser: 'json' }),
  );
  console.log(JSON.stringify(report.summary, null, 2));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await audit();
