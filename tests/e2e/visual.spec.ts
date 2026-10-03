import { test } from '@playwright/test';

const routes = [
  ['home', './'],
  ['catalogue', './radiolink/'],
  ['product', './radiolink/rc8x/'],
  ['rc8p', './radiolink/rc8p/'],
  ['t12d', './radiolink/t12d/'],
  ['r16f', './radiolink/r16f/'],
  ['r12f', './radiolink/r12f/'],
  ['r8fg', './radiolink/r8fg/'],
  ['r7fg', './radiolink/r7fg/'],
  ['r6fg', './radiolink/r6fg/'],
  ['manuals-category', './manuals/'],
  ['manual', './manuals/rc8x/'],
  ['manual-chapter-01', './manuals/rc8x/chapter-01/'],
  ['manual-chapter-02', './manuals/rc8x/chapter-02/'],
  ['support', './support/'],
  ['insights', './insights/'],
  [
    'wordpress-insight',
    './insights/how-to-change-radiolink-t8fb-stick-mode-joystick-calibration/',
  ],
  [
    'wordpress-insight-percent-slug',
    './insights/%e3%83%91%e3%83%88%e3%83%aa%e3%82%aa%e3%83%83%e3%83%88%e3%81%af%e6%a5%b5%e8%b6%85%e9%9f%b3%e9%80%9f%e3%83%9f%e3%82%b5%e3%82%a4%e3%83%ab%e3%82%ad%e3%83%b3%e3%82%b8%e3%83%a3%e3%83%bc%e3%83%ab%e3%82%92/',
  ],
  ['insight-availability', './insights/aircraft-engine-stop/'],
] as const;

for (const [name, path] of routes) {
  test(`capture ${name}`, async ({ page }, testInfo) => {
    await page.goto(path);
    for (const image of await page.locator('img').all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate((element: HTMLImageElement) => element.decode());
    }
    await page.screenshot({
      path: `test-results/screenshots/${testInfo.project.name}-${name}.png`,
      fullPage: true,
      animations: 'disabled',
      scale: 'css',
    });
  });
}

test('capture RC8X review views', async ({ page }, testInfo) => {
  await page.goto('./radiolink/rc8x/');
  const output = (name: string) =>
    `test-results/screenshots/${testInfo.project.name}-rc8x-${name}.png`;
  const middleFeature = page.locator('[data-feature-section="range"]');

  await page.locator('[data-product-section="overview"]').screenshot({
    path: output('hero'),
    animations: 'disabled',
  });
  await middleFeature.scrollIntoViewIfNeeded();
  await middleFeature
    .locator('img')
    .evaluate((image: HTMLImageElement) => image.decode());
  await middleFeature.screenshot({
    path: output('feature-middle'),
    animations: 'disabled',
  });
  await page.locator('[data-product-section="specifications"]').screenshot({
    path: output('specifications'),
    animations: 'disabled',
  });
  await page.locator('[data-product-section="videos"]').screenshot({
    path: output('videos'),
    animations: 'disabled',
  });
  await page.locator('[data-product-section="faq"]').screenshot({
    path: output('faq'),
    animations: 'disabled',
  });
});
