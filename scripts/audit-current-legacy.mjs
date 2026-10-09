import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { references, fetchRedirects } from './audit-domain-cutover.mjs';

const base = 'https://happinesea.github.io/happinesea-site';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const key = (url) =>
  new URL(url).href
    .split('#')[0]
    .replace(/%[a-f\d]{2}/gi, (s) => s.toUpperCase());
const pathKey = (url) =>
  decodeURIComponent(new URL(url, base).pathname).replace(/\/$/, '') || '/';
const oldOrigin = (url) =>
  /^(www\.)?happinesea\.com$/.test(new URL(url).hostname);

export function classifyCurrent({
  retired,
  ownerUnknown,
  resolved,
  referenced,
  derivative,
}) {
  if (retired) return 'SAFE_TO_RETIRE';
  if (ownerUnknown) return 'UNKNOWN_OWNER_DECISION';
  if (resolved) return 'ALREADY_RESOLVED';
  if (referenced) return 'REQUIRED_FOR_CUTOVER';
  return derivative ? 'DERIVATIVE' : 'ORPHAN';
}

async function parallel(items, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

export async function probe(url, bytes = false) {
  try {
    const { response, current, redirects } = await fetchRedirects(url);
    const body = Buffer.from(await response.arrayBuffer());
    return {
      url,
      status: response.status,
      final_url: current,
      redirects,
      content_type: response.headers.get('content-type'),
      bytes: body.length,
      ...(bytes ? { sha256: hash(body) } : {}),
      body,
    };
  } catch (error) {
    return { url, status: null, error: error.message };
  }
}

export async function inspectRequiredDownloads(sourceChecks) {
  const receipts = [];
  for (const source of sourceChecks.filter(
    (r) =>
      r.status === 200 &&
      /\/download\/(?!document-tag\/)/.test(new URL(r.url).pathname),
  )) {
    const page = await probe(source.url);
    const html = page.body?.toString('utf8') ?? '';
    const links = [
      ...new Set(
        [
          ...html.matchAll(/(?:href|data-downloadurl)="([^"]*wpdmdl=[^"]*)"/g),
        ].map((m) => new URL(m[1].replaceAll('&amp;', '&'), source.url).href),
      ),
    ];
    for (const url of links) {
      const file = await probe(url, true);
      delete file.body;
      receipts.push({
        source_page: source.url,
        ...file,
        response_is_binary:
          file.status === 200 && !/html|json/i.test(file.content_type ?? ''),
      });
    }
  }
  return receipts;
}

export async function inspectFirmwareMedia(assets) {
  return parallel(
    assets.filter((a) => /RC4GS.*firmware.*\.zip$/i.test(a.source_url)),
    async (asset) => {
      const source = await probe(asset.source_url, true);
      const published = await probe(base + asset.target_route, true);
      delete source.body;
      delete published.body;
      return {
        source_url: asset.source_url,
        target_route: asset.target_route,
        expected_sha256: asset.sha256,
        source,
        published,
        hash_matches:
          source.sha256 === asset.sha256 && published.sha256 === asset.sha256,
      };
    },
  );
}

async function audit() {
  if (!process.env.CUTOVER_RUN_ID)
    throw new Error('Set CUTOVER_RUN_ID to the verified main deployment');
  const load = async (name) =>
    JSON.parse(await readFile(`src/data/${name}.json`, 'utf8'));
  const inventory = await load('legacy-public-surface');
  const compatibility = await load('legacy-compatibility');
  const articles = await load('wordpress-insights');
  const manifest = await load('wordpress-insight-manifest');
  const downloads = await load('static-downloads');
  const previous = JSON.parse(
    await readFile('docs/audits/domain-cutover-http.json', 'utf8'),
  );
  const commit = execFileSync('git', ['rev-parse', 'origin/main'], {
    encoding: 'utf8',
  }).trim();
  const run = JSON.parse(
    execFileSync(
      'gh',
      ['run', 'view', process.env.CUTOVER_RUN_ID, '--json', 'headSha,jobs,url'],
      { encoding: 'utf8' },
    ),
  );
  if ((await readFile('dist/.audit-baseline', 'utf8')).trim() !== commit)
    throw new Error(
      'dist must be freshly built and stamped with the audited source commit',
    );
  if (
    run.headSha !== commit ||
    !run.jobs.some((j) => j.name === 'deploy' && j.conclusion === 'success')
  )
    throw new Error('Latest main deployment not verified');
  const htmlFiles = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await walk(file);
      else if (file.endsWith('.html') && entry.name !== '404.html')
        htmlFiles.push(file);
    }
  }
  await walk('dist');
  const canonical = (html) =>
    /<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i.exec(html)?.[1] ??
    /<link\b[^>]*href="([^"]+)"[^>]*rel="canonical"/i.exec(html)?.[1] ??
    null;
  const pages = await parallel(htmlFiles.sort(), async (file) => {
    const route = file.slice(4).replace(/index\.html$/, '');
    const local = await readFile(file, 'utf8');
    const live = await probe(base + route);
    const html = live.body?.toString('utf8') ?? '';
    return {
      route,
      status: live.status,
      error: live.error,
      canonical: canonical(html),
      expected_canonical: canonical(local),
      references: references(html, base + route),
    };
  });
  const refs = new Map();
  for (const page of pages)
    for (const ref of page.references) {
      if (ref.kind === 'metadata') continue;
      const url = key(ref.url);
      const entry = refs.get(url) ?? {
        url,
        kinds: new Set(),
        pages: new Set(),
      };
      entry.kinds.add(ref.kind);
      entry.pages.add(page.route);
      refs.set(url, entry);
    }
  const localExists = async (route) => {
    try {
      const file = `dist${decodeURIComponent(route).split('?')[0]}`;
      const info = await stat(file);
      return (
        info.isFile() ||
        (await stat(`${file.replace(/\/$/, '')}/index.html`)).isFile()
      );
    } catch {
      return false;
    }
  };
  const provenance = new Map();
  for (const asset of compatibility.assets)
    provenance.set(key(asset.source_url), asset.target_route);
  for (const article of articles)
    for (const asset of article.body_assets ?? [])
      provenance.set(key(asset.source_url), asset.src);
  for (const file of downloads.files)
    for (const url of file.source_urls)
      provenance.set(key(url), file.target_route);
  const retired = new Set(
    (manifest.withdrawals ?? []).map((a) => pathKey(a.canonical)),
  );
  retired.add('/style-guide');
  const unknown = new Set(compatibility.blocked.map((a) => key(a.source_url)));
  const queryGuidancePaths = new Set(
    compatibility.pages
      .filter((p) => p.download_id)
      .map((p) => pathKey(p.source_url)),
  );
  const referencedOld = [...refs.values()].filter((r) => oldOrigin(r.url));
  const byPath = new Map();
  for (const r of referencedOld) {
    const p = pathKey(r.url);
    const list = byPath.get(p) ?? [];
    list.push(r);
    byPath.set(p, list);
  }
  const oldChecks = await parallel(referencedOld, async (ref) => {
    const url = new URL(ref.url);
    const target = base + url.pathname + url.search;
    const check = await probe(target, ref.kinds.has('runtime'));
    delete check.body;
    return {
      legacy_url: ref.url,
      kinds: [...ref.kinds],
      referenced_by: [...ref.pages],
      counterpart: check,
    };
  });
  const discovered = new Set(inventory.entries.map((e) => key(e.legacy_url)));
  const candidates = [
    ...inventory.entries,
    ...referencedOld
      .filter((r) => !discovered.has(key(r.url)))
      .map((r) => ({
        legacy_url: r.url,
        content_type: 'current_reference_not_in_historical_inventory',
      })),
  ];
  const rows = await parallel(candidates, async (entry) => {
    const url = key(entry.legacy_url);
    const references = byPath.get(pathKey(url)) ?? [];
    const direct = new URL(url).pathname;
    const mapped = provenance.get(url);
    const localized = mapped && (await localExists(mapped));
    const querySupported =
      !new URL(url).search || queryGuidancePaths.has(pathKey(url));
    const exactStatic = querySupported && (await localExists(direct));
    const liveChecks = oldChecks.filter(
      (r) => pathKey(r.legacy_url) === pathKey(url),
    );
    const resolved =
      querySupported &&
      (references.length
        ? liveChecks.every((r) => r.counterpart.status === 200)
        : exactStatic || localized);
    const classification = classifyCurrent({
      retired: retired.has(pathKey(url)),
      ownerUnknown: unknown.has(url) || pathKey(url) === '/wp-admin',
      resolved,
      referenced: references.length > 0,
      derivative: /-\d+x\d+\.[a-z]+$/i.test(direct),
    });
    return {
      legacy_url: entry.legacy_url,
      content_type: entry.content_type,
      classification,
      target_route: exactStatic ? direct : null,
      localized_source_target: localized ? mapped : null,
      query_semantics: new URL(url).search
        ? querySupported
          ? 'approved static guidance; not query-to-binary'
          : 'not reproduced; path alone is not compatibility'
        : null,
      resolution: resolved
        ? !exactStatic && localized
          ? 'localized source; exact source path not implied'
          : 'exact static path'
        : null,
      referenced_by: [
        ...new Set(references.flatMap((r) => [...r.pages])),
      ].sort(),
    };
  });
  const internal = await parallel(
    [...refs.values()].filter((r) => r.url.startsWith(base + '/')),
    async (ref) => {
      const check = await probe(ref.url);
      if (new URL(ref.url).pathname.endsWith('.css') && check.body) {
        check.css_network_urls = [
          ...check.body.toString('utf8').matchAll(/url\(([^)]+)\)/g),
        ]
          .map((m) => m[1].replace(/^["']|["']$/g, '').trim())
          .filter((url) => !url.startsWith('data:'));
        // shortcut: current CSS has only inline data URLs; extend traversal if network dependencies appear.
        if (check.css_network_urls.length)
          throw new Error('CSS network references require extended traversal');
      }
      delete check.body;
      return check;
    },
  );
  const downloadChecks = await parallel(
    downloads.files.flatMap((f) =>
      [f.target_route, ...f.legacy_routes].map((route) => ({
        route,
        expected_sha256: f.sha256,
      })),
    ),
    async (file) => {
      const check = await probe(base + file.route, true);
      delete check.body;
      return {
        ...file,
        ...check,
        hash_matches: check.sha256 === file.expected_sha256,
      };
    },
  );
  const required = oldChecks.filter((r) => r.counterpart.status !== 200);
  const sourceChecks = await parallel(required, async (r) => {
    const check = await probe(r.legacy_url, r.kinds.includes('runtime'));
    delete check.body;
    return check;
  });
  const redirectTargets = await parallel(
    sourceChecks.filter((r) => r.status === 200 && r.final_url !== r.url),
    async (r) => {
      const url = new URL(r.final_url);
      const check = await probe(base + url.pathname + url.search);
      delete check.body;
      return {
        legacy_url: r.url,
        source_final_url: r.final_url,
        static_final_target: check,
      };
    },
  );
  const queryReceipts = await inspectRequiredDownloads(sourceChecks);
  const publishedHashes = new Set(compatibility.assets.map((a) => a.sha256));
  const requiredPayloads = queryReceipts.filter(
    (r) => r.response_is_binary && !publishedHashes.has(r.sha256),
  );
  const count = (field) =>
    Object.fromEntries(
      [...new Set(rows.map((r) => r[field]))]
        .sort()
        .map((k) => [k, rows.filter((r) => r[field] === k).length]),
    );
  const report = {
    observed_at: new Date().toISOString(),
    commit,
    deployment: run.url,
    scope:
      'References from current deployed HTML only; historical inventory is a discovery set, not evidence of current necessity. ORPHAN means unreferenced here, not approved deletion.',
    summary: {
      deployed_pages: pages.length,
      page_failures: pages.filter((p) => p.status !== 200).length,
      canonical_mismatch: pages.filter(
        (p) => p.status === 200 && p.canonical !== p.expected_canonical,
      ).length,
      inventory_urls: inventory.entries.length,
      classified_urls: rows.length,
      newly_discovered_current_urls:
        candidates.length - inventory.entries.length,
      classifications: count('classification'),
      old_origin_references: oldChecks.length,
      current_old_origin_failed_counterparts: required.length,
      required_unresolved_urls: required.filter(
        (r) =>
          !retired.has(pathKey(r.legacy_url)) &&
          pathKey(r.legacy_url) !== '/wp-admin',
      ).length,
      explicitly_retired_but_linked: required.filter((r) =>
        retired.has(pathKey(r.legacy_url)),
      ).length,
      obsolete_admin_navigation: required.filter(
        (r) => pathKey(r.legacy_url) === '/wp-admin',
      ).length,
      required_unresolved_runtime_assets: required.filter((r) =>
        r.kinds.includes('runtime'),
      ).length,
      internal_failed: internal.filter((r) => r.status !== 200).length,
      required_unpublished_download_payloads: requiredPayloads.length,
      query_source_non_binary: queryReceipts.filter(
        (r) => !r.response_is_binary,
      ).length,
      download_checks: downloadChecks.length,
      download_failures: downloadChecks.filter(
        (d) => d.status !== 200 || !d.hash_matches,
      ).length,
      unique_download_hashes: new Set(downloads.files.map((f) => f.sha256))
        .size,
      unpublished_owner_decision_assets: unknown.size,
      owner_decisions: rows.filter(
        (r) => r.classification === 'UNKNOWN_OWNER_DECISION',
      ).length,
    },
    previous_audit: {
      observed_at: previous.observed_at,
      summary: previous.summary,
      comparison_warning:
        'Historical required assets included old WordPress HTML references; reductions are not all physical migrations.',
    },
    previous_asset_discovery_reclassified: Object.fromEntries(
      [...new Set(rows.map((r) => r.classification))].map((classification) => [
        classification,
        previous.assets.filter((a) =>
          rows.some(
            (r) =>
              key(r.legacy_url) === key(a.legacy_url) &&
              r.classification === classification,
          ),
        ).length,
      ]),
    ),
    rows,
    old_origin_checks: oldChecks,
    required_source_checks: sourceChecks,
    source_redirect_targets: redirectTargets,
    required_downloads: queryReceipts.map((r) => ({
      ...r,
      payload_disposition: r.response_is_binary
        ? publishedHashes.has(r.sha256)
          ? 'ALREADY_RESOLVED'
          : 'REQUIRED_FOR_CUTOVER'
        : 'UNRESOLVED_SOURCE_NOT_A_FILE',
    })),
    firmware_media: await inspectFirmwareMedia(compatibility.assets),
    internal_failures: internal.filter((r) => r.status !== 200),
    stylesheets: internal.filter((r) => r.css_network_urls),
    downloads: downloadChecks,
    pages: pages.map((page) => ({ ...page, references: undefined })),
  };
  await writeFile(
    'docs/audits/current-legacy-reaudit.json',
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(JSON.stringify(report.summary, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await audit();
