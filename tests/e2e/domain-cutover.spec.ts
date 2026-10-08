import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';

const data = (name: string) =>
  JSON.parse(readFileSync(`src/data/${name}.json`, 'utf8'));
const articles = data('wordpress-insight-manifest').articles;
const compatibility = data('legacy-compatibility').pages;
const routes = [
  ...new Set<string>([
    '/',
    '/insights/',
    '/radiolink/',
    '/manuals/',
    '/support/',
    '/radiolink/updates/',
    '/radiolink/rc8x/',
    '/radiolink/rc8p/',
    '/radiolink/t12d/',
    ...articles.map((x: { route: string }) => x.route),
    ...compatibility.map((x: { target_route: string }) => x.target_route),
  ]),
];
const captures = new Set([
  '/',
  '/drawinglibrary',
  '/drone-rc-glossary',
  '/radiolink/rc4gs',
  '/radiolink-productions-manual/rc6gs-manual',
]);
for (const type of [
  'faq',
  'category_archive',
  'drawing',
  'download_endpoint',
]) {
  const record = compatibility.find((x: { type: string }) => x.type === type);
  if (record) captures.add(record.target_route);
}
const byme = articles.find((x: { id: number }) => x.id === 1673);
if (byme) captures.add(byme.route);

for (const route of routes)
  test(`deployed cutover browser ${route}`, async ({ page }, info) => {
    test.setTimeout(60000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    const failures: string[] = [];
    const oldRuntime: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        message.location().url.startsWith('https://happinesea.github.io/')
      )
        errors.push(message.text());
    });
    page.on('response', (response) => {
      if (
        response.url().startsWith('https://happinesea.github.io/') &&
        response.status() >= 400
      )
        failures.push(`${response.status()} ${response.url()}`);
    });
    page.on('request', (request) => {
      if (new URL(request.url()).hostname === 'happinesea.com')
        oldRuntime.push(request.url());
    });
    const response = await page.goto(`.${route}`, {
      waitUntil: 'domcontentloaded',
    });
    const imageErrors: string[] = [];
    for (const image of await page.locator('img').all()) {
      if (!(await image.isVisible())) continue;
      await image.scrollIntoViewIfNeeded();
      try {
        await image.evaluate((element: HTMLImageElement) => element.decode());
        expect(
          await image.evaluate(
            (element: HTMLImageElement) => element.naturalWidth,
          ),
        ).toBeGreaterThan(0);
      } catch {
        imageErrors.push((await image.getAttribute('src')) ?? 'missing src');
      }
    }
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute('href');
    const id = `${info.project.name}-${createHash('sha256').update(route).digest('hex').slice(0, 12)}`;
    await mkdir('.superpowers/cutover-browser', { recursive: true });
    await writeFile(
      `.superpowers/cutover-browser/${id}.json`,
      JSON.stringify(
        {
          route,
          project: info.project.name,
          status: response?.status(),
          canonical,
          errors,
          failures,
          image_errors: imageErrors,
          old_origin_runtime: oldRuntime,
          overflow,
        },
        null,
        2,
      ),
    );
    if (captures.has(route)) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `.superpowers/cutover-browser/${id}.png`,
        fullPage: true,
      });
    }
    expect(response?.status()).toBe(200);
    expect(overflow).toBe(0);
    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
    expect(imageErrors).toEqual([]);
    expect(oldRuntime).toEqual([]);
  });
