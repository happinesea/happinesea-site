import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { compileFunction } from 'node:vm';

// Execute the real page selection with in-memory collections; no article files change.
const page = await readFile(
  new URL('../../src/pages/index.astro', import.meta.url),
  'utf8',
);
const frontmatter = page.split('---')[1].replace(/^import .*;\r?\n/gm, '');
const select = compileFunction(
  `return (async () => { ${frontmatter}; return { latest, news, rcArticles }; })();`,
  ['getCollection'],
);

for (const topic of ['業界動向', 'RC技術']) {
  test(`latest ${topic} article appears only in the featured position`, async () => {
    const article = (slug, articleTopic, date) => ({
      data: {
        slug,
        topic: articleTopic,
        published_at: new Date(date),
        content_status: 'published',
      },
    });
    const collections = [
      article('older-news', '業界動向', '2025-01-01'),
      article('latest', topic, '2026-01-01'),
      article('older-rc', 'RC技術', '2025-02-01'),
    ];
    const { latest, news, rcArticles } = await select(async (name) =>
      name === 'insights' ? collections : [],
    );
    assert.equal(latest.data.slug, 'latest');
    assert.deepEqual(
      news.map((item) => item.data.slug),
      ['older-news'],
    );
    assert.deepEqual(
      rcArticles.map((item) => item.data.slug),
      ['older-rc'],
    );
    assert.equal(
      [latest, ...news, ...rcArticles].filter(
        (item) => item.data.slug === 'latest',
      ).length,
      1,
    );
  });
}
