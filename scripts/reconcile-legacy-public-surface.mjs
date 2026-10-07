import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';
import { cutoverSummary } from './lib/legacy-public-surface.mjs';

export async function reconcileArticleRoutes(
  snapshot,
  manifest,
  dist,
  baseline,
) {
  const active = manifest.articles.filter(
    ({ id }) => !manifest.withdrawals.some((item) => item.id === id),
  );
  if (active.length !== manifest.expected_count)
    throw new Error('article count mismatch');
  const seen = new Set();
  // Preflight all aliases before mutating the inventory; files are evidence, not HTTP probes.
  const plan = await Promise.all(
    active.map(async (article) => {
      if (
        !/^https:\/\/happinesea\.com\/(?:[a-z0-9-]+\/)+\d+\.html$/.test(
          article.canonical,
        )
      )
        throw new Error('unsafe canonical');
      const path = new URL(article.canonical).pathname;
      const slug = decodeURIComponent(article.slug);
      if (
        !slug ||
        /[/\\]/.test(slug) ||
        slug === '.' ||
        slug === '..' ||
        article.route !== `/insights/${article.slug}/` ||
        seen.has(path)
      )
        throw new Error('invalid article route');
      seen.add(path);
      const entry = snapshot.entries.find(
        ({ legacy_url }) => legacy_url === article.canonical,
      );
      if (!entry || entry.canonical !== article.canonical)
        throw new Error('missing or drifted source canonical');
      const source = await readFile(
        join(dist, 'insights', slug, 'index.html'),
        'utf8',
      );
      const alias = await readFile(join(dist, path.slice(1)), 'utf8');
      const canonicalTags = [
        ...alias.matchAll(
          /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/gi,
        ),
      ];
      if (
        source !== alias ||
        canonicalTags.length !== 1 ||
        canonicalTags[0][1] !== article.canonical
      )
        throw new Error('legacy output or canonical mismatch');
      return { article, path, entry };
    }),
  );
  for (const { article, path, entry } of plan) {
    entry.target_route = path;
    entry.publication_route = article.route;
    entry.migration_status = 'READY';
    entry.redirect_required = false;
    entry.static_output = 'VERIFIED';
    entry.notes = entry.notes.filter(
      (note) =>
        !note.startsWith('Article generated at target_route;') &&
        !note.startsWith('Article readiness ') &&
        !note.startsWith('Exact legacy HTML verified:'),
    );
    entry.notes.push(
      `Exact legacy HTML verified: ${path}; byte-identical to ${article.route}, canonical retained, no redirect. Source HTTP status is a separate observation.`,
    );
  }
  snapshot.baseline_commit = baseline;
  snapshot.reconciled_at = new Date().toISOString();
  snapshot.migration = {
    migrated_articles: active.length,
    exact_legacy_html_routes: plan.length,
  };
  snapshot.summary = cutoverSummary(snapshot.entries);
  return snapshot;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const path = join(root, 'src/data/legacy-public-surface.json');
  const snapshot = JSON.parse(await readFile(path, 'utf8'));
  const manifest = JSON.parse(
    await readFile(
      join(root, 'src/data/wordpress-insight-manifest.json'),
      'utf8',
    ),
  );
  execFileSync('git', ['merge-base', '--is-ancestor', 'origin/main', 'HEAD'], {
    cwd: root,
  });
  const baseline = execFileSync('git', ['rev-parse', 'origin/main'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  await reconcileArticleRoutes(
    snapshot,
    manifest,
    join(root, 'dist'),
    baseline,
  );
  await writeFile(
    path,
    await format(JSON.stringify(snapshot), { parser: 'json' }),
  );
  console.log(
    JSON.stringify(
      { migration: snapshot.migration, summary: snapshot.summary },
      null,
      2,
    ),
  );
}
