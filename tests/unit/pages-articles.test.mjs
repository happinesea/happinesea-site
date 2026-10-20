import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readFile,
  mkdtemp,
  mkdir,
  writeFile,
  access,
  rm,
} from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parse } from 'yaml';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import {
  cmsArticleSchema,
  publishedCmsArticles,
  cmsArticleImages,
  finalizeCmsArticleImages,
} from '../../scripts/lib/pages-articles.mjs';

const input = {
  content_origin: 'pages-cms',
  slug: 'sample',
  title: '記事',
  description: '説明',
  topic: 'RC技術',
  content_status: 'published',
  published_at: '2026-10-20T10:00:00+09:00',
  hero: { src: '/images/articles/sample.webp', alt: '画像' },
};

test('CMS fields map to existing article data without dropping unmanaged metadata', () => {
  const data = cmsArticleSchema.parse({
    ...input,
    editor_note: { keep: true },
  });
  assert.equal(data.article_kind, 'article');
  assert.equal(data.updated_at.valueOf(), data.published_at.valueOf());
  assert.deepEqual(data.tags, []);
  assert.deepEqual(data.related_products, []);
  assert.equal(data.hero.image_status, 'verified');
  assert.deepEqual(data.editor_note, { keep: true });
  for (const change of [
    { slug: '../escape' },
    { content_status: 'sample' },
    { published_at: '' },
    { hero: { src: 'https://cms.happinesea.com/image.jpg', alt: 'bad' } },
  ])
    assert.throws(() => cmsArticleSchema.parse({ ...input, ...change }));
});

test('drafts are excluded and a filename/slug change cannot silently move a public URL', () => {
  const published = { id: 'sample', data: cmsArticleSchema.parse(input) };
  const draft = {
    id: 'draft-secret',
    data: { ...published.data, content_status: 'draft' },
  };
  assert.deepEqual(publishedCmsArticles([draft, published]), [published]);
  assert.throws(
    () => publishedCmsArticles([{ ...published, id: 'other' }]),
    /filename/,
  );
});

test('CMS body image URLs receive the Astro base and reject traversal/external images', () => {
  const plugin = cmsArticleImages('/happinesea-site');
  const ctx = {
    data: { astro: { frontmatter: { content_origin: 'pages-cms' } } },
  };
  const node = {
    tagName: 'img',
    properties: { src: '/images/articles/sample.webp', alt: '画像' },
  };
  const output = plugin.element.visit(node, ctx);
  assert.equal(
    output.properties.src,
    '/happinesea-site/images/articles/sample.webp',
  );
  assert.throws(() =>
    plugin.element.visit(
      { ...node, properties: { src: '/images/articles/../private.png' } },
      ctx,
    ),
  );
  assert.throws(() =>
    plugin.element.visit(
      { ...node, properties: { src: 'https://example.com/image.jpg' } },
      ctx,
    ),
  );
});

test('real Markdown renderer emits base-aware CMS images and rejects unsafe sources', async () => {
  const renderer = await createSatteriMarkdownProcessor({
    hastPlugins: [cmsArticleImages('/happinesea-site')],
  });
  const options = { frontmatter: { content_origin: 'pages-cms' } };
  const result = await renderer.render(
    '![image](/images/articles/sample.webp)',
    options,
  );
  assert.match(
    result.code,
    /src="\/happinesea-site\/images\/articles\/sample.webp"/,
  );
  await assert.rejects(
    renderer.render('![image](https://example.com/image.jpg)', options),
  );
});

test('Pages CMS exposes only the new collection, merges unmanaged fields, and isolates media', async () => {
  const config = parse(await readFile('.pages.yml', 'utf8'));
  assert.equal(config.settings.content.merge, true);
  assert.equal(config.content.length, 1);
  assert.equal(config.content[0].path, 'src/content/articles');
  assert.equal(config.content[0].format, 'yaml-frontmatter');
  assert.equal(config.content[0].operations.rename, false);
  assert.equal(config.media[0].input, 'public/images/articles');
  assert.equal(config.media[0].output, '/images/articles');
  assert.equal(
    config.content[0].fields.find((f) => f.name === 'body').type,
    'rich-text',
  );
  assert.equal(
    config.content[0].fields.find((f) => f.name === 'content_status').default,
    'draft',
  );
});

test('draft-only images are removed only from the artifact, published references survive', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'cms-article-images-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'images/articles'), { recursive: true });
  await writeFile(join(dir, 'images/articles/published.png'), 'public');
  await writeFile(join(dir, 'images/articles/draft.png'), 'draft');
  await writeFile(
    join(dir, 'index.html'),
    '<img src="/happinesea-site/images/articles/published.png" alt="image">',
  );
  // Astro emits legacy *.html directories before the existing alias finalizer.
  await mkdir(join(dir, 'legacy.html'));
  await writeFile(join(dir, 'legacy.html/index.html'), '<p>Legacy page</p>');
  await finalizeCmsArticleImages(dir);
  await access(join(dir, 'images/articles/published.png'));
  await assert.rejects(access(join(dir, 'images/articles/draft.png')));
  await access('public/images/articles/sample.webp');
});
