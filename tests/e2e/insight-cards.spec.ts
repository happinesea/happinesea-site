import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const articles = JSON.parse(
  readFileSync(
    new URL('../../src/data/wordpress-insights.json', import.meta.url),
    'utf8',
  ),
);
const categoryNames: Record<string, string> = {
  news: 'ニュース・航空知識',
  'radiolink-support': 'Radiolink製品サポート',
  'radiolink-videos': 'Radiolink動画集',
  product: '製品紹介',
  'byme-a-manual': 'Byme-A製品マニュアル',
  'rc4gs-manual': 'RC4GS製品マニュアル',
  'minipix-manual': 'Mini Pix製品マニュアル',
  experience: '遊ぶ・学ぶ',
};

// Home uses its own cards, covered by home-editorial.spec.ts.
for (const route of ['./insights/']) {
  test(`article cards preserve source metadata and responsive layout on ${route}`, async ({
    page,
    request,
    isMobile,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(route);
    const cards = page.locator('main article.border-t');
    expect(await cards.count()).toBeGreaterThan(0);
    for (const card of await cards.all()) {
      const href = await card.locator('h2 a').getAttribute('href');
      const source = articles.find(
        (article: { slug: string }) =>
          href === `/happinesea-site/insights/${article.slug}/`,
      );
      expect(source).toBeTruthy();
      const image = card.locator('img');
      await expect(image).toHaveCount(source.hero ? 1 : 0);
      if (source.hero) {
        await expect(image).toHaveAttribute(
          'src',
          `/happinesea-site${source.hero.src}`,
        );
        await expect(image).toHaveAttribute('alt', source.hero.alt);
        expect(
          (await request.get(`/happinesea-site${source.hero.src}`)).status(),
        ).toBe(200);
        await image.scrollIntoViewIfNeeded();
        expect(
          await image.evaluate((element: HTMLImageElement) =>
            element.decode().then(() => element.naturalWidth),
          ),
        ).toBeGreaterThan(0);
        const imageBox = (await image.boundingBox())!;
        const textBox = (await card
          .locator('[data-insight-text]')
          .boundingBox())!;
        if (isMobile)
          expect(imageBox.y + imageBox.height).toBeLessThanOrEqual(textBox.y);
        else expect(imageBox.x + imageBox.width).toBeLessThanOrEqual(textBox.x);
      }
      const metadata = card.locator('[data-insight-metadata]');
      await expect(metadata.locator('time')).toHaveAttribute(
        'datetime',
        source.published_at,
      );
      expect(
        await metadata.locator('[data-insight-category]').allTextContents(),
      ).toEqual(
        source.contract.category.map((slug: string) => categoryNames[slug]),
      );
      expect(
        await metadata.evaluate(
          (element) => element.firstElementChild?.tagName,
        ),
      ).toBe('TIME');
      const metaBox = (await metadata.boundingBox())!;
      const titleBox = (await card.locator('h2').boundingBox())!;
      expect(metaBox.y + metaBox.height).toBeLessThanOrEqual(titleBox.y);
      expect((await request.get(href!)).status()).toBe(200);
    }
    // Stress wrapping in the test DOM only; source content and categories stay untouched.
    await cards
      .first()
      .locator('[data-insight-category]')
      .first()
      .evaluate((element) => {
        element.textContent = '長いカテゴリ名'.repeat(25);
      });
    await cards
      .first()
      .locator('h2 a')
      .evaluate((element) => {
        element.textContent = 'LongUnbrokenTitle'.repeat(30);
      });
    await cards
      .first()
      .locator('[data-insight-excerpt]')
      .evaluate((element) => {
        element.textContent = 'LongUnbrokenExcerpt'.repeat(50);
      });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
    expect(errors).toEqual([]);
  });
}
