import { expect, test, type Page } from '@playwright/test';

const routes = [
  ['home', './'],
  ['catalogue', './radiolink/'],
  ['product', './radiolink/rc8x/'],
  ['manual', './manuals/rc8x/'],
  ['manual chapter 1', './manuals/rc8x/chapter-01/'],
  ['manual chapter 2', './manuals/rc8x/chapter-02/'],
  ['insights', './insights/'],
  ['article', './insights/aircraft-engine-stop/'],
] as const;

function captureErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

for (const [name, path] of routes) {
  test(`${name} renders without browser errors or horizontal overflow`, async ({
    page,
  }) => {
    const errors = captureErrors(page);
    const response = await page.goto(path);

    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('h1').first()).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test('navigation, category filtering, and LINE support work', async ({
  page,
}) => {
  const errors = captureErrors(page);
  await page.goto('./');
  await page.getByRole('link', { name: '製品を見る', exact: true }).click();
  await expect(page).toHaveURL(/\/happinesea-site\/radiolink\/$/);

  await page.getByRole('button', { name: '受信機', exact: true }).click();
  await expect(page.locator('[data-result-count]')).toHaveText('0件を表示');
  await expect(page.locator('[data-product-category]:visible')).toHaveCount(0);

  await page.getByRole('button', { name: '送信機', exact: true }).click();
  await expect(page.locator('[data-result-count]')).toHaveText('1件を表示');
  await expect(page.locator('[data-product-category]:visible')).toHaveCount(1);

  await page.goto('./radiolink/rc8x/');
  await expect(
    page.getByRole('link', { name: '日本語マニュアル' }),
  ).toHaveAttribute('href', '/happinesea-site/manuals/rc8x/');
  await expect(
    page.getByRole('link', { name: '英語マニュアル' }),
  ).toHaveAttribute('target', '_blank');
  await expect(page.getByRole('link', { name: 'LINEで相談' })).toHaveAttribute(
    'href',
    'https://line.me/R/ti/p/%40662zyrsb',
  );
  await expect(page.locator('[data-product-nav]')).toBeVisible();
  await expect(page.locator('[data-product-section="manuals"]')).toHaveCount(0);
  await expect(page.locator('[data-product-section="support"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('same-origin links return successful responses', async ({
  page,
  request,
}) => {
  const links = new Set<string>();

  for (const [, path] of routes) {
    await page.goto(path);
    const pageUrl = page.url();
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((anchors) =>
        anchors.map((anchor) => anchor.getAttribute('href')).filter(Boolean),
      );
    for (const href of hrefs) {
      const url = new URL(href!, pageUrl);
      if (url.origin === new URL(pageUrl).origin) {
        url.hash = '';
        links.add(url.href);
      }
    }
  }

  for (const url of links) {
    const response = await request.get(url);
    expect(response.status(), url).toBeLessThan(400);
  }
});

test('RC8X product images return successful responses', async ({
  page,
  request,
}) => {
  await page.goto('./radiolink/rc8x/');
  const pageUrl = page.url();
  const sources = await page
    .locator('img[src]')
    .evaluateAll((images) =>
      images.map((image) => image.getAttribute('src')).filter(Boolean),
    );

  expect(sources.length).toBeGreaterThan(15);
  for (const source of sources) {
    const url = new URL(source!, pageUrl);
    const response = await request.get(url.href);
    expect(response.status(), url.href).toBeLessThan(400);
  }
});
