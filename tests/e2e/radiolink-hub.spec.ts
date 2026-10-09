import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import inventory from '../../src/data/static-downloads.json' with { type: 'json' };
import legacy from '../../src/data/legacy-compatibility.json' with { type: 'json' };
const publicationBase =
  process.env.PUBLICATION_MODE === 'production' ? '' : '/happinesea-site';

test('Radiolink hub keeps catalogue and has working information entrances', async ({
  page,
  request,
}, testInfo) => {
  const errors: string[] = [];
  const cms: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    if (
      request.url().includes('cms.happinesea.com') ||
      request.url().includes('/wp-json/')
    )
      cms.push(request.url());
  });
  await page.goto('radiolink/');
  await expect(
    page.getByRole('heading', { name: 'Radiolink情報', exact: true }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://happinesea.com/radiolink',
  );
  await expect(page.locator('[data-product-card]')).toHaveCount(83);
  for (const link of await page.locator('[data-radiolink-hub] a').all()) {
    const href = await link.getAttribute('href');
    expect((await request.get(href!)).status()).toBe(200);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  expect(cms).toEqual([]);
  await page.screenshot({
    path: `test-results/screenshots/${testInfo.project.name}-radiolink-hub.png`,
    fullPage: false,
  });
});

test('downloads are exact static bytes and query pages remain navigable without automatic download', async ({
  page,
  request,
}) => {
  for (const file of inventory.files) {
    for (const route of [file.target_route, ...file.legacy_routes]) {
      const response = await request.get(`.${route}`);
      expect(response.status(), route).toBe(200);
      expect(
        createHash('sha256')
          .update(await response.body())
          .digest('hex'),
      ).toBe(file.sha256);
    }
  }
  for (const endpoint of legacy.pages.filter(
    (item) => item.type === 'download_endpoint',
  )) {
    const route = `.${endpoint.target_route}?wpdmdl=${endpoint.download_id}`;
    await page.goto(route);
    const links = page.locator('a[data-download-sha256]');
    expect(await links.count()).toBeGreaterThan(0);
    const file = inventory.files.find((file) =>
      file.legacy_routes.some((route) => route === endpoint.download_target),
    );
    expect(file).toBeDefined();
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute(
        'href',
        `${publicationBase}${file!.target_route}`,
      );
    }
    expect(new URL(page.url()).searchParams.get('wpdmdl')).toBe(
      endpoint.download_id,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      endpoint.canonical,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
