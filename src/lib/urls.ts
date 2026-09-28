const DEFAULT_BASE = import.meta.env?.BASE_URL ?? '/';

function normalizePath(pathname: string): string {
  const trailingSlash = pathname.endsWith('/');
  const segments = pathname.split('/').filter(Boolean).join('/');

  if (!segments) return '/';
  return `/${segments}${trailingSlash ? '/' : ''}`;
}

export function withBase(pathname: string, base = DEFAULT_BASE): string {
  const value = pathname.trim();
  if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//')) {
    throw new TypeError(
      'withBase expects an internal path, not an external URL',
    );
  }

  const suffixAt = value.search(/[?#]/);
  const path = suffixAt === -1 ? value : value.slice(0, suffixAt);
  const suffix = suffixAt === -1 ? '' : value.slice(suffixAt);
  const route = normalizePath(path);
  const basePath = normalizePath(base);

  if (basePath === '/') return `${route}${suffix}`;
  if (route === '/') return `${basePath}${suffix}`;
  return `${basePath.replace(/\/$/, '')}${route}${suffix}`;
}

export function canonicalUrl(
  pathname: string,
  site = import.meta.env?.SITE ? new URL(import.meta.env.SITE) : undefined,
  base = DEFAULT_BASE,
): string {
  if (!site)
    throw new TypeError('canonicalUrl requires Astro site configuration');
  return new URL(withBase(pathname, base), site).toString();
}
