import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sanitizeHtml from 'sanitize-html';

const read = (path) =>
  JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'));
const text = (html) =>
  sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();

test('deferred page copies retain source text, links, reviewed image bytes and canonicals without occupying Git-owned routes', () => {
  const resolution = read('src/data/legacy-fixed-page-resolution.json');
  const publication = read('src/data/legacy-compatibility.json');
  const sources = read('tests/fixtures/deferred-fixed-pages.json');
  assert.deepEqual(
    resolution.pages.map((item) => item.id).sort((a, b) => a - b),
    [3, 14, 207, 969, 1160, 1172, 1344, 1405, 1664, 2108, 2122],
  );
  for (const source of sources) {
    const page = publication.pages.find(
      (item) => item.id === source.id && item.type === 'fixed_page',
    );
    assert.ok(page, `missing preserved page ${source.id}`);
    assert.equal(page.canonical, source.canonical);
    assert.equal(page.target_route, new URL(source.canonical).pathname);
    assert.equal(text(page.content_html), text(source.content_html));
    assert.deepEqual(
      [...page.content_html.matchAll(/\bhref="([^"]*)"/g)].map(
        (match) => match[1],
      ),
      source.links,
    );
    assert.doesNotMatch(
      page.content_html,
      /<(?:iframe|script)|\bon\w+=|javascript:/i,
    );
    for (const image of source.images) {
      assert.ok(page.content_html.includes(`alt="${image.alt}"`));
      const asset = publication.assets.find(
        (item) => item.source_url === image.source_url,
      );
      assert.ok(asset, image.source_url);
      assert.equal(asset.sha256, image.sha256);
      const path = new URL(
        `../../public${asset.target_route}`,
        import.meta.url,
      );
      assert.ok(existsSync(path));
      assert.equal(
        createHash('sha256').update(readFileSync(path)).digest('hex'),
        image.sha256,
      );
    }
  }
  assert.equal(
    publication.pages.some((page) =>
      ['/', '/radiolink', '/radiolink/'].includes(page.target_route),
    ),
    false,
  );
  for (const page of resolution.pages.filter(
    (item) =>
      !['PRESERVE_STATIC', 'TRANSFORM_AND_PUBLISH'].includes(item.disposition),
  )) {
    assert.equal(
      publication.pages.some((item) => item.id === page.id),
      false,
      `unsafe publication ${page.id}`,
    );
  }
  assert.equal(
    resolution.pages.find((page) => page.id === 1160).equivalence.result,
    'NOT_EQUIVALENT',
  );
  assert.equal(
    resolution.pages.find((page) => page.id === 1160).redirect_approved,
    false,
  );
});
