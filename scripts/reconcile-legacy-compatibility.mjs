import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';
import { finalizeLegacyOutputs } from './lib/legacy-compatibility.mjs';
import {
  cutoverSummary,
  sameCanonical,
  surfaceType,
} from './lib/legacy-public-surface.mjs';
import { reconcileArticleRoutes } from './reconcile-legacy-public-surface.mjs';

const root = new URL('../', import.meta.url);
const load = async (name) =>
  JSON.parse(await readFile(new URL(`src/data/${name}.json`, root), 'utf8'));
const audit = await load('legacy-public-surface');
const compatibility = await load('legacy-compatibility');
const manifest = await load('wordpress-insight-manifest');
const dist = fileURLToPath(new URL('dist/', root));
const baseline = execFileSync('git', ['rev-parse', 'origin/main'], {
  cwd: fileURLToPath(root),
  encoding: 'utf8',
}).trim();
await finalizeLegacyOutputs(compatibility, dist);
await reconcileArticleRoutes(audit, manifest, dist, baseline);

function entryFor(url, type) {
  let entry = audit.entries.find((item) => sameCanonical(item.legacy_url, url));
  if (!entry) {
    entry = {
      legacy_url: url,
      content_type: type,
      current_status: 'UNVERIFIED',
      source: ['Public legacy compatibility capture'],
      target_route: null,
      canonical: null,
      migration_status: 'NEEDS_REVIEW',
      redirect_required: false,
      asset_dependencies: [],
      notes: [],
    };
    audit.entries.push(entry);
  }
  return entry;
}

for (const page of compatibility.pages) {
  const entry = entryFor(page.source_url, page.type);
  Object.assign(entry, {
    current_status: page.http_status,
    canonical: page.canonical,
    target_route: page.target_route,
    migration_status: 'READY',
    static_output: 'VERIFIED',
    redirect_required: false,
  });
  entry.notes = entry.notes.filter(
    (note) =>
      !note.startsWith('Article readiness ') &&
      !note.startsWith('Compatibility verified:'),
  );
  entry.notes.push(
    'Compatibility verified: exact source canonical retained; local static HTML and assets verified. Source HTTP observation retained from capture.',
  );
}
for (const asset of compatibility.assets) {
  const query = new URL(asset.source_url).searchParams.has('wpdmdl');
  const fileSource = query ? asset.final_url : asset.source_url;
  if (new URL(fileSource).pathname.startsWith('/wp-content/')) {
    const entry = entryFor(fileSource, surfaceType(fileSource));
    Object.assign(entry, {
      current_status: asset.http_status,
      target_route: asset.target_route,
      migration_status: 'READY',
      static_output: 'VERIFIED',
      sha256: asset.sha256,
      content_type_header: asset.content_type,
      received_bytes: asset.received_bytes,
    });
  }
  if (query) {
    const entry = entryFor(asset.source_url, 'download_query');
    entry.current_status = asset.http_status;
    entry.target_route = asset.target_route;
    entry.notes = [
      'Browser-only handoff to verified local bytes. Static hosting cannot return query-dependent file bytes to non-JavaScript HTTP clients; compatibility decision remains open.',
    ];
  }
}
for (const item of compatibility.blocked) {
  const entry = entryFor(item.source_url, surfaceType(item.source_url));
  entry.migration_status = 'BLOCKED';
  entry.target_route = null;
  if (item.http_status) entry.current_status = item.http_status;
  entry.notes = entry.notes.filter(
    (note) => !note.startsWith('Compatibility blocked:'),
  );
  entry.notes.push(`Compatibility blocked: ${item.reason}`);
}
const drawingIds = compatibility.pages
  .filter((page) => page.type === 'drawing')
  .map((page) => page.id);
audit.migration = {
  migrated_articles: manifest.expected_count + drawingIds.length,
  insight_articles: manifest.expected_count,
  drawing_articles: drawingIds.length,
  exact_legacy_html_routes: manifest.expected_count + drawingIds.length,
};
audit.compatibility = {
  verified_pages: compatibility.pages.length,
  drawing_ids: drawingIds,
  verified_unique_asset_paths: new Set(
    compatibility.assets.map((asset) => asset.target_route),
  ).size,
  blocked: compatibility.blocked.length,
  query_downloads: 'BROWSER_ONLY; NON_JS_HTTP_COMPATIBILITY_OPEN',
};
audit.summary = cutoverSummary(audit.entries);
await writeFile(
  new URL('src/data/legacy-public-surface.json', root),
  await format(JSON.stringify(audit), { parser: 'json' }),
);
console.log(
  JSON.stringify(
    {
      migration: audit.migration,
      compatibility: audit.compatibility,
      summary: audit.summary,
    },
    null,
    2,
  ),
);
