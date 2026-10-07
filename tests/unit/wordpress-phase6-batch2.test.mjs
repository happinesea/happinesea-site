import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { htmlText } from '../../scripts/lib/wordpress-publication.mjs';

const read = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const review = read('../fixtures/wordpress-phase6-review-batch2.json');
const articles = read('../../src/data/wordpress-insights.json');

test('batch 2 preserves reviewed source text, links, categories, embeds and original alts', () => {
  for (const source of review.articles) {
    const article = articles.find(({ contract }) => contract.id === source.id);
    assert.ok(article, `missing reviewed article ${source.id}`);
    assert.equal(article.canonical, source.source_url);
    assert.equal(article.contract.slug, source.slug);
    assert.equal(htmlText(article.content_html), source.source_text);
    assert.deepEqual(
      article.contract.category,
      source.category_names.map(({ slug }) => slug),
    );
    assert.deepEqual(
      [...article.content_html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]),
      source.source_links,
    );
    for (const id of source.youtube_ids)
      assert.ok(article.content_html.includes(`/embed/${id}?`));
    assert.deepEqual(article.body_assets, []);
    if (source.source_featured_image) {
      assert.equal(article.hero.source_url, source.source_featured_image);
      assert.equal(article.hero.alt, source.source_featured_alt);
      assert.match(article.hero.src, /^\/assets\/insights\/wordpress\//);
    } else assert.equal(article.hero, null);
  }
});

test('editorial surface audit retains every public REST page, FAQ and category and requires output proof for compatibility', () => {
  const path = new URL(
    '../../src/data/legacy-editorial-surface-review.json',
    import.meta.url,
  );
  assert.ok(existsSync(path), 'missing bounded editorial surface audit');
  const audit = JSON.parse(readFileSync(path, 'utf8'));
  const inventory = read('../../src/data/legacy-public-surface.json');
  assert.deepEqual(audit.counts, { pages: 22, ufaq: 5, categories: 11 });
  assert.equal(audit.records.length, 38);
  assert.equal(new Set(audit.records.map((x) => x.source_api)).size, 38);
  for (const item of audit.records) {
    const entry = inventory.entries.find(
      (x) => x.legacy_url.toLowerCase() === item.legacy_url.toLowerCase(),
    );
    assert.ok(entry, `missing audited URL ${item.legacy_url}`);
    assert.ok(
      item.http_status === 'UNVERIFIED' || Number.isInteger(item.http_status),
    );
    if (
      item.content_type === 'category_archive' &&
      entry.migration_status === 'READY'
    ) {
      assert.equal(item.compatibility_class, 'ARCHIVE_COMPAT');
      assert.equal(entry.static_output, 'VERIFIED');
      assert.ok(
        read('../../src/data/legacy-compatibility.json').pages.some(
          (page) =>
            page.target_route === entry.target_route &&
            page.canonical === entry.canonical,
        ),
      );
    }
    if (item.error) assert.equal(item.http_status, 'UNVERIFIED');
  }
  assert.equal(audit.supplemental_faq_surfaces.length, 5);
  for (const item of audit.supplemental_faq_surfaces) {
    const entry = inventory.entries.find(
      (x) => x.legacy_url === item.legacy_url,
    );
    assert.ok(entry, `missing supplemental FAQ URL ${item.legacy_url}`);
    assert.equal(entry.current_status, item.http_status);
    if (entry.migration_status === 'READY') {
      assert.ok(
        ['READY_AS_IS', 'ARCHIVE_COMPAT'].includes(item.compatibility_class),
      );
      assert.equal(entry.static_output, 'VERIFIED');
    }
  }
});
