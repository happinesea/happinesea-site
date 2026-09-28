import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
} from '../../src/lib/structured-data.ts';

test('buildBreadcrumbJsonLd preserves ordered verified links', () => {
  assert.deepEqual(
    buildBreadcrumbJsonLd([
      { name: 'ホーム', url: 'https://example.com/' },
      { name: 'RC8X', url: 'https://example.com/radiolink/rc8x/' },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'ホーム',
          item: 'https://example.com/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'RC8X',
          item: 'https://example.com/radiolink/rc8x/',
        },
      ],
    },
  );
});

test('buildProductJsonLd emits only verified product fields', () => {
  const product = buildProductJsonLd({
    name: 'RC8X',
    description: '公開用の商品概要',
    manufacturer: 'Radiolink',
    url: 'https://example.com/radiolink/rc8x/',
  });

  assert.equal(product['@type'], 'Product');
  assert.deepEqual(product.brand, { '@type': 'Brand', name: 'Radiolink' });
  for (const key of [
    'price',
    'offers',
    'aggregateRating',
    'review',
    'availability',
    'compatibility',
  ]) {
    assert.equal(
      Object.hasOwn(product, key),
      false,
      `${key} must not be inferred`,
    );
  }
});

test('buildArticleJsonLd supports Article and TechArticle without invented fields', () => {
  for (const kind of ['Article', 'TechArticle']) {
    const article = buildArticleJsonLd({
      kind,
      headline: '公開用タイトル',
      description: '公開用概要',
      url: 'https://example.com/article/',
      dateModified: '2026-09-28',
    });

    assert.equal(article['@type'], kind);
    assert.equal(article.dateModified, '2026-09-28');
    assert.equal(Object.hasOwn(article, 'datePublished'), false);
    assert.equal(Object.hasOwn(article, 'image'), false);
  }
});
