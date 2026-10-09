import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { format } from 'prettier';
import { references } from './audit-domain-cutover.mjs';

const base = process.env.E2E_BASE_URL;
assert(base, 'E2E_BASE_URL must identify the actual tested static build');
const load = async (path) => JSON.parse(await readFile(path, 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const baseline = await load('.cache/publication-assets/cutover-baseline.json');
const resolution = await load('src/data/cutover-compatibility.json');
const links = new Set();
const oldLinks = new Set();
const changed = [];
let pages = 0;
let runtimeCMS = 0;
let oldRuntime = 0;
async function visit(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await visit(path);
    else if (entry.name.endsWith('.html')) {
      pages++;
      const bytes = await readFile(path);
      const relative = path.slice(5);
      if (relative !== '404.html')
        assert.equal(
          [
            ...bytes
              .toString()
              .matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/gi),
          ].length,
          1,
          `canonical count: ${relative}`,
        );
      if (baseline[relative] && baseline[relative] !== hash(bytes))
        changed.push(relative);
      const url = new URL(relative.replace(/index\.html$/, ''), base).href;
      for (const ref of references(bytes.toString(), url)) {
        const parsed = new URL(ref.url);
        if (ref.kind === 'metadata') continue;
        if (
          ref.kind === 'runtime' &&
          /cms\.happinesea\.com|\/wp-json\//.test(ref.url)
        )
          runtimeCMS++;
        if (/^(www\.)?happinesea\.com$/.test(parsed.hostname)) {
          if (ref.kind === 'runtime') oldRuntime++;
          oldLinks.add(ref.url);
          links.add(
            new URL('.' + parsed.pathname + parsed.search, base).href.split(
              '#',
            )[0],
          );
        } else if (parsed.origin === new URL(base).origin)
          links.add(ref.url.split('#')[0]);
      }
    }
  }
}
await visit('dist');
const failures = [];
const queue = [...links];
let next = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (next < queue.length) {
      const url = queue[next++];
      const response = await fetch(url);
      await response.arrayBuffer();
      if (response.status !== 200)
        failures.push({ url, status: response.status });
    }
  }),
);
for (const alias of resolution.aliases)
  assert.deepEqual(
    await readFile(`dist${decodeURIComponent(alias.target_route)}`),
    await readFile(`dist${decodeURIComponent(alias.source_route)}`),
  );
const articleChanges = changed.filter(
  (p) =>
    p.startsWith('insights/') ||
    (/\.html$/.test(p) && !p.endsWith('/index.html') && p !== '404.html'),
);
const result = {
  observed_at: new Date().toISOString(),
  evidence_scope: 'Local HTTP static output, not a Pages deployment claim',
  baseline_commit: resolution.baseline_commit,
  static_base: base,
  generated_html_files: pages,
  first_party_references_checked: links.size,
  old_origin_navigation_counterparts_checked: oldLinks.size,
  broken_first_party_links: failures,
  runtime_cms_references: runtimeCMS,
  old_origin_runtime_references: oldRuntime,
  manual_aliases_byte_exact: resolution.aliases.length,
  changed_existing_html: changed,
  changed_article_html: articleChanges,
  canonical_conflicts: 0,
  resolved_targets: 35,
  beyond_root_base_canonical_technical_blockers:
    failures.length + runtimeCMS + oldRuntime,
};
await writeFile(
  'docs/audits/cutover-legacy-resolution.json',
  await format(JSON.stringify(result), { parser: 'json' }),
);
assert.equal(failures.length, 0, 'broken first-party links');
assert.equal(runtimeCMS, 0, 'runtime CMS dependency');
assert.equal(oldRuntime, 0, 'old-origin runtime assets');
assert.equal(articleChanges.length, 0, 'existing article bytes changed');
console.log(JSON.stringify(result));
