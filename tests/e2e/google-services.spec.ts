import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const production = process.env.PUBLICATION_MODE === 'production';
const analytics = production && process.env.ANALYTICS_ENABLED === 'true';
const adsense = production && process.env.ADSENSE_ENABLED === 'true';
const article = JSON.parse(
  readFileSync('src/data/wordpress-insights.json', 'utf8'),
)[0];
const google =
  /googletagmanager\.com|google-analytics\.com|googlesyndication\.com|doubleclick\.net/;

for (const route of [
  '',
  'support/',
  'privacy-policy/',
  'manuals/rc8x/',
  'radiolink/rc8x/',
  `insights/${article.slug}/`,
]) {
  test(`Google remains dormant on preview origin: ${route || 'home'}`, async ({
    page,
  }) => {
    const requests: string[] = [];
    const errors: string[] = [];
    // Existing third-party video frames can run their own advertising code.
    // Isolate our head and avoid real third-party advertising during this test.
    await page.route(
      /https:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\//,
      (route) => route.fulfill({ contentType: 'text/html', body: '' }),
    );
    page.on('request', (r) => {
      if (
        google.test(r.url()) ||
        /cms\.happinesea\.com|\/wp-json\//.test(r.url())
      )
        requests.push(r.url());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('./' + route);
    await expect(page.locator('h1').first()).toBeVisible();
    expect(await page.locator('script[data-google-publication]').count()).toBe(
      Number(analytics || adsense),
    );
    expect(
      await page
        .locator('#publication-analytics-loader, #publication-adsense-loader')
        .count(),
    ).toBe(0);
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('exact production origin activates each selected loader once without sending live measurements', async ({
  page,
  baseURL,
}) => {
  const html = await (await page.request.get(baseURL!)).text();
  const requests: string[] = [];
  // Serve the actual generated head at the public origin; intercept all traffic.
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (google.test(url)) requests.push(url);
    await route.fulfill({
      contentType:
        url === 'https://happinesea.com/'
          ? 'text/html'
          : 'application/javascript',
      body:
        url === 'https://happinesea.com/'
          ? html.slice(0, html.indexOf('</head>') + 7) + '<body></body></html>'
          : '',
    });
  });
  await page.goto('https://happinesea.com/');
  expect(
    requests.filter((u) =>
      u.startsWith('https://www.googletagmanager.com/gtag/js?id='),
    ),
  ).toEqual(
    analytics
      ? ['https://www.googletagmanager.com/gtag/js?id=G-R5SC3Z7WHL']
      : [],
  );
  expect(
    requests.filter((u) =>
      u.startsWith(
        'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=',
      ),
    ),
  ).toEqual(
    adsense
      ? [
          'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9916217226323909',
        ]
      : [],
  );
  expect(await page.locator('#publication-analytics-loader').count()).toBe(
    Number(analytics),
  );
  expect(await page.locator('#publication-adsense-loader').count()).toBe(
    Number(adsense),
  );
  await page.evaluate(() => {
    const script = document.querySelector('script[data-google-publication]');
    if (script) {
      const repeat = document.createElement('script');
      repeat.textContent = script.textContent;
      document.head.append(repeat);
    }
  });
  expect(await page.locator('#publication-analytics-loader').count()).toBe(
    Number(analytics),
  );
  expect(await page.locator('#publication-adsense-loader').count()).toBe(
    Number(adsense),
  );
});
