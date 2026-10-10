import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import manual from '../../src/data/manuals/rc4gs-v2.json' with { type: 'json' };
import { manualCanonical } from '../../scripts/lib/rc4gs-v2-manual.mjs';

const manifest = JSON.parse(
  readFileSync(
    new URL('../../src/data/wordpress-insight-manifest.json', import.meta.url),
    'utf8',
  ),
);
const linkedBatch = JSON.parse(
  readFileSync(
    new URL('../fixtures/wordpress-phase6-review-batch4.json', import.meta.url),
    'utf8',
  ),
);

for (const article of manifest.articles) {
  test(`WordPress batch article ${article.id}`, async ({
    page,
    request,
  }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (
        message.text() ===
          'Permissions policy violation: compute-pressure is not allowed in this document.' &&
        message.location().url.startsWith('https://www.youtube.com/s/player/')
      ) {
        testInfo.annotations.push({
          type: 'external-console',
          description: `${message.location().url}: ${message.text()}`,
        });
        return;
      }
      if (message.type() === 'error') errors.push(message.text());
    });
    const response = await page.goto(`.${article.route}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      manualCanonical(article.canonical, manual),
    );
    for (const image of await page.locator('img').all()) {
      expect(
        new URL(
          await image.evaluate((element: HTMLImageElement) => element.src),
        ).origin,
      ).toBe(new URL(page.url()).origin);
      await image.scrollIntoViewIfNeeded();
      expect(
        await image.evaluate((element: HTMLImageElement) =>
          element.decode().then(() => element.naturalWidth),
        ),
      ).toBeGreaterThan(0);
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
    const internalLinks = await page
      .locator('a[href]')
      .evaluateAll((links) => [
        ...new Set(
          links
            .map((link) => (link as HTMLAnchorElement).href)
            .filter((href) => new URL(href).origin === location.origin),
        ),
      ]);
    for (const href of internalLinks)
      expect((await request.get(href)).status()).toBeLessThan(400);
    const reviewed = linkedBatch.articles.find(
      (item: { id: number }) => item.id === article.id,
    );
    for (const href of reviewed?.source_links ?? []) {
      const source = new URL(href);
      if (source.origin !== 'https://happinesea.com') continue;
      const linkedResponse = await request.get(
        `.${source.pathname}${source.search}`,
      );
      expect(linkedResponse.status(), `cutover destination ${href}`).toBe(200);
      const evidence = linkedBatch.link_evidence.find(
        (item: { url: string }) => item.url === href,
      );
      expect(await linkedResponse.text()).toContain(
        `href="${manualCanonical(evidence.canonical, manual)}"`,
      );
    }
    expect(errors).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/screenshots/${testInfo.project.name}-wordpress-${article.id}.png`,
      fullPage: true,
    });
    const legacyPath = new URL(article.canonical).pathname;
    const legacyResponse = await request.get(`.${legacyPath}`, {
      maxRedirects: 0,
    });
    expect(legacyResponse.status()).toBe(200);
    const title = await page.locator('h1').textContent();
    await page.goto(`.${legacyPath}`);
    expect(new URL(page.url()).pathname).toBe(`/happinesea-site${legacyPath}`);
    await expect(page.locator('h1')).toHaveText(title!);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      manualCanonical(article.canonical, manual),
    );
    await expect(page.locator('meta[http-equiv="refresh"]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
