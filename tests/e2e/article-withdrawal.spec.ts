import { expect, test } from '@playwright/test';

test('owner-retired article has the existing 404, not a redirect or article', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto('./experience/202107081627.html');
  expect(response?.status()).toBe(404);
  expect(response?.request().redirectedFrom()).toBeNull();
  await expect(
    page.getByRole('heading', { name: 'ページが見つかりません' }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex',
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  await page.screenshot({
    path: test.info().outputPath('retired-1627.png'),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
