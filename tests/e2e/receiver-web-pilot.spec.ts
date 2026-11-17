import { test, expect } from '@playwright/test';
import data from '../../src/lib/receiver-manuals.mjs';
import { captureManualPage } from './capture-manual-page';

test.use({
  launchOptions: { executablePath: process.env.BROWSER_EXECUTABLE_PATH },
});

for (const manual of data.manuals) {
  test(`${manual.model}: source units, figures, anchors and product navigation`, async ({
    page,
  }, testInfo) => {
    await page.goto(`manuals/${manual.product_id}/`);
    await expect(page.locator('h1')).toContainText(manual.model);
    if ('batch_id' in manual && manual.batch_id === 'receiver-web-batch3')
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        /noindex/,
      );
    await expect(page.locator('[data-translation-unit]')).toHaveCount(
      manual.unit_ids.length,
    );
    if ('batch_id' in manual && manual.batch_id === 'receiver-web-batch3')
      for (const cell of await page
        .locator('table :is(th, td):first-child')
        .all())
        expect(
          await cell.evaluate(
            (element) => element.getBoundingClientRect().width,
          ),
        ).toBeGreaterThanOrEqual(120);
    await page.locator('footer').last().scrollIntoViewIfNeeded();
    const result = await page.evaluate(async () => {
      const figures = [
        ...document.querySelectorAll<HTMLImageElement>(
          '[data-manual-figure] img',
        ),
      ];
      for (const img of figures) {
        img.loading = 'eager';
        await img.decode();
      }
      const ids = [...document.querySelectorAll('[id]')].map((n) => n.id);
      return {
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        duplicates: ids.filter((id, i) => ids.indexOf(id) !== i),
        deadAnchors: [
          ...document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'),
        ]
          .filter(
            (a) =>
              a.hash &&
              !document.getElementById(decodeURIComponent(a.hash.slice(1))),
          )
          .map((a) => a.hash),
        distorted: figures
          .filter(
            (img) =>
              Math.abs(
                img.getBoundingClientRect().height -
                  (img.getBoundingClientRect().width * img.naturalHeight) /
                    img.naturalWidth,
              ) > 1,
          )
          .map((img) => img.src),
      };
    });
    expect(result).toEqual({
      overflow: false,
      duplicates: [],
      deadAnchors: [],
      distorted: [],
    });
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    const screenshot = `.superpowers/receiver-web-qa/${manual.product_id}-${testInfo.project.name}.png`;
    if ('batch_id' in manual && manual.batch_id === 'receiver-web-batch3')
      await captureManualPage(page, screenshot);
    else
      await page.screenshot({ path: screenshot, fullPage: true, scale: 'css' });
    await page.getByRole('link', { name: '製品ページへ戻る' }).click();
    await expect(page).toHaveURL(
      new RegExp(`/radiolink/${manual.product_id}/$`),
    );
    if ('batch_id' in manual && manual.batch_id === 'receiver-web-batch3')
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        /noindex/,
      );
    await page.locator('[data-receiver-manual-link]').click();
    await expect(page).toHaveURL(new RegExp(`/manuals/${manual.product_id}/$`));
  });
}
