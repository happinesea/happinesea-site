import assert from 'node:assert/strict';

export function assertSafeRuntime(ref, base, mode) {
  if (ref.kind !== 'runtime') return;
  const url = new URL(ref.url);
  const pathname = decodeURIComponent(url.pathname);
  const legacy = /^(www\.)?happinesea\.com$/.test(url.hostname);
  const liveStatic =
    mode === 'production' &&
    url.origin === 'https://happinesea.com' &&
    url.origin === new URL(base).origin;
  assert(
    !(
      /cms\.happinesea\.com/.test(url.hostname) ||
      /\/wp-(json|admin)(\/|$)/i.test(pathname) ||
      /\.php(?:\/|$)/i.test(pathname) ||
      (legacy && url.search) ||
      (legacy && !liveStatic)
    ),
    `unsafe/old-origin runtime: ${ref.url}`,
  );
}
