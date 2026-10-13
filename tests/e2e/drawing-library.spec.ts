import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const reviewUrl = process.env.DRAWING_REVIEW_URL;
const screenshotDir =
  process.env.DRAWING_SCREENSHOT_DIR ??
  '.superpowers/drawing-library-phase2/screenshots';

test('drawing public index has only six existing cards and working filters/links/images', async ({
  page,
  request,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.setViewportSize(
    info.project.name === 'mobile'
      ? { width: 390, height: 844 }
      : { width: 1440, height: 900 },
  );
  const response = await page.goto('./drawinglibrary/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('[data-drawing-card]')).toHaveCount(6);
  await expect(page.locator('[data-drawing-card] a[download]')).toHaveCount(0);
  await expect(
    page.getByText('設計図・資料を見る', { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('[data-result-count]')).toHaveText('6件を表示');
  expect(await page.locator('link[rel=canonical]').getAttribute('href')).toBe(
    'https://happinesea.com/drawinglibrary',
  );
  await page.getByRole('button', { name: '戦闘機', exact: true }).click();
  await expect(page.locator('[data-drawing-card]:visible')).toHaveCount(3);
  await page.getByRole('button', { name: 'すべて', exact: true }).click();
  await expect(page.locator('[data-drawing-card]:visible')).toHaveCount(6);
  for (const image of await page.locator('[data-drawing-card] img').all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((img: HTMLImageElement) => img.decode());
  }
  const links = await page
    .locator('main a[href]')
    .evaluateAll((nodes) => [
      ...new Set(nodes.map((a) => (a as HTMLAnchorElement).href)),
    ]);
  for (const link of links)
    expect((await request.get(link)).status(), link).toBeLessThan(400);
  const boxes = await page.locator('[data-drawing-card]').evaluateAll((nodes) =>
    nodes.map((n) => ({
      x: n.getBoundingClientRect().x,
      width: n.getBoundingClientRect().width,
    })),
  );
  expect(new Set(boxes.map((b) => Math.round(b.x))).size).toBe(
    info.project.name === 'mobile' ? 1 : 3,
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  expect(errors).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({
    path: join(screenshotDir, `public-drawinglibrary-${info.project.name}.png`),
    fullPage: true,
    scale: 'css',
  });
});

test('local owner review displays every case and combines category/status filters', async ({
  page,
  request,
}, info) => {
  test.skip(
    !reviewUrl,
    'local review server is intentionally absent from production',
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.setViewportSize(
    info.project.name === 'mobile'
      ? { width: 390, height: 844 }
      : { width: 1440, height: 900 },
  );
  expect((await page.goto(reviewUrl!))?.status()).toBe(200);
  await expect(
    page.locator('[data-panel="files"] [data-file-card]'),
  ).toHaveCount(77);
  await expect(
    page.locator('[data-panel="files"] [data-panel-count]'),
  ).toHaveText('77件を表示 / 77件');
  await expect(page.locator('.summary-card').first()).toContainText(
    '38 records · 69 files · 権利確認待ち 69',
  );
  await expect(page.locator('.summary-card').last()).toContainText(
    '5 records · 8 files · 権利確認待ち 8',
  );
  await mkdir(screenshotDir, { recursive: true });
  const shot = async (name: string) =>
    page.screenshot({
      path: join(screenshotDir, `${name}-${info.project.name}.png`),
      scale: 'css',
    });
  await shot('review-summary');
  await page
    .locator('[data-filter="category"]')
    .selectOption('エンジン・製作資料');
  await expect(
    page.locator('[data-panel="files"] [data-file-card]:visible'),
  ).toHaveCount(8);
  await page
    .locator('.filters')
    .evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await shot('review-category');
  await page.locator('[data-reset]').click();
  for (const [view, selector, count, name] of [
    ['exact', '[data-exact-case]', 20, 'review-duplicate'],
    ['probable', '[data-probable-case]', 9, 'review-probable'],
    ['groups', '[data-group-case]', 42, 'review-grouping'],
    ['titles', '[data-title-case]', 26, 'review-title'],
  ] as const) {
    await page.locator(`[data-view="${view}"]`).click();
    await expect(
      page.locator(`[data-panel="${view}"] ${selector}:visible`),
    ).toHaveCount(count);
    await page
      .locator(`[data-panel="${view}"] h2`)
      .evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await shot(name);
  }
  await page.locator('[data-view="files"]').click();
  await page.locator('[data-filter="status"]').selectOption('EXACT_DUPLICATE');
  await expect(
    page.locator('[data-panel="files"] [data-file-card]:visible'),
  ).toHaveCount(20);
  await page
    .locator('[data-filter="status"]')
    .selectOption('PROBABLE_DUPLICATE');
  await expect(
    page.locator('[data-panel="files"] [data-file-card]:visible'),
  ).toHaveCount(9);
  await page.locator('[data-filter="status"]').selectOption('title');
  await expect(
    page.locator('[data-panel="files"] [data-file-card]:visible'),
  ).toHaveCount(26);
  await page.locator('[data-filter="status"]').selectOption('grouping');
  await expect(
    page.locator('[data-panel="files"] [data-file-card]:visible'),
  ).toHaveCount(8);
  await page.locator('[data-filter="status"]').selectOption('rights');
  await expect(
    page.locator('[data-panel="files"] [data-file-card]:visible'),
  ).toHaveCount(77);
  await page.locator('[data-filter="origin"]').selectOption('new');
  await expect(
    page.locator('[data-panel="files"] [data-file-card]:visible'),
  ).toHaveCount(47);
  await page.locator('[data-filter="origin"]').selectOption('existing');
  await expect(
    page.locator('[data-panel="files"] [data-file-card]:visible'),
  ).toHaveCount(30);
  await page.locator('[data-reset]').click();
  await page.locator('[data-filter="tag"]').selectOption('スチレンボード');
  await expect(
    page.locator('[data-panel="files"] [data-file-card]:visible'),
  ).toHaveCount(6);
  await page.locator('[data-reset]').click();
  const images = await page
    .locator('[data-panel="files"] img')
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLImageElement).src));
  for (const image of images)
    expect((await request.get(image)).status(), image).toBe(200);
  for (const image of await page.locator('[data-panel="files"] img').all()) {
    await image.evaluate((img: HTMLImageElement) => {
      img.loading = 'eager';
    });
  }
  await page
    .locator('[data-panel="files"] img')
    .evaluateAll((nodes) =>
      Promise.all(nodes.map((n) => (n as HTMLImageElement).decode())),
    );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  expect(errors).toEqual([]);
  expect((await request.post(new URL('/', reviewUrl!).href)).status()).toBe(
    405,
  );
  expect(
    (
      await request.get(new URL('/source/../../outside.pdf', reviewUrl!).href)
    ).status(),
  ).toBe(404);
});

test('existing drawing detail has tags under title and a download button', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('./drawinglibrary/');
  await page
    .locator('[data-drawing-card] h2 a')
    .filter({ hasText: 'F-14 Tomcat' })
    .click();
  const tags = page.locator('div[data-drawing-tags]');
  await expect(tags).toContainText('軍用機');
  await expect(tags).toContainText('戦闘機');
  expect(await tags.evaluate((el) => el.previousElementSibling?.tagName)).toBe(
    'H1',
  );
  await expect(page.locator('[data-legacy-body] a[download]')).toHaveCount(0);
  const button = page.locator('[data-drawing-download]');
  await expect(button).toHaveText('設計図・資料をダウンロード');
  await expect(button).toHaveAttribute('href', /\/downloads\/drawings\//);
  await expect(button).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  expect(errors).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: join(screenshotDir, `drawing-detail-${info.project.name}.png`),
    fullPage: true,
    scale: 'css',
  });
});
