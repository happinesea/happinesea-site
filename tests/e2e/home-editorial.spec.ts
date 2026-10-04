import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const articles = JSON.parse(
  readFileSync('src/data/wordpress-insights.json', 'utf8'),
) as {
  slug: string;
  published_at: string;
  hero: { src: string; alt: string };
}[];

test('home prioritizes the latest article and real hobby resources', async ({
  page,
  request,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('./');
  await page.getByRole('button', { name: '自動切替を停止' }).click();
  const latest = [...articles].sort(
    (a, b) => Date.parse(b.published_at) - Date.parse(a.published_at),
  )[0];
  const featured = page.locator('[data-home-latest]');
  await expect(featured).toHaveCount(1);
  await expect(
    page.locator(
      `[data-home-section="news"] a[href="/happinesea-site/insights/${latest.slug}/"], [data-home-section="rc-drone"] a[href="/happinesea-site/insights/${latest.slug}/"]`,
    ),
  ).toHaveCount(0);
  await expect(featured.getByRole('link').first()).toHaveAttribute(
    'href',
    `/happinesea-site/insights/${latest.slug}/`,
  );
  await expect(featured.locator('time')).toHaveAttribute(
    'datetime',
    new Date(latest.published_at).toISOString(),
  );
  await expect(featured.locator('img')).toHaveAttribute(
    'src',
    `/happinesea-site${latest.hero.src}`,
  );
  await expect(featured.locator('img')).toHaveAttribute('alt', latest.hero.alt);
  await expect(featured.locator('[data-home-category]')).toHaveText([
    'Radiolink製品サポート',
    'ニュース・航空知識',
  ]);
  const sections = page.locator('[data-home-section]');
  expect(
    await sections.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-home-section')),
    ),
  ).toEqual([
    'latest',
    'news',
    'rc-drone',
    'drawings',
    'glossary',
    'radiolink',
  ]);
  await expect(page.locator('[data-home-brand] img')).toHaveCount(0);
  await expect(
    page.locator('[data-home-brand] a[href*="/radiolink/"]'),
  ).toHaveCount(0);
  const imageBox = await featured.locator('img').boundingBox();
  const textBox = await featured
    .locator('[data-home-article-text]')
    .boundingBox();
  expect(imageBox).not.toBeNull();
  expect(textBox).not.toBeNull();
  if (isMobile)
    expect(imageBox!.y + imageBox!.height).toBeLessThanOrEqual(textBox!.y);
  else {
    expect(imageBox!.y + imageBox!.height).toBeLessThanOrEqual(textBox!.y);
    const brandBox = await page.locator('[data-home-brand]').boundingBox();
    const carouselBox = await page
      .locator('[data-hero-carousel]')
      .boundingBox();
    expect(brandBox!.x + brandBox!.width).toBeLessThanOrEqual(carouselBox!.x);
    await expect(
      page.getByRole('navigation', { name: 'メインナビゲーション' }),
    ).toBeVisible();
  }
  for (const image of await page.locator('main img').all()) {
    expect(
      (await request.get((await image.getAttribute('src'))!)).status(),
    ).toBe(200);
    await image.evaluate((node: HTMLImageElement) => node.decode());
  }
  const links = await page
    .locator('a[href]')
    .evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLAnchorElement).href),
    );
  for (const url of new Set(links)) {
    if (new URL(url).origin === new URL(page.url()).origin)
      expect((await request.get(url)).status(), url).toBe(200);
  }
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  expect(errors).toEqual([]);
  await page.goto('./');
  await page.getByRole('button', { name: '自動切替を停止' }).click();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({
    path: `test-results/hero-${isMobile ? 'mobile' : 'desktop'}.png`,
    fullPage: false,
    scale: 'css',
  });
  const heroHeight = await page
    .locator('[data-home-section="latest"]')
    .evaluate((node) => node.getBoundingClientRect().height);
  const width = page.viewportSize()!.width;
  await page.setViewportSize({ width, height: Math.ceil(heroHeight + 80) });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({
    path: `test-results/hero-${isMobile ? 'mobile' : 'desktop'}-complete.png`,
    scale: 'css',
  });
});
