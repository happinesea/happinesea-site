import { expect, test, type Page } from '@playwright/test';

const routes = [
  ['home', './'],
  ['catalogue', './radiolink/'],
  ['product', './radiolink/rc8x/'],
  ['RC8P product', './radiolink/rc8p/'],
  ['T12D product', './radiolink/t12d/'],
  ['R16F product', './radiolink/r16f/'],
  ['R12F product', './radiolink/r12f/'],
  ['R8FG product', './radiolink/r8fg/'],
  ['R7FG product', './radiolink/r7fg/'],
  ['R6FG product', './radiolink/r6fg/'],
  ['manuals category', './manuals/'],
  ['manual', './manuals/rc8x/'],
  ['manual chapter 1', './manuals/rc8x/chapter-01/'],
  ['manual chapter 2', './manuals/rc8x/chapter-02/'],
  ['support', './support/'],
  ['insights', './insights/'],
  ['insight availability', './insights/aircraft-engine-stop/'],
] as const;

function captureErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

for (const [name, path] of routes) {
  test(`${name} renders without browser errors or horizontal overflow`, async ({
    page,
  }) => {
    const errors = captureErrors(page);
    const response = await page.goto(path);

    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('h1').first()).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test('navigation, category filtering, and LINE support work', async ({
  page,
}) => {
  const errors = captureErrors(page);
  await page.goto('./');
  await page.getByRole('link', { name: '製品を見る', exact: true }).click();
  await expect(page).toHaveURL(/\/happinesea-site\/radiolink\/$/);

  await page.getByRole('button', { name: '受信機', exact: true }).click();
  await expect(page.locator('[data-result-count]')).toHaveText('20件を表示');
  await expect(page.locator('[data-product-category]:visible')).toHaveCount(20);

  await page.getByRole('button', { name: '送信機', exact: true }).click();
  await expect(page.locator('[data-result-count]')).toHaveText('10件を表示');
  await expect(page.locator('[data-product-category]:visible')).toHaveCount(10);

  await page.goto('./radiolink/rc8x/');
  await expect(
    page.getByRole('link', { name: '日本語マニュアル' }),
  ).toHaveAttribute('href', '/happinesea-site/manuals/rc8x/');
  await expect(
    page.getByRole('link', { name: '英語マニュアル' }),
  ).toHaveAttribute('target', '_blank');
  await expect(
    page.getByRole('link', { name: 'LINEで相談', exact: true }),
  ).toHaveAttribute('href', 'https://line.me/R/ti/p/%40662zyrsb');
  await expect(
    page.getByRole('heading', { name: 'RC8X', exact: true }).last(),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'チュートリアル', exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('[data-feature-section="telemetry"] img'),
  ).toHaveAttribute('src', /telemetry\.gif$/);
  await expect(page.locator('[data-feature-layout="tile"]')).toHaveCount(14);
  await expect(
    page.locator('[data-product-section="feature-summary"]'),
  ).toHaveCount(0);
  const officialProductVideo = page.locator('[data-official-product-video]');
  await expect(officialProductVideo).toHaveAttribute(
    'src',
    /d5acb416b76a01be7edf080741b0e681\.mp4$/,
  );
  await expect(officialProductVideo.locator('..')).not.toHaveClass(
    /(?:border-t|py-14)/,
  );
  await expect(
    page.getByText('Radiolink公式 RC8X製品動画', { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-feature-section="architecture"]'),
  ).not.toHaveClass(/py-14/);
  await expect(
    page.locator('[data-feature-section="architecture"] img'),
  ).toHaveAttribute('src', /architecture\.webp$/);
  await expect(
    page.locator('[data-feature-section="voice-broadcast"] img'),
  ).toHaveAttribute('src', /buzzer-screen\.bmp$/);
  await expect(
    page.locator('[data-feature-section="languages"] img'),
  ).toHaveAttribute('src', /languages\.gif$/);
  await expect(
    page.locator('[data-feature-section="r8fg-receiver-system"]'),
  ).toContainText('ジャイロによる車体安定化とナノコーティング');
  await expect(
    page.locator('[data-feature-section="fpv-external-functions"]'),
  ).toContainText('設定画面とFPV画面');
  await expect(
    page.locator(
      '[data-feature-section="interfaces"], [data-feature-section="external-functions"], [data-feature-section="fpv-display"], [data-feature-section="gyro"], [data-feature-section="water-resistance"], [data-feature-section="r8fg-stability-protection"], [data-feature-section="receivers"]',
    ),
  ).toHaveCount(0);
  await expect(page.locator('[data-product-nav]')).toBeVisible();
  await expect(page.locator('[data-product-section="manuals"]')).toHaveCount(0);
  await expect(page.locator('[data-product-section="support"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('category navigation exposes the four public entry points', async ({
  page,
}) => {
  await page.goto('./');
  for (const [label, path] of [
    ['商品', '/radiolink/'],
    ['マニュアル', '/manuals/'],
    ['サポート', '/support/'],
    ['業界・技術', '/insights/'],
  ] as const) {
    await expect(
      page.getByRole('link', { name: label, exact: true }).first(),
    ).toHaveAttribute('href', `/happinesea-site${path}`);
  }

  await page.goto('./manuals/');
  await expect(
    page.getByRole('link', { name: 'RC8Xマニュアルを見る' }),
  ).toHaveAttribute('href', '/happinesea-site/manuals/rc8x/');

  await page.goto('./support/');
  await expect(
    page.getByRole('link', { name: 'RC8Xの商品情報を見る' }),
  ).toHaveAttribute('href', '/happinesea-site/radiolink/rc8x/');
  await expect(
    page.getByRole('link', { name: 'RC8Xマニュアルを見る' }),
  ).toHaveAttribute('href', '/happinesea-site/manuals/rc8x/');
});

test('catalogue exposes all products and every local image decodes', async ({
  page,
}) => {
  await page.goto('./radiolink/');
  await expect(page.locator('[data-product-card]')).toHaveCount(83);
  await expect(page.locator('[data-detail-available]')).toHaveCount(8);
  await expect(page.locator('[data-detail-preparing]')).toHaveCount(75);

  const images = page.locator('[data-product-card-image]');
  await expect(images).toHaveCount(83);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((element: HTMLImageElement) => element.decode());
  }
  expect(
    await images.evaluateAll((elements: HTMLImageElement[]) =>
      elements.every(
        (image) => image.naturalWidth === 480 && image.naturalHeight === 480,
      ),
    ),
  ).toBe(true);
});

for (const [model, path] of [
  ['RC8P', './radiolink/rc8p/'],
  ['T12D', './radiolink/t12d/'],
  ['R16F', './radiolink/r16f/'],
  ['R12F', './radiolink/r12f/'],
  ['R8FG', './radiolink/r8fg/'],
  ['R7FG', './radiolink/r7fg/'],
  ['R6FG', './radiolink/r6fg/'],
] as const) {
  test(`${model} product page has no broken local media`, async ({
    page,
    request,
  }) => {
    const errors = captureErrors(page);
    await page.goto(path);
    await expect(page.locator('[data-standard-product-page]')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: model, exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: '日本語マニュアル' }),
    ).toHaveCount(0);

    const sources = await page
      .locator('img[src]')
      .evaluateAll((images) =>
        images.map((image) => image.getAttribute('src')).filter(Boolean),
      );
    expect(sources.length).toBeGreaterThan(model === 'R6FG' ? 4 : 7);
    for (const source of sources) {
      const response = await request.get(new URL(source!, page.url()).href);
      expect(response.status(), source!).toBeLessThan(400);
    }
    expect(errors).toEqual([]);
  });
}

for (const [model, path] of [
  ['R16F', './radiolink/r16f/'],
  ['R12F', './radiolink/r12f/'],
  ['R8FG', './radiolink/r8fg/'],
  ['R7FG', './radiolink/r7fg/'],
  ['R6FG', './radiolink/r6fg/'],
] as const) {
  test(`${model} receiver page preserves the receiver-family structure`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { name: '対応するRadiolink送信機' }),
    ).toBeVisible();
    await expect(
      page.locator('[data-product-section="certificates"]'),
    ).toHaveCount(0);
    expect(
      await page.locator('img[src$=".gif"]').count(),
    ).toBeGreaterThanOrEqual(1);
  });
}

test('same-origin links return successful responses', async ({
  page,
  request,
}) => {
  const links = new Set<string>();

  for (const [, path] of routes) {
    await page.goto(path);
    const pageUrl = page.url();
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((anchors) =>
        anchors.map((anchor) => anchor.getAttribute('href')).filter(Boolean),
      );
    for (const href of hrefs) {
      const url = new URL(href!, pageUrl);
      if (url.origin === new URL(pageUrl).origin) {
        url.hash = '';
        links.add(url.href);
      }
    }
  }

  for (const url of links) {
    const response = await request.get(url);
    expect(response.status(), url).toBeLessThan(400);
  }
});

test('RC8X product images return successful responses', async ({
  page,
  request,
}) => {
  await page.goto('./radiolink/rc8x/');
  const pageUrl = page.url();
  const sources = await page
    .locator('img[src]')
    .evaluateAll((images) =>
      images.map((image) => image.getAttribute('src')).filter(Boolean),
    );

  expect(sources.length).toBeGreaterThan(15);
  for (const source of sources) {
    const url = new URL(source!, pageUrl);
    const response = await request.get(url.href);
    expect(response.status(), url.href).toBeLessThan(400);
  }
});
