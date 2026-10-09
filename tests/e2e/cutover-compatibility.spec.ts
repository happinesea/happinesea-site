import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
const data = JSON.parse(
  readFileSync('src/data/cutover-compatibility.json', 'utf8'),
);
const snapshot = JSON.parse(
  readFileSync('src/data/legacy-compatibility.json', 'utf8'),
);
const files = JSON.parse(
  readFileSync('src/data/static-downloads.json', 'utf8'),
).files;
const publicationBase =
  process.env.PUBLICATION_MODE === 'production' ? '' : '/happinesea-site';
const targets = [
  ...data.aliases.map((a: { target_route: string; canonical: string }) => ({
    route: a.target_route,
    canonical: a.canonical,
  })),
  ...snapshot.pages
    .filter(
      (p: { target_route: string }) =>
        data.new_routes.includes(p.target_route) ||
        data.link_edits.some(
          (e: { route: string }) => e.route === p.target_route,
        ),
    )
    .map((p: { target_route: string; canonical: string }) => ({
      route: p.target_route,
      canonical: p.canonical,
    })),
];
for (const target of targets) {
  test(`cutover compatibility ${target.route}`, async ({
    page,
    request,
  }, testInfo) => {
    const errors: string[] = [];
    const cms: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('request', (r) => {
      if (/cms\.happinesea\.com|\/wp-json\//.test(r.url())) cms.push(r.url());
    });
    const response = await page.goto(`.${target.route}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      target.canonical,
    );
    for (const image of await page.locator('img').all()) {
      await image.scrollIntoViewIfNeeded();
      expect(
        await image.evaluate((img: HTMLImageElement) =>
          img.decode().then(() => img.naturalWidth),
        ),
      ).toBeGreaterThan(0);
    }
    const links: string[] = await page
      .locator('main a[href]')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLAnchorElement).href));
    for (const href of new Set(links)) {
      const url = new URL(href);
      if (url.hostname === 'happinesea.com') {
        const local =
          new URL(page.url()).origin +
          publicationBase +
          url.pathname +
          url.search;
        expect((await request.get(local)).status(), href).toBe(200);
      } else if (url.origin === new URL(page.url()).origin)
        expect((await request.get(href)).status(), href).toBe(200);
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
    expect(errors).toEqual([]);
    expect(cms).toEqual([]);
    const id = createHash('sha256')
      .update(target.route)
      .digest('hex')
      .slice(0, 12);
    await page.screenshot({
      path: `test-results/screenshots/${testInfo.project.name}-cutover-${id}.png`,
      fullPage: true,
    });
  });
}
test('new ZIP and prior static downloads remain byte exact; retired and removed routes stay absent', async ({
  request,
  page,
}) => {
  for (const file of files)
    for (const route of [file.target_route, ...file.legacy_routes]) {
      const response = await request.get(`.${route}`);
      expect(response.status(), route).toBe(200);
      expect(
        createHash('sha256')
          .update(await response.body())
          .digest('hex'),
        route,
      ).toBe(file.sha256);
    }
  for (const route of [
    '/experience/202107081627.html',
    '/style-guide/',
    '/r6dsm-manual/',
    '/minipix-manual-multicopter/',
    '/wp-admin/',
  ]) {
    const response = await request.get(`.${route}`, { maxRedirects: 0 });
    expect(response.status(), route).toBe(404);
    expect(response.headers().location).toBeUndefined();
  }
  for (const route of [
    '/download/rc4gs-v6-0-1fhss-rx',
    '/download/rc4gs-firmware-v3-0-8',
  ]) {
    await page.goto(`.${route}?wpdmdl=wrong-id`);
    await expect(
      page.locator('[data-legacy-body] a[data-download-sha256]'),
    ).toHaveCount(1);
    expect(new URL(page.url()).searchParams.get('wpdmdl')).toBe('wrong-id');
  }
});
