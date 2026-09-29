import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const route = (path) =>
  readFile(new URL(`../dist/${path}`, import.meta.url), 'utf8');

test('home exposes product and editorial pillars', async () => {
  const html = await route('index.html');

  assert.match(html, /data-home-pillar="products"/);
  assert.match(html, /data-home-pillar="insights"/);
});

test('Radiolink catalogue exposes seven accessible category filters', async () => {
  const html = await route('radiolink/index.html');
  const categories = [
    '送信機',
    '受信機',
    'フライトコントローラー',
    'GPS・RTK・センサー',
    '機体',
    '電源・ESC',
    'モジュール・アクセサリー',
  ];

  for (const category of categories) {
    assert.match(html, new RegExp(`data-category-filter="${category}"`));
  }
  assert.match(html, /aria-live="polite"/);
});

test('RC8X product page exposes required sections without commercial claims', async () => {
  const html = await route('radiolink/rc8x/index.html');
  const sections = [
    'overview',
    'feature-display',
    'feature-connectivity',
    'feature-customization',
    'feature-telemetry',
    'package',
    'videos',
    'specifications',
    'receivers',
    'manuals',
    'support',
    'firmware',
    'updates',
    'related-products',
  ];

  assert.match(html, /aria-label="パンくずリスト"/);
  assert.match(html, /Radiolink/);
  assert.match(html, /RC8X/);
  assert.match(html, /href="https:\/\/line\.me\/R\/ti\/p\/%40662zyrsb"/);
  for (const section of sections) {
    assert.match(html, new RegExp(`data-product-section="${section}"`));
  }
  assert.match(html, /href="\/happinesea-site\/manuals\/rc8x\/"/);
  assert.match(html, /Radiolink公式・外部サイト/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /youtube-nocookie\.com\/embed\//);
  assert.match(html, /<time[^>]*>[^<]+<\/time>[\s\S]*?<a[^>]+>[^<]+<\/a>/);
  assert.doesNotMatch(html, /data-product-section="(?:source|last-checked)"/);
  assert.doesNotMatch(html, />情報源</);
  assert.doesNotMatch(html, /"@type":"(?:Offer|AggregateRating)"/);
  assert.doesNotMatch(html, /"offers"|"aggregateRating"/);
  assert.doesNotMatch(
    html,
    /pagead2\.googlesyndication|data-ad-client|data-ad-slot/,
  );
});

test('support and product update routes are distinct public targets', async () => {
  const support = await route('support/index.html');
  const updates = await route('radiolink/updates/index.html');

  assert.match(support, /RC8X サポート/);
  assert.match(support, /href="https:\/\/line\.me\/R\/ti\/p\/%40662zyrsb"/);
  assert.match(updates, /Radiolink更新情報/);
  assert.match(updates, /data-content-kind="product_update"/);
});

test('insights index exposes all editorial topics', async () => {
  const html = await route('insights/index.html');
  const topics = [
    '航空・ドローン',
    'RC技術',
    '法規・制度',
    '業界動向',
    '技術解説',
    '導入事例',
  ];

  assert.match(html, /data-editorial-index/);
  for (const topic of topics) {
    assert.match(html, new RegExp(`data-topic-label="${topic}"`));
  }
});

test('sample insight renders the complete editorial template', async () => {
  const html = await route('insights/aircraft-engine-stop/index.html');
  const sections = ['introduction', 'body', 'related', 'attribution'];

  assert.match(html, /aria-label="パンくずリスト"/);
  assert.match(html, /航空・ドローン/);
  assert.match(html, /航空機のエンジンが停止するとどうなる？/);
  assert.match(html, /2026年9月28日/);
  assert.match(html, /記事画像準備中/);
  assert.match(html, /レイアウト検証用のサンプル/);
  assert.match(html, /data-ad-candidate/);
  assert.match(html, /"@type":"TechArticle"/);
  for (const section of sections) {
    assert.match(html, new RegExp(`data-article-section="${section}"`));
  }
});

test('Starlight manual retains navigation features under the project base', async () => {
  const index = await route('manuals/rc8x/index.html');
  const next = await route('manuals/rc8x/chapter-01/index.html');

  assert.match(index, /<html lang="ja"/);
  assert.match(index, /data-has-sidebar/);
  assert.match(index, /data-has-toc/);
  assert.match(index, /<main/);
  assert.match(index, /<site-search/);
  assert.match(index, /class="sidebar /);
  assert.match(index, /right-sidebar/);
  assert.match(index, /pagination-links/);
  assert.match(index, /sl-menu-button/);
  assert.match(index, /happinesea/);
  assert.match(index, /href="\/happinesea-site\/"/);
  assert.match(index, /href="\/happinesea-site\/manuals\/rc8x\/chapter-01\/"/);
  assert.match(next, /href="\/happinesea-site\/manuals\/rc8x\/"/);
  const productHref = index.match(/href="([^"]+)">RC8X商品ページへ戻る/)?.[1];
  assert.equal(
    new URL(
      productHref,
      'https://happinesea.github.io/happinesea-site/manuals/rc8x/',
    ).pathname,
    '/happinesea-site/radiolink/rc8x/',
  );
});

test('RC8X manual chapters place official figures and videos in relevant sections', async () => {
  for (const path of [
    'manuals/rc8x/chapter-01/index.html',
    'manuals/rc8x/chapter-02/index.html',
  ]) {
    const html = await route(path);
    assert.match(html, /data-manual-section=/);
    assert.match(html, /data-manual-figure(?:=|\s|>)/);
    assert.match(html, /\/happinesea-site\/assets\/radiolink\/rc8x\/manual\//);
    assert.match(html, /data-manual-video(?:=|\s|>)/);
    assert.match(html, /youtube-nocookie\.com\/embed\//);
  }
});

test('all public routes emit project-base canonical and Open Graph URLs', async () => {
  const routes = [
    'index.html',
    'radiolink/index.html',
    'radiolink/rc8x/index.html',
    'radiolink/updates/index.html',
    'support/index.html',
    'insights/index.html',
    'insights/aircraft-engine-stop/index.html',
    'manuals/rc8x/index.html',
    'manuals/rc8x/chapter-01/index.html',
    'manuals/rc8x/chapter-02/index.html',
  ];

  for (const path of routes) {
    const html = await route(path);
    assert.match(
      html,
      /<link rel="canonical" href="https:\/\/happinesea\.github\.io\/happinesea-site\//,
      path,
    );
    assert.match(
      html,
      /<meta property="og:url" content="https:\/\/happinesea\.github\.io\/happinesea-site\//,
      path,
    );
    for (const [, value] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      if (value.startsWith('/')) {
        assert.ok(value.startsWith('/happinesea-site/'), `${path}: ${value}`);
      }
    }
  }
});

test('robots and sitemap stay on the standard project Pages URL', async () => {
  const robots = await route('robots.txt');
  const sitemap = await route('sitemap-index.xml');

  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(
    robots,
    /^Sitemap: https:\/\/happinesea\.github\.io\/happinesea-site\/sitemap-index\.xml$/m,
  );
  assert.match(
    sitemap,
    /https:\/\/happinesea\.github\.io\/happinesea-site\/sitemap-0\.xml/,
  );
  await assert.rejects(access(new URL('../CNAME', import.meta.url)));
});

test('structured data contains only backed product and article types', async () => {
  const product = await route('radiolink/rc8x/index.html');
  const article = await route('insights/aircraft-engine-stop/index.html');

  assert.match(product, /"@type":"Product"/);
  assert.match(product, /"@type":"BreadcrumbList"/);
  assert.match(article, /"@type":"TechArticle"/);
  assert.doesNotMatch(product, /"offers"|"aggregateRating"|"review"/);
});
