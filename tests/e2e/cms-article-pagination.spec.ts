import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const slug = 'japan-hypersonic-missile-technology-challenges-2026';
const article = `./insights/${slug}/`;
const markdown = readFileSync(`src/content/articles/${slug}.md`, 'utf8');
const published =
  parse(markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)![1]).content_status ===
  'published';
const localDraftPreview =
  process.env.PUBLICATION_MODE !== 'production' &&
  process.env.CMS_ARTICLE_LOCAL_PREVIEW === slug;
const publicArticle =
  './insights/china-fourth-generation-air-to-air-missiles-technological-advancements-that-transcend-range/';

test('the paginated CMS article follows browser history', async ({
  page,
  isMobile,
}) => {
  test.skip(
    !published && !localDraftPreview,
    'Requires the local draft preview.',
  );
  const firstHeadings = markdown
    .split('<!--nextpage-->')
    .map((part) => part.match(/^## (.+)$/m)?.[1]);
  expect(firstHeadings.length).toBeGreaterThan(1);

  await page.setViewportSize(
    isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  );
  await page.goto(article);
  await expect(page.locator('article h1')).toHaveCount(1);
  await expect(page.locator('[data-article-section="related"]')).toHaveCount(0);
  const body = page.locator('[data-article-section="body"]');
  const sections = body.locator('[data-page-body]');
  const nav = page.getByRole('navigation', { name: '記事のページ' });
  const selected = nav.locator('[aria-current="page"]');
  const previous = nav.getByRole('link', { name: '前へ' });
  const next = nav.getByRole('link', { name: '次へ' });
  const canonical = page.locator('link[rel="canonical"]');
  const expectedCanonical = await canonical.getAttribute('href');
  expect(expectedCanonical).toMatch(new RegExp(`/${slug}/$`));

  const robots = page.locator('meta[name="robots"]');
  if (published) await expect(robots).toHaveCount(0);
  else await expect(robots).toHaveAttribute('content', 'noindex, nofollow');
  await expect(body).not.toContainText('<!--nextpage-->');
  await expect(sections).toHaveCount(firstHeadings.length);
  await expect(
    sections.nth(0).getByRole('heading', { level: 2 }).first(),
  ).toHaveText(firstHeadings[0]!);
  await expect(sections.nth(1)).toBeHidden();
  await expect(selected).toHaveText('1');
  await expect(previous).toBeHidden();
  expect((await next.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await selected.focus();
  await page.keyboard.press('Tab');
  await expect(nav.getByRole('link', { name: '2', exact: true })).toBeFocused();

  await next.click();
  await expect(page).toHaveURL(/\?page=2$/);
  await expect(sections.nth(0)).toBeHidden();
  await expect(
    sections.nth(1).getByRole('heading', { level: 2 }).first(),
  ).toHaveText(firstHeadings[1]!);
  await expect(selected).toHaveText('2');
  await expect(previous).toHaveAttribute('href', '?page=1');

  await page.goBack();
  await expect(selected).toHaveText('1');
  await expect(sections.nth(0)).toBeVisible();
  await page.goForward();
  await expect(selected).toHaveText('2');
  await expect(sections.nth(1)).toBeVisible();

  await page.goto(article + '?page=2');
  await expect(selected).toHaveText('2');
  await expect(body.locator('[data-page-body]:visible')).toHaveCount(1);
  await expect(canonical).toHaveAttribute('href', expectedCanonical!);
  await expect(page.locator('article img').first()).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('article img')
        .first()
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);

  await next.click();
  await expect(selected).toHaveText('3');
  const contentImage = sections.nth(2).getByRole('img').first();
  await expect(contentImage).toBeVisible();
  await expect
    .poll(() =>
      contentImage.evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
  await previous.click();
  await expect(selected).toHaveText('2');
  await expect(canonical).toHaveAttribute('href', expectedCanonical!);

  if (isMobile) await page.setViewportSize({ width: 360, height: 800 });
  const last = String(firstHeadings.length);
  await nav.getByRole('link', { name: last, exact: true }).click();
  await expect(selected).toHaveText(last);
  await expect(next).toBeHidden();
  await expect(sections.last().getByRole('link').first()).toHaveAttribute(
    'href',
    /^https?:\/\//,
  );
  expect(
    await nav.evaluate((element) => element.scrollWidth),
  ).toBeLessThanOrEqual(await nav.evaluate((element) => element.clientWidth));
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => document.documentElement.clientWidth),
  );

  await page.goto(article + '?page=0');
  await expect(selected).toHaveText('1');
  await expect(page).toHaveURL(new RegExp(`/${slug}/$`));
});

test('public articles without a marker retain their body, media, SEO and listing', async ({
  page,
}) => {
  await page.goto(publicArticle + '?page=2');
  await expect(page.locator('article h1')).toHaveCount(1);
  await expect(
    page.locator('[data-article-section="introduction"]'),
  ).toHaveCount(0);
  const body = page.locator('[data-article-section="body"]');
  await expect(body.getByRole('heading')).toHaveCount(6);
  await expect(body.getByRole('heading').last()).toBeVisible();
  await expect(body.getByRole('img')).toBeVisible();
  await expect
    .poll(() =>
      body
        .getByRole('img')
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(
    page.getByRole('navigation', { name: '記事のページ' }),
  ).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /china-fourth-generation-air-to-air-missiles-technological-advancements-that-transcend-range\/$/,
  );

  await page.goto('./insights/');
  await expect(
    page.locator('main a[href*="china-fourth-generation-air-to-air-missiles"]'),
  ).toBeVisible();
  if (!published)
    await expect(page.locator(`main a[href*="${slug}"]`)).toHaveCount(0);
});

test('draft article is absent from normal builds, including query URLs', async ({
  page,
}) => {
  test.skip(
    published || localDraftPreview,
    'The article is published or deliberately exposed in local preview.',
  );
  for (const suffix of ['', '?page=2']) {
    const response = await page.goto(article + suffix);
    expect(response?.status()).toBe(404);
    await expect(page.locator('[data-article-section="body"]')).toHaveCount(0);
  }
});
