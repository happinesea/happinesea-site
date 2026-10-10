import { expect, test } from '@playwright/test';

test('RC4GS V2 retains all images and animated GIF at the legacy route', async ({
  page,
}) => {
  await page.goto('./radiolink/rc4gs');
  await expect(page.locator('[data-legacy-body] img')).toHaveCount(19);
  await expect(page.locator('[data-legacy-body]')).toContainText('RC4GS V2');
  await expect(
    page.locator('[data-legacy-body] img[src$="3100755.gif"]'),
  ).toHaveCount(1);
  await expect(page.locator('[data-legacy-body] script')).toHaveCount(0);
});

test('RC6GS Kindle identity and query endpoint remain without exposing safety-blocked V3 PDF', async ({
  page,
  request,
}) => {
  await page.goto('./radiolink-productions-manual/rc6gs-manual');
  await expect(page.locator('[data-legacy-body] iframe')).toHaveCount(0);
  await expect(
    page.locator('[data-legacy-body] a[href*="amazon.co.jp/dp/B08NVHK22H"]'),
  ).toHaveCount(2);
  await expect(
    page.locator('[data-legacy-body] a[data-safety-withheld-download]'),
  ).toHaveCount(1);
  expect(
    (await request.get('./downloads/rc6gs-v3-manual-2032.pdf')).status(),
  ).toBe(404);
  await page.goto('./download/rc6gs-v3-manual');
  await expect(page.locator('[data-legacy-body]')).toContainText('20220927');
  await page.goto('./download/rc6gs-v3-manual?wpdmdl=2032', {
    waitUntil: 'load',
  });
  await expect(page.locator('a[data-download-sha256]')).toHaveCount(0);
  await expect(page.locator('[data-safety-withheld-download]')).toHaveCount(2);
  await expect(
    page.locator('[data-safety-withheld-download][download]'),
  ).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('wpdmdl')).toBe('2032');
  await expect(page.locator('meta[http-equiv="refresh"]')).toHaveCount(0);
});
