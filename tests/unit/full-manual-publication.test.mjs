import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';

const inventory = JSON.parse(
  readFileSync(
    new URL('../../docs/rc8x-rc8p-publication-inventory.json', import.meta.url),
  ),
);
const read = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

for (const product of inventory.products) {
  test(`${product.product}: complete canonical chapters, figures, tables and source hashes`, () => {
    assert.equal(inventory.publication_status, 'manufacturer_review');
    assert.equal(Object.keys(product.canonical_files).length, 5);
    assert.equal(product.pages.length, product.product === 'rc8x' ? 4 : 6);
    assert.equal(
      product.figure_placements,
      product.product === 'rc8x' ? 229 : 102,
    );
    assert.equal(product.tables, product.product === 'rc8x' ? 7 : 6);
    if (product.product === 'rc8x') assert.equal(product.sections.length, 114);
    const text = product.pages.map((page) => read(page.path)).join('\n');
    assert.doesNotMatch(text, /^#+.*(?:原資料.*ページ|PDF\s*\d|Page\s*\d)/m);
    for (const page of product.pages) {
      const content = read(page.path).replaceAll('\r\n', '\n');
      assert.equal(
        createHash('sha256').update(content).digest('hex'),
        page.sha256,
      );
      assert.equal(
        (content.match(/^#{2,6}\s/gm) ?? []).length,
        page.headings.length,
      );
      assert.match(content, /status: manufacturer_review/);
      assert.match(content, /content: noindex, nofollow/);
      assert.match(content, /tableOfContents:\n {2}maxHeadingLevel: 4/);
    }
    assert.equal(
      (text.match(/<ManualFigure\s/g) ?? []).length,
      product.figure_placements,
    );
    assert.equal(
      new Set(product.assets.map((asset) => asset.figure_id)).size,
      product.figure_placements,
    );
    for (const asset of product.assets) {
      const path = new URL(`../../public${asset.src}`, import.meta.url);
      assert(existsSync(path));
      assert.equal(
        createHash('sha256').update(readFileSync(path)).digest('hex'),
        asset.sha256,
      );
      assert(asset.width > 0 && asset.height > 0);
      assert(asset.src.startsWith(`/assets/radiolink/${product.product}/`));
    }
    for (const section of product.sections)
      assert(text.includes(`id="${section.anchor}"`));
  });
  test(`${product.product}: each canonical YouTube occurrence is exactly one existing video block`, () => {
    assert.equal(product.videos.length, product.product === 'rc8x' ? 12 : 2);
    const text = product.pages.map((page) => read(page.path)).join('\n');
    assert.doesNotMatch(
      text,
      /https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//,
    );
    assert.equal(
      (text.match(/<ManualVideo /g) ?? []).length,
      product.videos.length,
    );
    for (const video of product.videos)
      assert.match(video.video_id, /^[\w-]{11}$/);
    const expected = product.videos.map((video) => video.video_id).sort();
    const actual = [...text.matchAll(/<ManualVideo youtubeId="([\w-]+)"/g)]
      .map((match) => match[1])
      .sort();
    assert.deepEqual(actual, expected);
    const component = read('src/components/manuals/ManualVideo.astro');
    assert.match(component, /aspect-ratio: 16 \/ 9/);
    assert.match(component, /loading="lazy"/);
    assert.match(component, /youtube-nocookie/);
    assert.doesNotMatch(component, /autoplay=1/);
  });
}
