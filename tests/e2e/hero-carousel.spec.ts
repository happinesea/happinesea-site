import { expect, test } from '@playwright/test';

test('hero presents five latest articles with metadata and working controls', async ({
  page,
}) => {
  await page.goto('./');
  const carousel = page.getByRole('region', { name: '最新記事' });
  await expect(carousel).toBeVisible();
  const slides = carousel.locator('[data-slide]');
  await expect(slides).toHaveCount(5);
  const first = slides.nth(0);
  await expect(first).toBeVisible();
  await expect(first.locator('time')).toBeVisible();
  await expect(first.locator('[data-home-category]').first()).toBeVisible();
  await expect(first.getByRole('heading')).toBeVisible();
  const firstHref = await first.getByRole('link').first().getAttribute('href');
  await expect(first.getByRole('link').last()).toHaveAttribute(
    'href',
    firstHref!,
  );
  await carousel.getByRole('button', { name: '次の記事', exact: true }).click();
  await expect(slides.nth(1)).toBeVisible();
  await expect(first).not.toBeVisible();
  await expect(
    carousel.getByRole('button', { name: '記事2を表示' }),
  ).toHaveAttribute('aria-current', 'true');
  await carousel.getByRole('button', { name: '前の記事', exact: true }).click();
  await expect(first).toBeVisible();
  await carousel.getByRole('button', { name: '記事5を表示' }).click();
  await expect(slides.nth(4)).toBeVisible();
  await carousel
    .getByRole('button', { name: '次の記事', exact: true })
    .press('Enter');
  await expect(first).toBeVisible();
  await first.getByRole('link').last().click();
  await expect(page).toHaveURL(
    new RegExp(firstHref!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'),
  );
});

test('autoplay pauses on hover, focus and explicit stop', async ({ page }) => {
  await page.clock.install();
  await page.goto('./');
  const carousel = page.getByRole('region', { name: '最新記事' });
  const slides = carousel.locator('[data-slide]');
  await page.clock.fastForward(6000);
  await expect(slides.nth(1)).toBeVisible();
  await carousel.hover();
  await page.clock.fastForward(12000);
  await expect(slides.nth(1)).toBeVisible();
  await page.locator('h1').hover();
  await page.clock.fastForward(6000);
  await expect(slides.nth(2)).toBeVisible();
  await slides.nth(2).getByRole('link').first().focus();
  await page.clock.fastForward(12000);
  await expect(slides.nth(2)).toBeVisible();
  await expect(
    carousel.getByRole('button', { name: '自動切替を再開' }),
  ).toBeVisible();
  await carousel.getByRole('button', { name: '自動切替を再開' }).click();
  await page.locator('[data-home-brand] a').first().focus();
  await page.locator('h1').hover();
  await page.clock.fastForward(6000);
  await expect(slides.nth(3)).toBeVisible();
  await carousel.getByRole('button', { name: '自動切替を停止' }).click();
  await page.locator('[data-home-brand] a').first().focus();
  await page.locator('h1').hover();
  await page.clock.fastForward(12000);
  await expect(slides.nth(3)).toBeVisible();
});

test('reduced motion stops autoplay while manual navigation remains available', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('./');
  const carousel = page.getByRole('region', { name: '最新記事' });
  const slides = carousel.locator('[data-slide]');
  await page.clock.fastForward(18000);
  await expect(slides.nth(0)).toBeVisible();
  await carousel.getByRole('button', { name: '次の記事', exact: true }).click();
  await expect(slides.nth(1)).toBeVisible();
  await page.clock.fastForward(18000);
  await expect(slides.nth(1)).toBeVisible();
});

test('focusing the stop control keeps autoplay stopped until explicit restart', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('./');
  const carousel = page.getByRole('region', { name: '最新記事' });
  await carousel.locator('[data-toggle]').focus();
  await page.locator('[data-home-brand] a').first().focus();
  await page.clock.fastForward(12000);
  await expect(carousel.locator('[data-slide]').nth(0)).toBeVisible();
});

test('article metadata and controls reflow without overflow at narrow widths', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  const carousel = page.getByRole('region', { name: '最新記事' });
  for (let index = 0; index < 5; index++) {
    await carousel
      .getByRole('button', { name: `記事${index + 1}を表示` })
      .click();
    const slide = carousel.locator('[data-slide]').nth(index);
    await expect(slide.getByRole('heading')).toBeVisible();
    await expect(slide.locator('time')).toBeVisible();
    for (const category of await slide.locator('[data-home-category]').all())
      await expect(category).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
  }
});
