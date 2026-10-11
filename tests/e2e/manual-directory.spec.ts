import { test, expect } from '@playwright/test';
import { capturePublicationScreenshot } from './helpers/publication-screenshot.mjs';

test('manual directory groups editions, filters models and keeps official links external', async ({
  page,
  baseURL,
  request,
}, info) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/cms\.happinesea\.com|\/wp-json\//.test(request.url()))
      errors.push('CMS runtime request');
  });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(new URL('manuals/', baseURL).href);
  await expect(page.locator('main h1')).toHaveText('取扱説明書');
  const cards = page.locator('[data-manual-card]');
  await expect(cards).toHaveCount(6);
  await expect(page.locator('[data-result-count]')).toHaveText('6件を表示');
  const rc4gs = page.locator('[data-manual-card="rc4gs"]');
  await expect(
    rc4gs.getByRole('link', { name: '取扱説明書（V2）', exact: true }),
  ).toHaveCount(1);
  await expect(
    rc4gs.getByRole('link', { name: '取扱説明書（V3）', exact: true }),
  ).toHaveCount(1);
  for (const image of await page.locator('main img').all()) {
    await image.scrollIntoViewIfNeeded();
    expect(
      await image.evaluate(
        (element: HTMLImageElement) =>
          element.complete && element.naturalWidth > 0,
      ),
    ).toBe(true);
    expect(
      (await request.get((await image.getAttribute('src'))!)).status(),
    ).toBe(200);
  }
  for (const link of await page.locator('main a').all()) {
    const href = (await link.getAttribute('href'))!;
    if (href.startsWith('https://')) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(link).toContainText('公式サイト');
    } else expect((await request.get(href)).status()).toBe(200);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await capturePublicationScreenshot(
    page,
    info.outputPath('manual-directory.png'),
  );
  await rc4gs.screenshot({ path: info.outputPath('rc4gs-card.png') });
  await page
    .getByRole('button', { name: 'フライトコントローラー', exact: true })
    .click();
  await expect(page.locator('[data-manual-card]:visible')).toHaveCount(2);
  await expect(page.locator('[data-result-count]')).toHaveText('2件を表示');
  await expect(rc4gs).toBeHidden();
  await capturePublicationScreenshot(
    page,
    info.outputPath('manual-directory-filtered.png'),
  );
  await page.getByRole('button', { name: '送信機', exact: true }).click();
  await expect(page.locator('[data-manual-card]:visible')).toHaveCount(4);
  await page.getByRole('button', { name: 'すべて', exact: true }).click();
  await expect(page.locator('[data-manual-card]:visible')).toHaveCount(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});
