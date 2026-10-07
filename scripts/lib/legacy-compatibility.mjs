import { sanitizeArticleHtml } from './wordpress-publication.mjs';
import { createHash } from 'node:crypto';
import { readFile, rename, rmdir, stat } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { sameCanonical } from './legacy-public-surface.mjs';

// Caller must verify the static outputs before supplying verifiedPages.
export function reconcileObservedVariants(entries, verifiedPages) {
  for (const entry of entries) {
    if (
      entry.current_status !== 200 ||
      !['READY_AS_IS', 'MIGRATE_STATIC', 'ARCHIVE_COMPAT'].includes(
        entry.compatibility_class,
      )
    )
      continue;
    if (
      !verifiedPages.some(
        (page) =>
          page.target_route === entry.target_route &&
          entry.canonical &&
          sameCanonical(page.canonical, entry.canonical),
      )
    )
      continue;
    entry.migration_status = 'READY';
    entry.static_output = 'VERIFIED';
  }
}

export function downloadFilename(value) {
  const name = decodeURIComponent(value ?? '');
  if (
    !name ||
    name === '.' ||
    name === '..' ||
    // eslint-disable-next-line no-control-regex -- reject filesystem control characters at the source boundary
    /[\x00-\x1f\x7f/\\:"<>|?*]/.test(name) ||
    /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name) ||
    /[. ]$/.test(name)
  )
    throw new Error('download filename missing/unsafe');
  return name;
}

export function assetPath(source) {
  const url = new URL(source);
  if (url.origin !== 'https://happinesea.com')
    throw new Error('unsupported asset origin');
  const path = decodeURIComponent(url.pathname);
  if (
    !path.startsWith('/wp-content/') ||
    path.includes('\\') ||
    path.split('/').includes('..') ||
    path
      .slice('/wp-content/'.length)
      .split('/')
      .some((segment) => {
        try {
          downloadFilename(encodeURIComponent(segment));
          return false;
        } catch {
          return true;
        }
      })
  )
    throw new Error('unsafe asset path');
  return path;
}

export function entryContent(html, className = 'entry-content') {
  const opening = new RegExp(
    `<div\\b[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`,
    'i',
  ).exec(html);
  if (!opening) throw new Error('entry-content missing');
  const start = opening.index + opening[0].length;
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = start;
  let depth = 1;
  for (let tag; (tag = tags.exec(html));) {
    depth += /^<\//.test(tag[0]) ? -1 : 1;
    if (!depth) return html.slice(start, tag.index);
  }
  throw new Error('entry-content unclosed');
}

export function prepareLegacyHtml(html, images, downloads) {
  const value = html.replaceAll(
    /<a\b[^>]*\bdata-downloadurl=["']([^"']+)["'][^>]*>/gi,
    (tag, source) => {
      const url = new URL(source.replaceAll('&amp;', '&'));
      if (url.origin !== 'https://happinesea.com')
        throw new Error('unsupported download origin');
      const target = downloads.get(url.searchParams.get('wpdmdl'));
      if (!target) throw new Error(`unresolved download: ${url.pathname}`);
      return tag.replace(/\bhref=["'][^"']*["']/i, `href="${target}"`);
    },
  );
  return sanitizeArticleHtml(value, images, { preserveAnchors: true });
}

export async function finalizeLegacyOutputs(snapshot, dist) {
  const file = (route) => {
    if (
      !route.startsWith('/') ||
      route.includes('\\') ||
      route.split('/').includes('..')
    )
      throw new Error(`unsafe compatibility path: ${route}`);
    const path = resolve(dist, `.${decodeURIComponent(route)}`);
    if (!path.startsWith(resolve(dist) + sep))
      throw new Error('compatibility path escapes output');
    return path;
  };
  const targets = new Set();
  const conversions = [];
  for (const page of snapshot.pages) {
    if (targets.has(page.target_route))
      throw new Error('duplicate compatibility route');
    targets.add(page.target_route);
    const path = file(page.target_route);
    const isFile = (await stat(path)).isFile();
    const html = await readFile(
      isFile ? path : join(path, 'index.html'),
      'utf8',
    );
    if (!isFile && page.target_route.endsWith('.html')) conversions.push(path);
    const canonical = [
      ...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/gi),
    ];
    if (canonical.length !== 1 || canonical[0][1] !== page.canonical)
      throw new Error(`canonical drift: ${page.target_route}`);
  }
  for (const asset of snapshot.assets) {
    const bytes = await readFile(file(asset.target_route));
    if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256)
      throw new Error(`asset checksum drift: ${asset.target_route}`);
  }
  for (const path of conversions) {
    // Astro directory output -> exact legacy file. rmdir refuses unexpected children.
    await rename(join(path, 'index.html'), `${path}.tmp`);
    await rmdir(path);
    await rename(`${path}.tmp`, path);
  }
}
