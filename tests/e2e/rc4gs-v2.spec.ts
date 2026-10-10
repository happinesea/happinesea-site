import { test, expect } from '@playwright/test';
import manual from '../../src/data/manuals/rc4gs-v2.json' with { type: 'json' };

for (const route of [
  'manuals/rc4gs-v2/',
  'manuals/rc4gs-v2/chapter-01/',
  'manuals/rc4gs-v2/chapter-02/',
]) {
  test(`RC4GS V2 ${route}`, async ({ page, baseURL }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('request', (request) => {
      if (request.url().includes('cms.happinesea.com'))
        errors.push('CMS runtime request');
    });
    const response = await page.goto(new URL(route, baseURL).href);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toContainText(/RC4GS V2/);
    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute('href');
    expect(canonical).toBe(
      new URL(
        route,
        baseURL?.includes('/happinesea-site/')
          ? 'https://happinesea.github.io/happinesea-site/'
          : 'https://happinesea.com/',
      ).href,
    );
    const chapter = route.includes('chapter-01')
      ? 1
      : route.includes('chapter-02')
        ? 2
        : undefined;
    if (chapter) {
      for (const section of manual.sections.filter(
        (item) => item.chapter === chapter,
      )) {
        await expect(
          page.locator(`[data-source-id="${section.id}"]`).first(),
        ).toBeVisible();
        expect(
          await page.locator(`#${section.target.split('#')[1]}`).count(),
        ).toBe(1);
      }
      if (chapter === 1) {
        for (const id of ['s-1-2-1', 's-1-2-2', 's-1-2-3'])
          await expect(page.locator(`#${id}`)).toHaveCount(1);
        await expect(page.locator('[data-source-id="196"]')).toHaveCount(4);
      }
    }
    await page.locator('main img').evaluateAll(async (images) => {
      for (const image of images as HTMLImageElement[]) {
        image.loading = 'eager';
        await image.decode();
        if (!image.naturalWidth) throw new Error('Image decode failure');
      }
    });
    const paths = await page
      .locator('main a[href]')
      .evaluateAll((links) =>
        links.map((link) => (link as HTMLAnchorElement).href),
      );
    for (const href of new Set(paths)) {
      const url = new URL(href);
      if (
        url.origin === new URL(baseURL!).origin &&
        url.pathname !== new URL(baseURL!).pathname
      ) {
        const result = await page.request.get(url.href);
        expect(result.status(), href).toBe(200);
      }
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    // Long chapters get bounded captures; every section/image is asserted above.
    await page.screenshot({
      path: info.outputPath('first-view.png'),
      fullPage: false,
    });
    await page.locator('main').scrollIntoViewIfNeeded();
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight / 2),
    );
    await page.screenshot({
      path: info.outputPath('middle.png'),
      fullPage: false,
    });
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    await page.screenshot({
      path: info.outputPath('end.png'),
      fullPage: false,
    });
  });
}

test('all legacy manual mappings remain accessible with the new canonical destination', async ({
  request,
  baseURL,
}) => {
  for (const mapping of manual.mappings) {
    const response = await request.get(
      new URL('.' + mapping.legacy_path, baseURL).href,
    );
    expect(response.status(), mapping.legacy_path).toBe(200);
    const canonical = 'https://happinesea.com' + mapping.target.split('#')[0];
    expect(await response.text(), mapping.legacy_path).toContain(
      `<link rel="canonical" href="${canonical}"`,
    );
  }
});
