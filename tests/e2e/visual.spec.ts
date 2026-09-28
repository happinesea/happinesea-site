import { test } from '@playwright/test';

const routes = [
  ['home', './'],
  ['catalogue', './radiolink/'],
  ['product', './radiolink/rc8x/'],
  ['manual', './manuals/rc8x/'],
  ['insights', './insights/'],
  ['article', './insights/aircraft-engine-stop/'],
] as const;

for (const [name, path] of routes) {
  test(`capture ${name}`, async ({ page }, testInfo) => {
    await page.goto(path);
    await page.screenshot({
      path: `test-results/screenshots/${testInfo.project.name}-${name}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  });
}
