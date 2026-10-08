import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
const articles = JSON.parse(
  readFileSync('src/data/wordpress-insights.json', 'utf8'),
);
for (const id of [1998, 1895, 1857]) {
  test(`owner-approved article ${id} preserves exact legacy canonical and safe images`, async ({
    page,
    request,
  }) => {
    const article = articles.find(
      (x: { contract: { id: number } }) => x.contract.id === id,
    );
    const cms: string[] = [];
    const errors: string[] = [];
    page.on('request', (r) => {
      if (new URL(r.url()).hostname === 'cms.happinesea.com') cms.push(r.url());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    for (const path of [article.route, new URL(article.canonical).pathname]) {
      const response = await page.goto(`.${path}`);
      expect(response?.status()).toBe(200);
      expect(response?.request().redirectedFrom()).toBeNull();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        article.canonical,
      );
      expect(await page.locator('main').innerHTML()).not.toMatch(
        /amazon-adsystem|amzn_assoc_|<iframe|<script/,
      );
      for (const image of await page.locator('main img').all())
        await image.evaluate((node: HTMLImageElement) => {
          node.loading = 'eager';
          return node.decode();
        });
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      ).toBe(0);
      for (const href of await page
        .locator('main a[href]')
        .evaluateAll((nodes) =>
          nodes.map((node) => (node as HTMLAnchorElement).href),
        )) {
        const url = new URL(href);
        if (url.origin === new URL(page.url()).origin)
          expect((await request.get(href)).status()).toBeLessThan(400);
      }
    }
    await page.screenshot({
      path: test.info().outputPath(`${id}.png`),
      fullPage: true,
    });
    expect(cms).toEqual([]);
    expect(errors).toEqual([]);
  });
}
test('905 is an exact noindex rebuild notice, never a completed manual or inferred redirect', async ({
  page,
}) => {
  const response = await page.goto(
    './radiolink-support/minipix-manual/20200511905.html',
  );
  expect(response?.status()).toBe(200);
  expect(response?.request().redirectedFrom()).toBeNull();
  await expect(
    page.getByRole('heading', { name: 'Mini Pixマニュアルは再編中です' }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex,follow',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://happinesea.com/radiolink-support/minipix-manual/20200511905.html',
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  await page.screenshot({
    path: test.info().outputPath('905-notice.png'),
    fullPage: true,
  });
});
