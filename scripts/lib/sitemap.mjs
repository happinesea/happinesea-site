import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import sanitizeHtml from 'sanitize-html';
import {
  XMLToSitemapItemStream,
  XMLToSitemapIndexStream,
  ErrorLevel,
} from 'sitemap';

async function parseXml(xml, Parser, root) {
  const entries = [];
  const parser = new Parser({ level: ErrorLevel.THROW });
  parser.saxStream.once('opentag', (tag) => {
    assert.equal(tag.name, root, 'Sitemap XML root');
    assert.equal(
      tag.uri,
      'http://www.sitemaps.org/schemas/sitemap/0.9',
      'Sitemap XML namespace',
    );
  });
  await pipeline(Readable.from([xml]), parser, async (source) => {
    for await (const entry of source) entries.push(entry);
  });
  return entries;
}

export function canonicalSitemapEntry(html, base) {
  const canonicals = [];
  let noindex = false;
  const headEnd = html.search(/<\/head\s*>/i);
  assert(headEnd >= 0, 'HTML head missing');
  sanitizeHtml(html.slice(0, headEnd), {
    allowedTags: ['link', 'meta'],
    transformTags: {
      link: (tag, attrs) => {
        if (attrs.rel?.toLowerCase() === 'canonical')
          canonicals.push(attrs.href);
        return { tagName: tag, attribs: attrs };
      },
      meta: (tag, attrs) => {
        if (
          /^(robots|googlebot)$/i.test(attrs.name ?? '') &&
          /(?:^|[\s,])(noindex|none)(?:$|[\s,])/i.test(attrs.content ?? '')
        )
          noindex = true;
        return { tagName: tag, attribs: attrs };
      },
    },
  });
  if (noindex) return;
  assert.equal(
    canonicals.length,
    1,
    'Indexable HTML needs exactly one canonical',
  );
  const url = new URL(canonicals[0]);
  const publication = new URL(base);
  if (
    url.origin !== publication.origin ||
    !url.pathname.startsWith(publication.pathname)
  )
    return;
  const path = url.pathname.slice(publication.pathname.length);
  if (
    url.search ||
    url.hash ||
    /^(?:happinesea-site\/|wp-(?:admin|json|login)|(?:test|staging|preview|internal)(?:\/|$)|404(?:\.|\/|$)|500(?:\.|\/|$))/.test(
      path,
    )
  )
    return;
  return url.href;
}

export async function sitemapHtml(dir, url, base) {
  const relative = decodeURIComponent(
    new URL(url).pathname.slice(new URL(base).pathname.length),
  );
  assert(!relative.split('/').includes('..'), 'Unsafe sitemap path');
  const path =
    relative.endsWith('/') || relative === ''
      ? `${relative}index.html`
      : relative;
  try {
    return await readFile(join(dir, path), 'utf8');
  } catch (error) {
    if (!['ENOENT', 'EISDIR'].includes(error.code)) throw error;
    return readFile(join(dir, relative, 'index.html'), 'utf8');
  }
}

export function sitemapSerializer(dir, base) {
  const seen = new Set();
  return async (item) => {
    const url = canonicalSitemapEntry(
      await sitemapHtml(dir, item.url, base),
      base,
    );
    if (!url || seen.has(url)) return;
    seen.add(url);
    return { ...item, url };
  };
}

export async function verifySitemap(dir, base) {
  const indexXml = await readFile(join(dir, 'sitemap-index.xml'), 'utf8');
  const index = await parseXml(
    indexXml,
    XMLToSitemapIndexStream,
    'sitemapindex',
  );
  assert(index.length > 0, 'Empty sitemap index');
  const urls = new Set();
  for (const entry of index) {
    const chunk = new URL(entry.url);
    assert.equal(chunk.origin, new URL(base).origin, 'Sitemap chunk origin');
    assert(chunk.href.startsWith(base), 'Sitemap chunk base');
    const xml = await readFile(
      join(dir, chunk.pathname.slice(new URL(base).pathname.length)),
      'utf8',
    );
    const items = await parseXml(xml, XMLToSitemapItemStream, 'urlset');
    assert(items.length > 0, 'Empty sitemap');
    for (const item of items) {
      assert.equal(
        new URL(item.url).origin,
        new URL(base).origin,
        'Sitemap URL origin',
      );
      assert(!urls.has(item.url), `Duplicate sitemap URL: ${item.url}`);
      assert.equal(
        canonicalSitemapEntry(await sitemapHtml(dir, item.url, base), base),
        item.url,
        `Noncanonical/noindex sitemap URL: ${item.url}`,
      );
      assert(
        !item.lastmod &&
          !item.changefreq &&
          !item.priority &&
          !item.links?.length,
        'Unverified SEO metadata',
      );
      urls.add(item.url);
    }
  }
  let excluded = 0;
  let indexableHtml = 0;
  for (const path of await readdir(dir, { recursive: true })) {
    if (!path.endsWith('.html') || /(^|[\\/])(404|500)\.html$/.test(path))
      continue;
    const canonical = canonicalSitemapEntry(
      await readFile(join(dir, path), 'utf8'),
      base,
    );
    if (canonical) {
      indexableHtml++;
      assert(
        urls.has(canonical),
        `Canonical missing from sitemap: ${canonical}`,
      );
    } else excluded++;
  }
  const robots = await readFile(join(dir, 'robots.txt'), 'utf8');
  assert.deepEqual(
    robots.match(/^Sitemap: .*$/gm),
    [`Sitemap: ${base}sitemap-index.xml`],
    'robots sitemap origin/count',
  );
  assert(
    /^User-agent: \*\s+Allow: \/\s/m.test(robots),
    'Public crawling remains allowed',
  );
  return {
    urls: urls.size,
    excluded,
    duplicateCanonicalPages: indexableHtml - urls.size,
    chunks: index.length,
  };
}
