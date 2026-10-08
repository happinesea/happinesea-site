import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';

const read = (name: string) =>
  JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const evidence = read('../fixtures/wordpress-phase6-completion-review.json');
const published = read('../../src/data/wordpress-insights.json');
const compatibility = read('../../src/data/legacy-compatibility.json');

for (const reviewed of evidence.articles.filter(
  (item: { decision: string }) =>
    item.decision !== 'BLOCKED_WITH_EXPLICIT_REASON',
)) {
  test(`completion article ${reviewed.id}: images, links, canonical and exact alias`, async ({
    page,
    request,
  }, testInfo) => {
    const article = published.find(
      (item: { contract: { id: number } }) => item.contract.id === reviewed.id,
    );
    const errors: string[] = [];
    const failures: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        message.location().url.startsWith('http://127.0.0.1:')
      )
        errors.push(message.text());
    });
    page.on('response', (response) => {
      if (
        response.url().startsWith('http://127.0.0.1:') &&
        response.status() >= 400
      )
        failures.push(`${response.status()} ${response.url()}`);
    });
    expect((await page.goto(`./insights/${article.slug}/`))?.status()).toBe(
      200,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      reviewed.source_url,
    );
    for (const image of await page.locator('img').all()) {
      await image.scrollIntoViewIfNeeded();
      expect(
        await image.evaluate((img: HTMLImageElement) =>
          img.decode().then(() => img.naturalWidth),
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
    const hrefs = await page
      .locator('main a[href]')
      .evaluateAll((links) =>
        links.map((link) => (link as HTMLAnchorElement).href),
      );
    for (const href of new Set<string>(hrefs)) {
      const url = new URL(href);
      if (url.origin === new URL(page.url()).origin)
        expect((await request.get(href)).status(), href).toBeLessThan(400);
      else if (url.origin === 'https://happinesea.com') {
        expect(
          (await request.get(`.${url.pathname}${url.search}`)).status(),
          `cutover dependency ${href}`,
        ).toBeLessThan(400);
      } else expect(['https:', 'mailto:', 'tel:']).toContain(url.protocol);
    }
    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/screenshots/${testInfo.project.name}-completion-${reviewed.id}.png`,
      fullPage: true,
    });
    const alias = new URL(reviewed.source_url).pathname;
    const legacy = await request.get(`.${alias}`, { maxRedirects: 0 });
    expect(legacy.status()).toBe(200);
    expect(await legacy.text()).toBe(
      await (await request.get(`./insights/${article.slug}/`)).text(),
    );
    await page.goto(`.${alias}`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      reviewed.source_url,
    );
    await expect(page.locator('meta[http-equiv="refresh"]')).toHaveCount(0);
    if (reviewed.id === 107)
      for (const anchor of ['01', '02', 'at_02'])
        await expect(page.locator(`[id="${anchor}"]`)).toHaveCount(1);
  });
}

test('verified download bytes and the two additional legacy entrances remain available', async ({
  page,
  request,
}, testInfo) => {
  for (const path of [
    '/wp-content/uploads/2022/11/cool9030_manual_jp.pdf',
    '/downloads/rc6gs-v3-manual-2032.pdf',
  ]) {
    const asset = compatibility.assets.find(
      (item: { target_route: string }) => item.target_route === path,
    );
    expect(asset, path).toBeTruthy();
    const response = await request.get(`.${path}`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/pdf');
    expect(
      createHash('sha256')
        .update(await response.body())
        .digest('hex'),
    ).toBe(asset.sha256);
  }
  for (const record of evidence.compatibility) {
    expect((await page.goto(`.${record.target_route}`))?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      record.canonical,
    );
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
    await page.screenshot({
      path: `test-results/screenshots/${testInfo.project.name}-completion-compat-${record.type}.png`,
      fullPage: true,
    });
    if (record.type === 'download_endpoint') {
      const handoff = page.waitForRequest((request) =>
        request
          .url()
          .endsWith('/wp-content/uploads/2022/11/cool9030_manual_jp.pdf'),
      );
      await page.goto(`.${record.target_route}?wpdmdl=2047`, {
        waitUntil: 'commit',
      });
      expect((await request.get((await handoff).url())).status()).toBe(200);
    }
  }
});
