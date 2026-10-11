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
    expect(await page.locator('[data-semantic-section]').count()).toBe(
      manual.semantic_sections!.length,
    );
    for (const label of await page
      .locator(
        'main h1, main h2, main h3, main h4, main h5, main h6, starlight-toc a, mobile-starlight-toc a',
      )
      .allTextContents())
      expect(label).not.toMatch(
        /原資料.*ページ|[（(]\s*\d+\s*ページ\s*[）)]\s*$|^ページ\s*\d+$/,
      );
    const headings = manual.semantic_sections!.filter(
      (section) => section.title,
    );
    const navigation = (
      await page
        .locator('starlight-toc a, mobile-starlight-toc a')
        .allTextContents()
    ).map((label) => label.trim());
    for (const [index, section] of headings.entries()) {
      expect(navigation).toContain(section.title);
      const target = page.locator(`[id="${section.id}"]`);
      await expect(target).toHaveCount(1);
      const toc = page.locator(
        `.sl-markdown-content a[href="#${encodeURIComponent(section.id)}"]`,
      );
      await expect(toc).toHaveCount(1);
      // All destinations are checked; exercise first/middle/last navigation without repeated long-page smooth scrolling.
      if (
        [0, Math.floor(headings.length / 2), headings.length - 1].includes(
          index,
        )
      ) {
        await toc.click();
        expect(decodeURIComponent(new URL(page.url()).hash.slice(1))).toBe(
          section.id,
        );
      }
    }
    for (const source of manual.sections)
      await expect(page.locator(`[id="${source.id}"]`)).toHaveCount(1);
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
    if (info.project.name === 'mobile' && manual.product === 'rc8x') {
      const toc = page.locator('mobile-starlight-toc');
      await toc.locator('summary').click();
      await page.screenshot({ path: info.outputPath('manual-mobile-toc.png') });
      await toc
        .getByText('R8FG 受信機', { exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: info.outputPath('manual-mobile-receiver-toc.png'),
      });
      await toc.locator('summary').click();
    }
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
    1,
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
