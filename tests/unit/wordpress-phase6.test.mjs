import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const reviewed = read('../fixtures/wordpress-phase6-review.json');
const articles = read('../../src/data/wordpress-insights.json');

test('reviewed Phase 6 video articles retain embeds, source categories and local decorative previews', () => {
  for (const source of reviewed.articles) {
    const article = articles.find(({ contract }) => contract.id === source.id);
    assert.ok(article, `missing reviewed article ${source.id}`);
    assert.equal(article.canonical, source.source_url);
    assert.deepEqual(
      article.contract.category,
      source.category_names.map(({ slug }) => slug),
    );
    for (const id of source.youtube_ids)
      assert.ok(article.content_html.includes(`youtube.com/embed/${id}?`));
    assert.deepEqual(article.body_assets, []);
    assert.match(
      article.hero.src,
      /^\/assets\/insights\/wordpress\/\d+-[a-f0-9]{12}\.webp$/,
    );
    assert.equal(article.hero.source_url, source.source_featured_image);
    assert.equal(article.hero.alt, '');
    assert.doesNotMatch(article.content_html, /<img|<script|\[[a-z]+\]/i);
  }
});
