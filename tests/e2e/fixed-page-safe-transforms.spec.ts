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

test('RC6GS ordinary Kindle link and V3 PDF remain separate, with browser query compatibility', async ({
  page,
  request,
}) => {
  await page.goto('./radiolink-productions-manual/rc6gs-manual');
  await expect(page.locator('[data-legacy-body] iframe')).toHaveCount(0);
  await expect(
    page.locator('[data-legacy-body] a[href*="amazon.co.jp/dp/B08NVHK22H"]'),
  ).toHaveCount(2);
  const pdf = page.locator(
    '[data-legacy-body] a[href$="rc6gs-v3-manual-2032.pdf"]',
  );
  await expect(pdf).toHaveCount(1);
  const response = await request.get((await pdf.getAttribute('href')) ?? '');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/pdf');
  expect((await response.body()).length).toBe(9946163);
  await page.goto('./download/rc6gs-v3-manual');
  await expect(page.locator('[data-legacy-body]')).toContainText('20220927');
  const handoff = page.waitForRequest((request) =>
    request.url().endsWith('/downloads/rc6gs-v3-manual-2032.pdf'),
  );
  await page.goto('./download/rc6gs-v3-manual?wpdmdl=2032', {
    waitUntil: 'commit',
  });
  expect((await request.get((await handoff).url())).status()).toBe(200);
});
