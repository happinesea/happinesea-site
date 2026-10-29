import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { compileFunction } from 'node:vm';
import { publishedCmsArticles } from '../../scripts/lib/pages-articles.mjs';
import ts from 'typescript';
import { parse } from 'yaml';
const sampleImage = parse(
  (await readFile('src/content/articles/pages-cms-example.md', 'utf8')).split(
    '---',
  )[1],
).hero.src;

// Execute the real page selection with in-memory collections; no article files change.
const page = await readFile(
  new URL('../../src/pages/index.astro', import.meta.url),
  'utf8',
);
const frontmatter = page.split('---')[1].replace(/^import .*;\r?\n/gm, '');
const evaluateSelection = compileFunction(
  `return (async () => { ${frontmatter}; return { latest, latestSlides, news, rcArticles }; })();`,
  ['getCollection', 'publishedCmsArticles'],
);
const select = (getCollection) =>
  evaluateSelection(getCollection, publishedCmsArticles);

test('CMS entries with a WordPress-like ID retain their own homepage category', async () => {
  const component = await readFile(
    new URL('../../src/components/HomeArticle.astro', import.meta.url),
    'utf8',
  );
  const code = component.split('---')[1].replace(/^import .*;\r?\n/gm, '');
  const evaluate = compileFunction(
    ts.transpileModule(code, {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText + '; return categories;',
    ['Astro', 'wordpressArticles', 'withBase'],
  );
  const insight = {
    id: 'wordpress-2187',
    collection: 'cmsArticles',
    data: { slug: 'wordpress-2187', topic: 'RC技術' },
  };
  assert.deepEqual(
    evaluate(
      { props: { insight } },
      [{ id: 'wordpress-2187', contract: { category: ['news'] } }],
      (path) => path,
    ),
    ['RC技術'],
  );
});

for (const topic of ['業界動向', 'RC技術']) {
  test(`latest ${topic} article appears in the featured and matching topic section`, async () => {
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
      topic === '業界動向' ? ['latest', 'older-news'] : ['older-news'],
    );
    assert.deepEqual(
      rcArticles.map((item) => item.data.slug),
      topic === 'RC技術' ? ['latest', 'older-rc'] : ['older-rc'],
    );
    assert.equal(
      [latest, ...news, ...rcArticles].filter(
        (item) => item.data.slug === 'latest',
      ).length,
      2,
    );
  });
}

test('carousel includes published CMS articles and excludes drafts across all collections', async () => {
  const entry = (slug, topic, day, content_status = 'published') => ({
    id: slug,
    data: {
      slug,
      topic,
      published_at: new Date(`2026-01-${day}`),
      content_status,
      hero: { src: sampleImage, alt: 'image' },
    },
  });
  const { latestSlides } = await select(async (name) =>
    name === 'insights'
      ? [
          entry('static-news', '業界動向', '06'),
          entry('static-rc', 'RC技術', '04'),
          entry('draft', '業界動向', '07', 'draft'),
        ]
      : name === 'wordpressInsights'
        ? [
            entry('wp-drone', '航空・ドローン', '05'),
            entry('wp-news', '業界動向', '03'),
            entry('wp-rc', 'RC技術', '02'),
            entry('old', '業界動向', '01'),
          ]
        : [
            entry('cms-public', '技術解説', '08'),
            entry('cms-draft', '技術解説', '09', 'draft'),
          ],
  );
  assert.deepEqual(
    latestSlides.map(({ data }) => data.slug),
    ['cms-public', 'static-news', 'wp-drone', 'static-rc', 'wp-news'],
  );
});
