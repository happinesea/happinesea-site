import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const manifest = JSON.parse(
  readFileSync(
    new URL('../../src/data/wordpress-insight-manifest.json', import.meta.url),
    'utf8',
  ),
);

for (const article of manifest.articles) {
  test(`WordPress batch article ${article.id}`, async ({
    page,
    request,
  }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    const response = await page.goto(`.${article.route}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      article.canonical,
    );
    for (const image of await page.locator('img').all()) {
      await image.scrollIntoViewIfNeeded();
      expect(
        await image.evaluate((element: HTMLImageElement) =>
          element.decode().then(() => element.naturalWidth),
        ),
      ).toBeGreaterThan(0);
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
    const internalLinks = await page
      .locator('a[href]')
      .evaluateAll((links) => [
        ...new Set(
          links
            .map((link) => (link as HTMLAnchorElement).href)
            .filter((href) => new URL(href).origin === location.origin),
        ),
      ]);
    for (const href of internalLinks)
      expect((await request.get(href)).status()).toBeLessThan(400);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `test-results/screenshots/${testInfo.project.name}-wordpress-${article.id}.png`,
      fullPage: true,
    });
  });
}
