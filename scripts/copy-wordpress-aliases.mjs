import { constants } from 'node:fs';
import { access, copyFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function copyWordpressAliases(manifest, dist) {
  const withdrawn = new Set(manifest.withdrawals.map(({ id }) => id));
  const active = manifest.articles.filter(({ id }) => !withdrawn.has(id));
  if (manifest.expected_count !== active.length)
    throw new Error('legacy alias active count mismatch');
  const ids = new Set();
  const targets = new Set();
  const sources = new Set();
  const plan = active.map((article) => {
    if (
      !/^https:\/\/happinesea\.com\/(?:[a-z0-9-]+\/)+\d+\.html$/.test(
        article.canonical,
      )
    )
      throw new Error(
        `unsafe canonical for legacy alias: ${article.canonical}`,
      );
    const slug = decodeURIComponent(article.slug);
    if (!slug || /[/\\]/.test(slug) || slug === '.' || slug === '..')
      throw new Error(`unsafe legacy alias slug: ${article.slug}`);
    if (article.route !== `/insights/${article.slug}/`)
      throw new Error(`invalid legacy alias source route: ${article.route}`);
    const pathname = new URL(article.canonical).pathname;
    if (ids.has(article.id) || targets.has(pathname) || sources.has(slug))
      throw new Error(`duplicate legacy alias: ${article.id}`);
    ids.add(article.id);
    targets.add(pathname);
    sources.add(slug);
    return {
      source: join(dist, 'insights', slug, 'index.html'),
      target: join(dist, pathname.slice(1)),
    };
  });
  for (const { source, target } of plan) {
    await access(source);
    try {
      await access(target);
      throw new Error(`legacy alias collision: ${target}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  for (const { source, target } of plan) {
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target, constants.COPYFILE_EXCL);
  }
  return plan.length;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const manifest = JSON.parse(
    await readFile(
      join(root, 'src/data/wordpress-insight-manifest.json'),
      'utf8',
    ),
  );
  const count = await copyWordpressAliases(manifest, join(root, 'dist'));
  console.log(`Copied ${count} exact static WordPress article aliases.`);
}
