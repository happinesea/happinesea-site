import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';

const snapshot = JSON.parse(
  readFileSync(
    new URL('../../src/data/legacy-compatibility.json', import.meta.url),
    'utf8',
  ),
);

for (const item of snapshot.pages) {
  test(`legacy compatibility ${item.type} ${item.id ?? item.download_id}`, async ({
    page,
    request,
  }, testInfo) => {
    const errors: string[] = [];
    const failedImages: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('response', (response) => {
      if (
        response.request().resourceType() === 'image' &&
        response.status() >= 400
      )
        failedImages.push(response.url());
    });
    const response = await page.goto(`.${item.target_route}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText(item.title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      item.canonical,
    );
    for (const image of await page.locator('img').all()) {
      await image.scrollIntoViewIfNeeded();
      expect(
        await image.evaluate((element: HTMLImageElement) =>
          element.decode().then(() => element.naturalWidth),
        ),
      ).toBeGreaterThan(0);
      expect(
        new URL((await image.getAttribute('src')) ?? '', page.url()).origin,
      ).toBe(new URL(page.url()).origin);
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
    const links = await page
      .locator('a[href]')
      .evaluateAll((anchors) => [
        ...new Set(
          anchors
            .map((anchor) => (anchor as HTMLAnchorElement).href)
            .filter((href) => new URL(href).origin === location.origin),
        ),
      ]);
    for (const href of links) {
      const url = new URL(href);
      if (url.hash && url.pathname === new URL(page.url()).pathname)
        expect(
          await page.evaluate(
            (id) => !!document.getElementById(id),
            decodeURIComponent(url.hash.slice(1)),
          ),
        ).toBe(true);
      else expect((await request.get(href)).status(), href).toBeLessThan(400);
    }
    if (item.type === 'glossary') {
      await expect(page.locator('[data-legacy-body] tbody tr')).toHaveCount(
        214,
      );
      for (const id of ['1', '2', '3', '4', '5', '6', '7', '8', '9'])
        await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    }
    expect(errors).toEqual([]);
    expect(failedImages).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/screenshots/${testInfo.project.name}-legacy-${item.id ?? item.download_id}.png`,
      fullPage: true,
    });
  });
}

test('preserved downloads return the actual recorded bytes', async ({
  request,
}) => {
  for (const asset of snapshot.assets.filter(
    (item: { kind: string }) => item.kind === 'download',
  )) {
    const response = await request.get(`.${encodeURI(asset.target_route)}`);
    expect(response.status(), asset.target_route).toBe(200);
    expect(response.headers()['content-type']).not.toContain('text/html');
    expect(
      createHash('sha256')
        .update(await response.body())
        .digest('hex'),
      asset.target_route,
    ).toBe(asset.sha256);
  }
});

test('known legacy download queries hand off only to their verified local file', async ({
  page,
  request,
}) => {
  for (const item of snapshot.pages.filter(
    (item: { type: string }) => item.type === 'download_endpoint',
  )) {
    // Chromium download navigations emit a request/download, not a page response.
    const handoff = page.waitForRequest(
      (request) =>
        decodeURIComponent(new URL(request.url()).pathname) ===
        `/happinesea-site${item.download_target}`,
    );
    await page.goto(`.${item.target_route}?wpdmdl=${item.download_id}`, {
      waitUntil: 'commit',
    });
    expect((await request.get((await handoff).url())).status()).toBe(200);
  }
});
