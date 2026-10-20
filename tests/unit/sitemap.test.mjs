import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  canonicalSitemapEntry,
  sitemapSerializer,
  sitemapHtml,
  verifySitemap,
} from '../../scripts/lib/sitemap.mjs';

const base = 'https://happinesea.com/';
const html = (canonical, robots = '') =>
  `<html><head><link rel="canonical" href="${canonical}"><meta name="robots" content="${robots}"></head><body>Article</body></html>`;

test('slashless legacy canonical resolves directory index without changing its URL', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'sitemap-slashless-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'fixed-page'));
  const page = html(`${base}fixed-page`);
  await writeFile(join(dir, 'fixed-page/index.html'), page);
  assert.equal(await sitemapHtml(dir, `${base}fixed-page`, base), page);
  assert.deepEqual(
    await sitemapSerializer(dir, base)({ url: `${base}fixed-page/` }),
    { url: `${base}fixed-page` },
  );
});

test('new canonical article is selected without a manually maintained URL list', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'sitemap-new-article-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'insights/new'), { recursive: true });
  await writeFile(
    join(dir, 'insights/new/index.html'),
    html(`${base}insights/new/`),
  );
  assert.deepEqual(
    await sitemapSerializer(dir, base)({ url: `${base}insights/new/` }),
    { url: `${base}insights/new/` },
  );
  assert.equal(
    canonicalSitemapEntry(html(`${base}legacy/article.html`), base),
    `${base}legacy/article.html`,
  );
});

test('noindex, CMS, staging and withdrawn/utility pages cannot enter production sitemap', () => {
  for (const [canonical, robots] of [
    [`${base}notice/`, 'NOINDEX,follow'],
    [`${base}notice/`, 'none'],
    ['https://cms.happinesea.com/article/', ''],
    ['https://happinesea.github.io/happinesea-site/article/', ''],
    [`${base}happinesea-site/article/`, ''],
    [`${base}wp-admin/`, ''],
    [`${base}preview/article/`, ''],
    [`${base}internal/tool/`, ''],
    [`${base}404.html`, ''],
  ])
    assert.equal(
      canonicalSitemapEntry(html(canonical, robots), base),
      undefined,
    );
  assert.equal(
    canonicalSitemapEntry(
      html(`${base}notice/`, 'noindex').replace(
        'name="robots"',
        'name="googlebot"',
      ),
      base,
    ),
    undefined,
  );
});

test('all content kinds auto-select new pages and missing canonicals fail the build gate', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'sitemap-content-kinds-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const paths = [
    'radiolink/new-product/',
    'manuals/new-manual/chapter-01/',
    'drawinglibrary/new-drawing/',
    'downloads/new-guide/',
    'drone-rc-glossary/',
    'support/new-faq/',
    'insights/new-git-article/',
    'new-static-page/',
  ];
  const serialize = sitemapSerializer(dir, base);
  const entries = [];
  for (const path of paths) {
    await mkdir(join(dir, path), { recursive: true });
    await writeFile(join(dir, path, 'index.html'), html(base + path));
    entries.push(await serialize({ url: base + path }));
  }
  assert.deepEqual(
    entries.map((entry) => entry.url),
    paths.map((path) => base + path),
  );
  await mkdir(join(dir, 'unpublished'));
  await writeFile(
    join(dir, 'unpublished/index.html'),
    html(base + 'unpublished/', 'noindex'),
  );
  assert.equal(await serialize({ url: base + 'unpublished/' }), undefined);
  await writeFile(
    join(dir, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${base}sitemap-index.xml\n`,
  );
  await writeFile(
    join(dir, 'sitemap-index.xml'),
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${base}sitemap-0.xml</loc></sitemap></sitemapindex>`,
  );
  const writeSitemap = (items) =>
    writeFile(
      join(dir, 'sitemap-0.xml'),
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items.map(({ url }) => `<url><loc>${url}</loc></url>`).join('')}</urlset>`,
    );
  await writeSitemap(entries);
  assert.equal((await verifySitemap(dir, base)).urls, paths.length);
  for (const missing of entries) {
    await writeSitemap(entries.filter((entry) => entry !== missing));
    await assert.rejects(
      verifySitemap(dir, base),
      /Canonical missing from sitemap/,
    );
  }
});

test('finalized sitemap rejects noncanonical aliases, missing targets, duplicates and noindex', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'sitemap-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'article'));
  await mkdir(join(dir, 'alias'));
  await writeFile(join(dir, 'article/index.html'), html(`${base}article/`));
  await writeFile(join(dir, 'alias/index.html'), html(`${base}article/`));
  const serialize = sitemapSerializer(dir, base);
  assert.deepEqual(await serialize({ url: `${base}article/` }), {
    url: `${base}article/`,
  });
  assert.equal(await serialize({ url: `${base}alias/` }), undefined);
  await writeFile(
    join(dir, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${base}sitemap-index.xml\n`,
  );
  await writeFile(
    join(dir, 'sitemap-index.xml'),
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${base}sitemap-0.xml</loc></sitemap></sitemapindex>`,
  );
  const sitemap = async (urls) =>
    writeFile(
      join(dir, 'sitemap-0.xml'),
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${url}</loc></url>`).join('')}</urlset>`,
    );
  await sitemap([`${base}article/`]);
  assert.equal((await verifySitemap(dir, base)).urls, 1);
  for (const urls of [
    [`${base}alias/`],
    [`${base}missing/`],
    [`${base}article/`, `${base}article/`],
    ['https://cms.happinesea.com/article/'],
    [],
  ]) {
    await sitemap(urls);
    await assert.rejects(verifySitemap(dir, base));
  }
  await sitemap([`${base}article/`]);
  await writeFile(
    join(dir, 'article/index.html'),
    html(`${base}article/`, 'noindex'),
  );
  await assert.rejects(verifySitemap(dir, base));
  await writeFile(join(dir, 'article/index.html'), html(`${base}article/`));
  await writeFile(
    join(dir, 'sitemap-0.xml'),
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url>',
  );
  await assert.rejects(verifySitemap(dir, base));
  await sitemap([`${base}article/`]);
  await writeFile(
    join(dir, 'sitemap-0.xml'),
    `<!-- http://www.sitemaps.org/schemas/sitemap/0.9 --><urlset xmlns="wrong"><url><loc>${base}article/</loc></url></urlset>`,
  );
  await assert.rejects(verifySitemap(dir, base), /namespace/);
  await sitemap([`${base}article/`]);
  await writeFile(
    join(dir, 'robots.txt'),
    'User-agent: *\nAllow: /\nSitemap: https://cms.happinesea.com/sitemap-index.xml\n',
  );
  await assert.rejects(verifySitemap(dir, base), /robots sitemap/);
});
