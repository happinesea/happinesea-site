import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sanitizeHtml from 'sanitize-html';
const load = (path) =>
  JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'));

test('RC4GS V2 static copy retains every source image, motion bytes and content without the scroll script', () => {
  const snapshot = load('src/data/legacy-compatibility.json');
  const page = snapshot.pages.find((p) => p.id === 1172);
  assert.ok(page, 'RC4GS V2 static page missing');
  assert.equal(page.canonical, 'https://happinesea.com/radiolink/rc4gs');
  assert.equal([...page.content_html.matchAll(/<img\b/g)].length, 19);
  assert.match(page.content_html, /RC4GS V2/);
  assert.doesNotMatch(page.content_html, /<script|jQuery|<iframe/i);
  const asset = snapshot.assets.find((a) =>
    a.source_url.endsWith('/3100755.gif'),
  );
  assert.ok(asset);
  assert.equal(
    createHash('sha256')
      .update(
        readFileSync(
          new URL(`../../public${asset.target_route}`, import.meta.url),
        ),
      )
      .digest('hex'),
    '06534a96a20f1747025da96776f7da65c73ea3aa14e4b18e30c23b71b4ab54f1',
  );
  const source = load('tests/fixtures/rc4gs-v2-source.json');
  const sourceOrder = [
    ...source.content_html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g),
  ].map((match) => new URL(match[1]).pathname);
  const publishedOrder = [
    ...page.content_html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g),
  ].map((match) => match[1]);
  assert.deepEqual(publishedOrder, sourceOrder);
  for (const image of source.image_receipts) {
    const original = snapshot.assets.find(
      (item) => item.source_url === image.url,
    );
    assert.ok(original, image.url);
    assert.equal(original.sha256, image.sha256);
    assert.equal(
      createHash('sha256')
        .update(
          readFileSync(
            new URL(`../../public${original.target_route}`, import.meta.url),
          ),
        )
        .digest('hex'),
      image.sha256,
    );
  }
  const text = (html) =>
    sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
      .replace(/\s+/g, ' ')
      .trim();
  assert.equal(text(page.content_html), text(source.content_html));
  for (const alt of source.reviewed_alts)
    assert.ok(page.content_html.includes(`alt="${alt}"`));
});

test('RC6GS manual keeps V1/V2 Kindle separate from the exact V3 source PDF and query endpoint', () => {
  const snapshot = load('src/data/legacy-compatibility.json');
  const page = snapshot.pages.find((p) => p.id === 1344);
  assert.ok(page, 'RC6GS manual missing');
  assert.match(page.content_html, /RC6GS V1\/V2の取扱説明書/);
  assert.match(page.content_html, /https:\/\/www.amazon.co.jp\/dp\/B08NVHK22H/);
  assert.doesNotMatch(page.content_html, /<iframe|data-downloadurl|<script/i);
  const endpoint = snapshot.pages.find(
    (p) => p.target_route === '/download/rc6gs-v3-manual',
  );
  assert.equal(endpoint.download_id, '2032');
  const asset = snapshot.assets.find((a) => a.download_id === '2032');
  assert.equal(
    asset.sha256,
    '9d2c5485f2ebce5226fcf20b75a33bcc169a6305e3e3d51767aa80b0058c6737',
  );
  assert.equal(
    createHash('sha256')
      .update(
        readFileSync(
          new URL(`../../public${asset.target_route}`, import.meta.url),
        ),
      )
      .digest('hex'),
    asset.sha256,
  );
});
