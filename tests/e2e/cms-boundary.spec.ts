import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const manifest = JSON.parse(
  readFileSync('src/data/wordpress-insight-manifest.json', 'utf8'),
);

test('static homepage, article list and article aliases do not request the CMS', async ({
  page,
}) => {
  const cmsRequests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).hostname === 'cms.happinesea.com')
      cmsRequests.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  for (const path of ['./', './insights/']) {
    expect((await page.goto(path))?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
  }
  const article = manifest.articles[0];
  for (const path of [article.route, new URL(article.canonical).pathname]) {
    expect((await page.goto(`.${path}`))?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      article.canonical,
    );
    for (const image of await page.locator('main img').all()) {
      await image.evaluate((node: HTMLImageElement) => {
        node.loading = 'eager';
        return node.decode();
      });
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
  }
  expect(cmsRequests).toEqual([]);
  expect(errors).toEqual([]);
});
