/* global document */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  productionCatalog as catalog,
  drawingDisplayTags,
  ownerExclusions,
} from '../src/lib/drawing-publication.mjs';
const base = 'http://127.0.0.1:4343';
const hash = (data) => createHash('sha256').update(data).digest('hex');
const browser = await chromium.launch();
let pages = 0;
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport });
  page.setDefaultTimeout(30000);
  const errors = [];
  await page.route(
    /googletagmanager\.com|google-analytics\.com|googlesyndication\.com|doubleclick\.net/,
    (r) => r.fulfill({ contentType: 'application/javascript', body: '' }),
  );
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  assert.equal((await page.goto(base + '/drawinglibrary/')).status(), 200);
  assert.equal(
    await page.locator('[data-drawing-card]').count(),
    catalog.records.length,
  );
  const tags = [
    ...new Set(catalog.records.flatMap((r) => drawingDisplayTags(r.tags))),
  ];
  for (const tag of tags) {
    await page.getByRole('button', { name: tag, exact: true }).click();
    assert.equal(
      await page.locator('[data-drawing-card]:visible').count(),
      catalog.records.filter((r) => r.tags.includes(tag)).length,
    );
  }
  await page.getByRole('button', { name: 'すべて', exact: true }).click();
  for (const r of catalog.records) {
    assert.equal(
      (await page.goto(base + r.route.replace(/\/$/, '') + '/')).status(),
      200,
      r.id,
    );
    assert.ok(
      (
        await page.locator('link[rel=canonical]').getAttribute('href')
      ).startsWith('https://happinesea.com/'),
    );
    const robots = (await page.locator('meta[name=robots]').count())
      ? await page.locator('meta[name=robots]').getAttribute('content')
      : null;
    assert.ok(!robots?.includes('noindex'));
    for (const image of await page.locator('[data-drawing-detail] img').all())
      await image.evaluate((i) => i.decode());
    assert.equal(
      await page.locator('[data-drawing-download]').count(),
      r.downloads.length,
    );
    assert.equal(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
      0,
    );
    assert.doesNotMatch(
      await page.locator('main').innerText(),
      /REVIEW_REQUIRED|OWNER_APPROVED|公開準備用プレビュー|原題|名称・機種未確認/,
    );
    pages++;
  }
  for (const e of ownerExclusions) {
    const old = catalog.records.find((r) => r.id === e.record_id);
    assert.equal(old, undefined);
  }
  assert.deepEqual(errors, []);
  await page.close();
}
for (const d of catalog.downloads) {
  const response = await fetch(base + d.target_url);
  assert.equal(response.status, 200);
  const data = Buffer.from(await response.arrayBuffer());
  assert.equal(data.length, d.bytes);
  assert.equal(hash(data), d.sha256);
}
for (const r of catalog.records.filter((r) => !r.existing))
  assert.ok(
    (await readFile('dist/sitemap-0.xml', 'utf8')).includes(
      'https://happinesea.com' + r.route,
    ),
  );
await browser.close();
await writeFile(
  '.superpowers/drawing-rar-work/production-drawing-qa.json',
  JSON.stringify(
    {
      records: catalog.records.length,
      pageChecks: pages,
      downloadSHA: catalog.downloads.length,
      newSitemap: catalog.records.filter((r) => !r.existing).length,
      consoleErrors: 0,
      overflow: 0,
      hashMismatch: 0,
    },
    null,
    2,
  ),
);
console.log(
  'Drawing production browser/SHA/sitemap PASS',
  pages,
  catalog.downloads.length,
);
