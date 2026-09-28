import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
    'features',
    'specifications',
    'receivers',
    'manuals',
    'support',
    'firmware',
    'updates',
    'related-products',
    'source',
    'last-checked',
  ];

  assert.match(html, /aria-label="パンくずリスト"/);
  assert.match(html, /Radiolink/);
  assert.match(html, /RC8X/);
  assert.match(html, /href="https:\/\/line\.me\/R\/ti\/p\/%40662zyrsb"/);
  for (const section of sections) {
    assert.match(html, new RegExp(`data-product-section="${section}"`));
  }
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
