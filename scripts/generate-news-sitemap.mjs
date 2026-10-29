import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import YAML from 'yaml';
import { canonicalSitemapEntry } from './lib/sitemap.mjs';

// Google News lists only recently published articles, not every historical article.
const production = process.env.PUBLICATION_MODE === 'production';
const base = production ? 'https://happinesea.com/' : 'https://happinesea.github.io/happinesea-site/';
const now = Date.now();
const newsWindow = 48 * 60 * 60 * 1000;
const escapeXml = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const entries = [];
for (const folder of ['src/content/articles', 'src/content/insights']) {
  for (const filename of await readdir(folder)) {
    if (!/\\.mdx?$/.test(filename)) continue;
    const raw = await readFile(join(folder, filename), 'utf8');
    const frontmatter = raw.match(/^---\\s*\\r?\\n([\\s\\S]*?)\\r?\\n---/);
    if (!frontmatter) continue;
    const data = YAML.parse(frontmatter[1]);
    if (data.content_status !== 'published') continue;
    const published = new Date(data.published_at);
    if (!Number.isFinite(published.getTime())) throw Error('Invalid published_at: ' + filename);
    if (published.getTime() > now || now - published.getTime() > newsWindow) continue;
    const path = 'insights/' + encodeURIComponent(data.slug) + '/';
    const html = await readFile(join('dist', path, 'index.html'), 'utf8');
    const url = canonicalSitemapEntry(html, base);
    if (!url || url !== new URL(path, base).href) continue;
    entries.push({ url, title: data.title, date: published.toISOString() });
  }
}
entries.sort((a, b) => b.date.localeCompare(a.date));
if (entries.length > 1000) throw Error('News sitemap exceeds 1000 entries');
const xml = '<?xml version="1.0" encoding="UTF-8"?>\\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\\n' +
  entries.map(({ url, title, date }) =>
    '  <url><loc>' + escapeXml(url) + '</loc><news:news><news:publication><news:name>happinesea hobby</news:name><news:language>ja</news:language></news:publication><news:publication_date>' +
    escapeXml(date) + '</news:publication_date><news:title>' + escapeXml(title) + '</news:title></news:news></url>').join('\\n') +
  '\\n</urlset>\\n';
await writeFile('dist/news-sitemap.xml', xml);
console.log('News sitemap: ' + entries.length + ' recent published articles');
