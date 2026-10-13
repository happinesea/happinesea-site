import { expect, test } from '@playwright/test';
import inventory from '../../docs/rc8x-rc8p-publication-inventory.json' with { type: 'json' };

for (const product of inventory.products) {
  for (const route of product.pages) {
    test(`${route.route} full manual assets, videos, fragments and responsive layout`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = [];
      const failedAssets: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('response', (response) => {
        if (response.url().includes('/assets/') && response.status() >= 400)
          failedAssets.push(response.url());
      });
      // Player availability is external; test our iframe contract without third-party scripts.
      await page.route('https://www.youtube-nocookie.com/**', (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: '<title>Video fixture</title>',
        }),
      );
      const response = await page.goto(`.${route.route}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex, nofollow',
      );
      if (testInfo.project.name === 'mobile') {
        await page.locator('.sl-menu-button').click();
        await expect(page.locator('#starlight__sidebar')).toBeVisible();
        await page.locator('.sl-menu-button').click();
        await page.locator('#starlight__mobile-toc summary').click();
        const link = page
          .locator('#starlight__mobile-toc a[href^="#"]')
          .first();
        await expect(link).toBeVisible();
        await link.click();
      } else {
        const link = page.locator('starlight-toc a[href^="#"]').first();
        await expect(link).toBeVisible();
        await link.click();
      }
      const actual = page.locator('[data-source-figure]');
      await actual.evaluateAll(async (nodes) => {
        for (const node of nodes) {
          const image = node.querySelector('img')!;
          image.loading = 'eager';
          await image.decode();
        }
      });
      expect(
        await actual.evaluateAll((nodes) =>
          nodes.every((node) => {
            const image = node.querySelector('img')!;
            return (
              image.naturalWidth > 0 &&
              image.width <= document.documentElement.clientWidth
            );
          }),
        ),
      ).toBe(true);
      const expectedVideos = product.videos.filter(
        (video) => video.route === route.route,
      );
      await expect(page.locator('[data-manual-video] iframe')).toHaveCount(
        expectedVideos.length,
      );
      for (const video of expectedVideos) {
        const frame = page
          .locator(
            `iframe[src="https://www.youtube-nocookie.com/embed/${video.video_id}"]`,
          )
          .first();
        const bounds = await frame.boundingBox();
        expect(bounds).not.toBeNull();
        expect(Math.abs(bounds!.width / bounds!.height - 16 / 9)).toBeLessThan(
          0.03,
        );
      }
      for (const anchor of route.legacy_anchors ?? [])
        expect(
          await page
            .locator('[id]')
            .evaluateAll(
              (nodes, id) => nodes.some((node) => node.id === id),
              anchor.id,
            ),
        ).toBe(true);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      ).toBe(0);
      expect(
        await page
          .locator('table')
          .evaluateAll((nodes) =>
            nodes.every(
              (node) =>
                node.getBoundingClientRect().width <=
                document.documentElement.clientWidth,
            ),
          ),
      ).toBe(true);
      await expect(page.locator('nav[aria-label="メイン"]')).toBeAttached();
      await page.screenshot({ path: testInfo.outputPath('manual.png') });
      if (await actual.count())
        await actual
          .first()
          .screenshot({ path: testInfo.outputPath('first-figure.png') });
      if (await page.locator('table').count())
        await page
          .locator('table')
          .first()
          .screenshot({ path: testInfo.outputPath('first-table.png') });
      expect(failedAssets).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}

test('both full manuals are reachable from the directory and product pages', async ({
  page,
  baseURL,
}) => {
  await page.goto('./manuals/');
  for (const product of ['rc8x', 'rc8p']) {
    const link = page
      .locator(`[data-manual-card="${product}"]`)
      .getByRole('link', { name: '取扱説明書', exact: true });
    await expect(link).toHaveAttribute(
      'href',
      new URL(`manuals/${product}/`, baseURL).pathname,
    );
    await page.goto(`./radiolink/${product}/`);
    await expect(
      page.getByRole('link', { name: '日本語マニュアル', exact: true }),
    ).toHaveAttribute('href', new URL(`manuals/${product}/`, baseURL).pathname);
    await page.goto('./manuals/');
  }
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
});
