/* global document */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  ownerCatalog as catalog,
  reanalysis,
} from '../src/lib/drawing-publication.mjs';

if (process.env.CI || process.env.PUBLICATION_MODE === 'production')
  throw Error('Local owner QA only');
const args = process.argv.slice(2);
const screenshots = args[args.indexOf('--screenshots') + 1];
if (!args.includes('--screenshots') || !screenshots)
  throw Error('--screenshots required');
await mkdir(screenshots, { recursive: true });
const base = 'http://127.0.0.1:4410/happinesea-site';
const browser = await chromium.launch();
const checks = [];
const hash = (data) => createHash('sha256').update(data).digest('hex');
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('response', (r) => {
    if (r.url().startsWith(base) && r.status() >= 400)
      errors.push(r.status() + ' ' + r.url());
  });
  await page.goto(base + '/drawinglibrary/');
  assert.equal(await page.locator('[data-drawing-card]').count(), 39);
  const analyzedTags = [...new Set(catalog.records.flatMap((r) => r.tags))]
    .filter((t) => t !== '名称・機種未確認')
    .sort();
  assert.deepEqual(
    (
      await page
        .locator('[data-tag-filter]')
        .evaluateAll((nodes) => nodes.map((n) => n.dataset.tagFilter))
    )
      .filter((t) => t !== 'すべて')
      .sort(),
    analyzedTags,
  );
  assert.doesNotMatch(
    await page.locator('[data-drawing-catalogue]').innerText(),
    /未確認|候補|原題/,
  );
  for (const tag of analyzedTags) {
    await page
      .locator('[data-tag-filter]')
      .filter({ hasText: tag })
      .filter({ hasText: new RegExp('^' + tag + '$') })
      .click();
    assert.equal(
      await page.locator('[data-drawing-card]:visible').count(),
      catalog.records.filter((r) => r.tags.includes(tag)).length,
    );
  }
  await page.getByRole('button', { name: 'すべて', exact: true }).click();
  for (const slug of [
    'f4u',
    'p51',
    'paper-aircraft',
    'model-beginner-materials',
  ])
    assert.equal(
      (await page.request.get(base + '/drawinglibrary/' + slug + '/')).status(),
      404,
      slug,
    );
  assert.equal(
    await page.locator('[data-drawing-card] a[download]').count(),
    0,
  );
  await page.screenshot({
    path: screenshots + `/rar-index-${viewport.width}.png`,
  });
  for (const record of catalog.records) {
    const url = base + record.route.replace(/\/$/, '') + '/';
    assert.equal((await page.goto(url)).status(), 200, record.id);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(
      await page
        .locator('div[data-drawing-tags]')
        .evaluate((e) => e.previousElementSibling.tagName),
      'H1',
    );
    assert.equal(
      await page.locator('[data-drawing-download]').count(),
      record.downloads.length,
    );
    assert.equal(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
      0,
      record.id,
    );
    for (const image of await page.locator('[data-drawing-detail] img').all())
      await image.evaluate((i) => i.decode());
    const links = await page
      .locator('[data-drawing-download]')
      .evaluateAll((nodes) =>
        nodes.map((a) => ({ href: a.href, sha: a.dataset.downloadSha256 })),
      );
    const expected = catalog.downloads.filter((d) =>
      record.downloads.includes(d.id),
    );
    for (const link of links) {
      assert.ok(!link.href.endsWith('.rar'));
      assert.ok(
        expected.some(
          (d) => base + d.target_url === link.href && d.sha256 === link.sha,
        ),
      );
    }
    if (
      [
        'f4d',
        'fuel-cad-unidentified',
        'microjet-engine',
        'f4u',
        'jet-engine-manual',
        'boeing-airliner-unidentified',
        'paper-aircraft',
        'light-helicopter',
        'rotorcraft-unidentified',
      ].includes(record.slug)
    )
      await page.screenshot({
        path: screenshots + `/rar-${record.slug}-${viewport.width}.png`,
        fullPage: true,
      });
    checks.push({
      id: record.id,
      viewport: viewport.width,
      status: 200,
      images: 'DECODED',
      tags: record.tags.length,
      downloads: record.downloads.length,
    });
  }
  await page.goto('http://127.0.0.1:4380/drawing-library-review/');
  await page
    .getByRole('button', { name: '公開準備 records 39', exact: true })
    .click();
  for (const status of [
    'rarConverted',
    'imageRecovered',
    'titleResolved',
    'groupingResolved',
    'probableResolved',
  ]) {
    await page.locator('[data-filter=status]').selectOption(status);
    assert.ok(
      (await page.locator('[data-panel=records] .case:visible').count()) > 0,
      status,
    );
  }
  await page.locator('[data-filter=status]').selectOption('all');
  await page.screenshot({
    path: screenshots + `/rar-owner-records-${viewport.width}.png`,
  });
  await page.getByRole('button', { name: 'RAR再解析 44', exact: true }).click();
  assert.equal(await page.locator('[data-panel=rar] .case').count(), 44);
  await page
    .locator('[data-panel=rar] details')
    .first()
    .evaluate((e) => {
      e.open = true;
    });
  assert.equal(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
    0,
  );
  await page.screenshot({
    path: screenshots + `/rar-owner-members-${viewport.width}.png`,
  });
  assert.deepEqual(errors, []);
  await page.close();
}
const ids = new Set(catalog.records.flatMap((r) => r.downloads));
const downloads = [];
for (const d of catalog.downloads.filter((d) => ids.has(d.id))) {
  const response = await fetch(base + d.target_url);
  assert.equal(response.status, 200, d.target_url);
  const data = Buffer.from(await response.arrayBuffer());
  assert.equal(data.length, d.bytes);
  assert.equal(hash(data), d.sha256);
  if (d.derived_zip_path) {
    const review = await fetch('http://127.0.0.1:4380/derived/' + d.id);
    assert.equal(review.status, 200);
    assert.equal(hash(Buffer.from(await review.arrayBuffer())), d.sha256);
  }
  downloads.push({
    id: d.id,
    sha256: d.sha256,
    bytes: d.bytes,
    derived: Boolean(d.derived_zip_path),
  });
}
await browser.close();
await writeFile(
  '.superpowers/drawing-rar-work/browser-qa.json',
  JSON.stringify(
    {
      page_checks: checks,
      downloads,
      console_errors: 0,
      overflow: 0,
      converted: reanalysis.distributions.length,
    },
    null,
    2,
  ),
);
console.log(
  `PASS: ${checks.length} owner page checks, ${downloads.length} download SHA checks, desktop/mobile review filters`,
);
