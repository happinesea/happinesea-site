import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
const review = JSON.parse(
  readFileSync(
    new URL('../fixtures/wordpress-phase6-review-batch4.json', import.meta.url),
    'utf8',
  ),
);
for (const path of [
  '/news/202006281075.html',
  '/news/202006281086.html',
  '/rc4gs-manual',
]) {
  test(`RC4GS linked compatibility ${path}`, async ({
    page,
    request,
  }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    const evidence = review.link_evidence.find(
      (x: { url: string }) => new URL(x.url).pathname === path,
    );
    const response = await page.goto(`.${path}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      evidence.canonical,
    );
    for (const image of await page.locator('img').all()) {
      await image.scrollIntoViewIfNeeded();
      expect(
        await image.evaluate((img: HTMLImageElement) =>
          img.decode().then(() => img.naturalWidth),
        ),
      ).toBeGreaterThan(0);
      expect(
        new URL((await image.getAttribute('src')) ?? '', page.url()).origin,
      ).toBe(new URL(page.url()).origin);
    }
    const hrefs = await page
      .locator('main a[href]')
      .evaluateAll((links) => links.map((x) => (x as HTMLAnchorElement).href));
    for (const href of new Set(hrefs)) {
      if (new URL(href).origin === new URL(page.url()).origin)
        expect((await request.get(href)).status(), href).toBeLessThan(400);
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
    expect(errors).toEqual([]);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/screenshots/${testInfo.project.name}-rc4gs-compat-${path.includes('1075') ? '1075' : path.includes('1086') ? '1086' : 'index'}.png`,
      fullPage: true,
    });
  });
}
