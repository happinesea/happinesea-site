import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import * as cms from '../../scripts/lib/pages-articles.mjs';
const sample = parse(
  (await readFile('src/content/articles/pages-cms-example.md', 'utf8')).split(
    '---',
  )[1],
);
const entry = (data = {}, body = '') => ({
  id: sample.slug,
  data: cms.cmsArticleSchema.parse({ ...sample, ...data }),
  body,
});
test('blank description uses Markdown text, keeps manual descriptions and permits empty bodies', () => {
  const body =
    '# 見出し\n\n' +
    '本文の**大事な説明**と[参考リンク](https://example.com)。'.repeat(12) +
    '\n![画像](ignored.png)';
  const result = cms.publishedCmsArticles([
    entry({ content_status: 'published', description: '' }, body),
  ])[0];
  assert.ok(Array.from(result.data.description).length >= 100);
  assert.ok(Array.from(result.data.description).length <= 160);
  assert.doesNotMatch(result.data.description, /https:|\*|ignored|画像/);
  assert.equal(
    cms.publishedCmsArticles([
      entry({ content_status: 'published', description: '手動の説明' }, body),
    ])[0].data.description,
    '手動の説明',
  );
  assert.equal(
    cms.publishedCmsArticles([
      entry({ content_status: 'published', description: '' }),
    ])[0].data.description,
    sample.title,
  );
  assert.doesNotThrow(() => entry({ description: undefined }));
});
test('tags and product IDs deduplicate without changing their array contract; unknown products fail closed', () => {
  const data = entry({
    tags: [' ミサイル ', 'ミサイル'],
    related_products: ['rc8x', 'rc8x'],
  }).data;
  assert.deepEqual(data.tags, ['ミサイル']);
  assert.deepEqual(data.related_products, ['rc8x']);
  assert.throws(() => entry({ related_products: ['invented-product'] }));
  assert.deepEqual(
    entry({ gallery: [{ src: sample.hero.src, alt: '追加画像' }] }).data
      .gallery,
    [{ src: sample.hero.src, alt: '追加画像' }],
  );
});
test('CMS Markdown keeps formatting and ordered images, sanitizes HTML and unsafe links', () => {
  const body = `## 見出し\n\n**太字**と*斜体* [リンク](https://example.com)\n\n- 項目\n\n1. 順序\n\n![前](${sample.hero.src})\n\n途中\n\n![後](${sample.hero.src})\n\n<script>alert(1)</script><iframe src="https://bad.invalid"></iframe><a href="javascript:alert(1)" onclick="bad()">危険</a>`;
  const html = cms.renderCmsArticle(body, '/happinesea-site');
  for (const tag of ['h2', 'strong', 'em', 'ul', 'ol'])
    assert.match(html, new RegExp('<' + tag + '[ >]'));
  assert.match(html, /alt="前"[\s\S]*途中[\s\S]*alt="後"/);
  assert.match(html, /src="\/happinesea-site\/images\/articles\//);
  assert.doesNotMatch(html, /script|iframe|javascript:|onclick=/i);
  assert.throws(() =>
    cms.renderCmsArticle('![x](https://example.com/x.png)', '/'),
  );
});
test('CMS config supports searchable products, tag creation/selection and ordered image objects', async () => {
  const config = parse(await readFile('.pages.yml', 'utf8'));
  const fields = config.content.find((c) => c.name === 'articles').fields;
  const field = (name) => fields.find((f) => f.name === name);
  assert.ok(!field('description').required && !field('body').required);
  assert.equal(field('tags').options.collection, 'article_tags');
  assert.equal(field('tags').options.multiple, true);
  assert.equal(config.content[1].filename, '{fields.id}.yml');
  assert.equal(config.content[1].fields[0].type, 'uuid');
  assert.equal(
    config.content.find((c) => c.name === 'article_tags').path,
    'src/content/article-tags',
  );
  const catalogue = JSON.parse(
    await readFile('src/data/product-catalogue.json', 'utf8'),
  );
  assert.deepEqual(
    field('related_products').options.values.map((p) => p.value),
    catalogue.map((p) => p.id),
  );
  assert.equal(field('related_products').list, undefined);
  assert.equal(field('gallery').type, 'object');
  assert.ok(field('gallery').list);
  assert.equal(field('gallery').default, undefined);
  assert.match(field('body').label, /半角.*\/.*Image/);
  assert.match(field('body').description, /画像をクリック.*ALT/);
  assert.equal(field('body').options.media, config.media[0].name);
  assert.equal(field('body').options.format, 'markdown');
});

test('Pages CMS unquoted YAML timestamps are accepted as Dates by Astro', () => {
  const input = { ...sample, published_at: new Date('2026-10-20T01:00:00Z') };
  assert.equal(
    cms.cmsArticleSchema.parse(input).published_at.toISOString(),
    '2026-10-20T01:00:00.000Z',
  );
  assert.throws(() =>
    cms.cmsArticleSchema.parse({ ...input, published_at: '2026-10-20' }),
  );
});

test('raw HTML images obey the same path, base and alt boundary as Markdown', () => {
  const html = cms.renderCmsArticle(
    `<img src="${sample.hero.src}" alt="HTML画像">`,
    '/happinesea-site',
  );
  assert.ok(html.includes(`src="/happinesea-site${sample.hero.src}"`));
  assert.throws(() =>
    cms.renderCmsArticle(
      '<img src="https://cms.happinesea.com/x.png" alt="x">',
      '/',
    ),
  );
  assert.throws(() =>
    cms.renderCmsArticle(`<img src="${sample.hero.src}">`, '/'),
  );
});
