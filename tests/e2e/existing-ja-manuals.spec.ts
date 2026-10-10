import { test, expect } from '@playwright/test';
import inventory from '../../src/data/manuals/existing-ja.json' with { type: 'json' };

for (const manual of inventory.manuals.filter(
  (manual) => manual.publication_status === 'publication_copy',
)) {
  test(`existing Japanese manual ${manual.route}`, async ({
    page,
    baseURL,
    request,
  }, info) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('request', (request) => {
      if (request.url().includes('cms.happinesea.com'))
        errors.push('CMS runtime request');
    });
    const response = await page.goto(
      new URL(manual.route.slice(1), baseURL).href,
    );
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toContainText(manual.title);
    const origin = baseURL?.includes('/happinesea-site/')
      ? 'https://happinesea.github.io/happinesea-site/'
      : 'https://happinesea.com/';
    expect(
      await page.locator('link[rel="canonical"]').getAttribute('href'),
    ).toBe(new URL(manual.route.slice(1), origin).href);
    expect(await page.locator('[data-source-section]').count()).toBe(
      manual.sections.length,
    );
    for (const link of await page
      .locator('.sl-markdown-content a[href^="#"]')
      .evaluateAll((links) =>
        links.map((link) => link.getAttribute('href')!.slice(1)),
      ))
      expect(
        await page
          .locator('[id]')
          .evaluateAll(
            (elements, id) => elements.some((element) => element.id === id),
            decodeURIComponent(link),
          ),
      ).toBe(true);
    for (const image of await page.locator('[data-manual-figure] img').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
        )
        .toBe(true);
      await image.evaluate((img: HTMLImageElement) => img.decode());
    }
    for (const asset of manual.assets.filter((asset) =>
      asset.src.endsWith('.pdf'),
    )) {
      const assetResponse = await request.get(
        new URL(asset.src.slice(1), baseURL).href,
      );
      expect(assetResponse.status()).toBe(200);
      expect(assetResponse.headers()['content-type']).toContain('pdf');
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    // Very long manuals use bounded viewport captures; assertions above still cover every image/anchor.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath('manual-top.png') });
    const firstFigure = page.locator('[data-manual-figure]').first();
    await firstFigure.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath('manual-figure.png') });
    const correctedFigure = page.locator('img[src$="figure-006.svg"]');
    if (await correctedFigure.count()) {
      await correctedFigure.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: info.outputPath('corrected-receiver.png'),
      });
    }
    const table = page.locator('.manual-table').first();
    if (await table.count()) {
      await table.scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath('manual-table.png') });
    }
  });
}

test('manual directory keeps V2, V3 and quick references separate', async ({
  page,
  baseURL,
}) => {
  await page.goto(new URL('manuals/', baseURL).href);
  for (const route of [
    '/manuals/rc4gs-v2/',
    '/manuals/rc4gs-v3/',
    '/manuals/rc8x/',
    '/manuals/rc8x-quick-reference/',
    '/manuals/rc6gs-v3-quick-reference/',
  ])
    await expect(page.locator(`main a[href$="${route}"]`)).toHaveCount(1);
  await expect(page.locator('main a[href$="/manuals/rc6gs-v3/"]')).toHaveCount(
    0,
  );
  await expect(page.locator('main a[href*="rc4gs-legacy"]')).toHaveCount(0);
});

for (const manual of inventory.manuals.filter(
  (manual) => manual.publication_status === 'BLOCKED_SAFETY_REVIEW',
)) {
  test(`safety-excluded manual has no generated route ${manual.route}`, async ({
    request,
    baseURL,
  }) => {
    expect(
      (
        await request.get(new URL(manual.route.slice(1), baseURL).href)
      ).status(),
    ).toBe(404);
  });
}
