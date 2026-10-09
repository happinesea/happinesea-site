import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const production = process.env.PUBLICATION_MODE === 'production';
const publicBase = production
  ? 'https://happinesea.com/'
  : 'https://happinesea.github.io/happinesea-site/';
const alias = JSON.parse(
  readFileSync('src/data/cutover-compatibility.json', 'utf8'),
).aliases[0];
for (const route of [
  '',
  'radiolink/',
  'radiolink/rc8x/',
  'manuals/rc8x/',
  'downloads/',
  'drawinglibrary/',
  'drone-rc-glossary/',
  alias.target_route.slice(1),
]) {
  test(`${production ? 'production' : 'staging'} root/base ${route || 'home'}`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    const cms: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('request', (r) => {
      if (/cms\.happinesea\.com|\/wp-json\//.test(r.url())) cms.push(r.url());
    });
    expect((await page.goto('./' + route))?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute('href');
    if (production) expect(canonical).toMatch(/^https:\/\/happinesea\.com\//);
    if (route === '') expect(canonical).toBe(publicBase);
    for (const image of await page.locator('img:visible').all()) {
      await image.scrollIntoViewIfNeeded();
      expect(
        await image.evaluate((img: HTMLImageElement) =>
          img.decode().then(() => img.naturalWidth),
        ),
      ).toBeGreaterThan(0);
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);
    expect(errors).toEqual([]);
    expect(cms).toEqual([]);
    await page.screenshot({
      path: `test-results/screenshots/${production ? 'production' : 'staging'}-${info.project.name}-${route.replaceAll('/', '_') || 'home'}.png`,
      fullPage: true,
    });
  });
}
