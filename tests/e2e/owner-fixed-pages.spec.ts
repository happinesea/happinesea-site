import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const source = JSON.parse(
  readFileSync(
    new URL('../fixtures/owner-fixed-pages-source.json', import.meta.url),
    'utf8',
  ),
);

test('privacy policy retains every formal paragraph with conditional supplements and no CMS request', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  const cms: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('request', (r) => {
    if (new URL(r.url()).hostname === 'cms.happinesea.com') cms.push(r.url());
  });
  expect((await page.goto('./privacy-policy/'))?.status()).toBe(200);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://happinesea.com/privacy-policy',
  );
  const retained = await page.evaluate((html) => {
    const original = new DOMParser().parseFromString(html, 'text/html');
    const baseline = [...original.querySelectorAll('h2,h3,p')].map(
      (n) => n.textContent,
    );
    const actual = [
      ...document.querySelectorAll(
        '[data-legacy-body] h2,[data-legacy-body] h3,[data-legacy-body] p',
      ),
    ].map((n) => n.textContent);
    return actual
      .slice(0, baseline.length)
      .every((text, i) => text === baseline[i]);
  }, source.privacy_policy.content_html);
  expect(retained).toBe(true);
  await expect(page.locator('[data-legacy-body]')).toContainText(
    '現在導入していません',
  );
  expect(
    await page
      .locator(
        'script[src*="googletagmanager.com"],script[src*="google-analytics.com"],script[src*="googlesyndication.com"]',
      )
      .count(),
  ).toBe(0);
  expect(await page.locator('a[href*="cms.happinesea.com"]').count()).toBe(0);
  for (const href of await page
    .locator('a')
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLAnchorElement).href))) {
    if (new URL(href).origin === new URL(page.url()).origin)
      expect((await request.get(href)).status()).toBeLessThan(400);
  }
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  expect(cms).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath('privacy-policy.png'),
    fullPage: true,
  });
});

test('Byme-A legacy index links all six preserved chapters without ads or CMS requests', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  const cms: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    if (new URL(request.url()).hostname === 'cms.happinesea.com')
      cms.push(request.url());
  });
  const response = await page.goto(
    './radiolink-productions-manual/byme-a-manual/',
  );
  expect(response?.status()).toBe(200);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://happinesea.com/radiolink-productions-manual/byme-a-manual',
  );
  const links = await page
    .locator('[data-legacy-body] a')
    .evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLAnchorElement).href),
    );
  expect(links.length).toBe(6);
  for (const href of links) {
    expect(new URL(href).origin).toBe(new URL(page.url()).origin);
    expect((await request.get(href)).status()).toBe(200);
  }
  for (const image of await page.locator('main img').all())
    await image.evaluate((node: HTMLImageElement) => {
      node.loading = 'eager';
      return node.decode();
    });
  expect(await page.locator('main').innerHTML()).not.toMatch(
    /amazon|<iframe|<script/i,
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  expect(cms).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath('byme-a-index.png'),
    fullPage: true,
  });
});

test('withdrawn style-guide is HTTP 404 with no inferred redirect', async ({
  page,
}) => {
  for (const route of ['./style-guide', './style-guide/']) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(404);
    expect(response?.request().redirectedFrom()).toBeNull();
  }
});
