import { expect, test } from '@playwright/test';

test('occupied root and Radiolink catalogue stay Git-owned and retain staging canonicals', async ({
  page,
}) => {
  for (const [route, canonical] of [
    ['', 'https://happinesea.github.io/happinesea-site/'],
    ['radiolink/', 'https://happinesea.github.io/happinesea-site/radiolink/'],
  ]) {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    expect((await page.goto(route || './'))?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      canonical,
    );
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
    if (route)
      await expect(page.locator('[data-product-catalogue]')).toHaveCount(1);
    else await expect(page.locator('h1')).toContainText('夢を現実に');
    expect(errors).toEqual([]);
  }
});

test('preserved manual links keep their real destinations and legacy query/hash', async ({
  page,
  request,
}) => {
  await page.goto('./radiolink-q-and-a/rssi-test?compat=1#');
  expect(new URL(page.url()).searchParams.get('compat')).toBe('1');
  const faq = page.locator('[data-legacy-body] a').first();
  await expect(faq).toHaveAttribute(
    'href',
    '/happinesea-site/radiolink-q-and-a/radiolink-wheeler-faq#',
  );
  expect(
    (await request.get((await faq.getAttribute('href')) ?? '')).status(),
  ).toBe(200);
  await page.goto('./radiolink-productions-manual/pixhawk-user-manual');
  await expect(page.locator('[data-legacy-body] a')).toHaveAttribute(
    'href',
    'https://radiolink.com/pixhawk_manual',
  );
  await expect(page.locator('[data-legacy-body]')).toContainText(
    '日本語版(準備中)',
  );
});
