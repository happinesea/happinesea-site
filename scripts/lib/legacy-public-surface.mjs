export function sameCanonical(a, b) {
  const normalized = (value) =>
    new URL(value).href.replace(/%[0-9a-f]{2}/gi, (escape) =>
      escape.toUpperCase(),
    );
  return normalized(a) === normalized(b);
}

export function publicUrls(html, base) {
  const urls = new Set();
  const values = [
    ...String(html).matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi),
  ].map((match) => match[1]);
  for (const [, srcset] of String(html).matchAll(
    /\bsrcset\s*=\s*["']([^"']+)["']/gi,
  ))
    values.push(
      ...srcset.split(',').map((value) => value.trim().split(/\s+/)[0]),
    );
  for (const value of values) {
    if (!value || value.startsWith('#')) continue;
    try {
      const url = new URL(value.replaceAll('&amp;', '&'), base);
      if (
        url.hostname !== 'happinesea.com' ||
        !['http:', 'https:'].includes(url.protocol)
      )
        continue;
      if (/^\/(?:wp-admin|wp-json|wp-login\.php)(?:\/|$|\?)/.test(url.pathname))
        continue;
      if (
        /\.(?:css|js|xml|ico|woff2?|ttf)$/i.test(url.pathname) ||
        /\/feed\/?$/.test(url.pathname)
      )
        continue;
      url.hash = '';
      urls.add(url.href);
    } catch {
      /* Invalid source URL is not a publishable target. */
    }
  }
  return [...urls];
}

export function surfaceType(value) {
  const path = new URL(value).pathname;
  if (
    /\.(?:pdf|dxf|dwg|cad|zip|rar|7z|stl|step|stp|igs|iges|docx?|xlsx?)$/i.test(
      path,
    )
  )
    return 'download';
  if (/\.(?:png|jpe?g|gif|webp|avif|svg|bmp)$/i.test(path)) return 'image';
  if (/^\/download\//.test(path)) return 'download_endpoint';
  if (path.includes('drawinglibrary')) return 'drawing_library';
  if (path.includes('drone-rc-glossary')) return 'glossary';
  if (/faq/i.test(path)) return 'faq';
  return 'page';
}

export function cutoverSummary(entries) {
  const count = (predicate) => entries.filter(predicate).length;
  const unresolved = count(
    (entry) =>
      entry.migration_status !== 'READY' &&
      entry.migration_status !== 'EXTERNAL_KEEP',
  );
  return {
    total_urls: entries.length,
    by_type: Object.fromEntries(
      [...new Set(entries.map((entry) => entry.content_type))]
        .sort()
        .map((type) => [type, count((entry) => entry.content_type === type)]),
    ),
    preserved_routes: count((entry) => entry.migration_status === 'READY'),
    redirect_required: count((entry) => entry.migration_status === 'REDIRECT'),
    blocked: count((entry) => entry.migration_status === 'BLOCKED'),
    old_domain_only_assets: count(
      (entry) =>
        ['image', 'download'].includes(entry.content_type) &&
        entry.migration_status !== 'READY',
    ),
    broken_links: count(
      (entry) =>
        typeof entry.current_status === 'number' && entry.current_status >= 400,
    ),
    missing_downloads: count(
      (entry) =>
        entry.content_type === 'download' &&
        typeof entry.current_status === 'number' &&
        entry.current_status >= 400,
    ),
    unverified: count((entry) => entry.current_status === 'UNVERIFIED'),
    canonical_conflicts: count((entry) =>
      entry.notes.some((note) => note.startsWith('canonical conflict:')),
    ),
    orphan_page_candidates: count(
      (entry) =>
        entry.content_type === 'attachment' &&
        entry.source.every((source) => source.startsWith('REST media')),
    ),
    unresolved_surfaces: unresolved,
    domain_cutover:
      unresolved ||
      entries.some((entry) =>
        entry.notes.some((note) => note.startsWith('canonical conflict:')),
      ) ||
      count(
        (entry) =>
          entry.current_status === 'UNVERIFIED' || entry.current_status >= 400,
      )
        ? 'NOT READY'
        : 'READY',
  };
}
