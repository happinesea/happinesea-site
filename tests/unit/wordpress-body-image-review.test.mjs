import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyInventoryPost,
  localizeArticleImages,
  sanitizeArticleHtml,
} from '../../scripts/lib/wordpress-publication.mjs';

test('body localization accepts only an image-bound review and preserves nonempty source alt', () => {
  const src = 'https://happinesea.com/menu.png';
  const asset = {
    src: '/assets/menu.webp',
    source_url: src,
    sha256: 'a'.repeat(64),
    width: 200,
    height: 100,
  };
  const assets = new Map([[src, asset]]);
  const reviews = [
    {
      source_url: src,
      sha256: 'a'.repeat(64),
      alt: '設定画面。"選択"と表示。',
    },
  ];
  const raw = `<p>原文。</p><img src="${src}" alt="">`;
  const out = sanitizeArticleHtml(raw, assets, { imageReviews: reviews });
  assert.match(out, /alt="設定画面。&quot;選択&quot;と表示。"/);
  assert.match(out, /src="\/assets\/menu.webp"/);
  assert.match(out, /<p>原文。<\/p>/);
  assert.match(
    localizeArticleImages(raw.replace('alt=""', 'alt=" "'), assets, reviews),
    /alt="設定画面。&quot;選択&quot;と表示。"/,
  );
  assert.match(
    localizeArticleImages(
      raw.replace('alt=""', 'alt="原文alt"'),
      assets,
      reviews,
    ),
    /alt="原文alt"/,
  );
  assert.throws(() => localizeArticleImages(raw, assets), /missing alt/);
  assert.throws(
    () =>
      localizeArticleImages(
        raw,
        new Map([[src, { ...asset, sha256: undefined }]]),
        reviews,
      ),
    /review drift/,
  );
  assert.throws(
    () =>
      localizeArticleImages(
        raw,
        new Map([[src, { ...asset, sha256: 'b'.repeat(64) }]]),
        reviews,
      ),
    /review drift/,
  );
  assert.throws(
    () =>
      localizeArticleImages(raw, assets, [
        { ...reviews[0], source_url: 'https://happinesea.com/other.png' },
      ]),
    /missing alt/,
  );
  assert.equal(
    classifyInventoryPost(
      {
        markup: {
          iframes: [],
          shortcodes: [],
          script_count: 0,
          unresolved_links: 0,
          body_images: [{ src, alt: '' }],
        },
      },
      { body_image_reviews: reviews },
    ).status,
    'READY',
  );
});
