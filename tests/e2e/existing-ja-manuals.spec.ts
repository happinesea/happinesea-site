import { test, expect } from '@playwright/test';
import inventory from '../../src/data/manuals/existing-ja.json' with { type: 'json' };
import {
  manualChapters,
  manualAnchorTargets,
} from '../../scripts/lib/manual-navigation.mjs';

for (const manual of inventory.manuals.filter(
  (manual) => manual.publication_status === 'publication_copy',
)) {
  test(`existing Japanese manual ${manual.route}`, async ({
    page,
    baseURL,
    request,
  }, info) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('request', (request) => {
      if (request.url().includes('cms.happinesea.com'))
        errors.push('CMS runtime request');
    });
    const chapters = manualChapters(manual);
    const origin = baseURL?.includes('/happinesea-site/')
      ? 'https://happinesea.github.io/happinesea-site/'
      : 'https://happinesea.com/';
    const introduction = manual.semantic_sections!.slice(
      0,
      manual.semantic_sections!.indexOf(chapters[0].sections[0]),
    );
    const destinations = [
      { route: manual.route, title: manual.title, sections: introduction },
      ...chapters,
    ];
    const sectionIds: string[] = [];
    const sourceIds: string[] = [];
    for (const [index, destination] of destinations.entries()) {
      expect(
        (
          await page.goto(new URL(destination.route.slice(1), baseURL).href)
        )?.status(),
      ).toBe(200);
      await expect(page.locator('h1')).toContainText(destination.title);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        new URL(destination.route.slice(1), origin).href,
      );
      const sidebar = page.locator('#starlight__sidebar');
      const group = sidebar
        .locator('details')
        .filter({
          has: page.locator('summary').filter({ hasText: manual.title }),
        })
        .first();
      await expect(group).toHaveAttribute('open', '');
      if (info.project.name === 'mobile')
        await page
          .locator('button[popovertarget="starlight__sidebar"]')
          .click();
      await group.locator('summary').click();
      await expect(group).not.toHaveAttribute('open', '');
      await group.locator('summary').click();
      for (const chapter of chapters) {
        const link = group.locator(`a[href$="${chapter.route}"]`);
        await expect(link).toHaveCount(1);
        await expect(link).toHaveText(chapter.title);
      }
      await expect(
        group.locator(`a[href$="${destination.route}"]`),
      ).toHaveAttribute('aria-current', 'page');
      if (index === 1)
        await page.screenshot({ path: info.outputPath('chapter-sidebar.png') });
      if (info.project.name === 'mobile')
        await page
          .locator('button[popovertarget="starlight__sidebar"]')
          .click();
      const blocks = page.locator('[data-semantic-section]');
      expect(await blocks.count()).toBe(destination.sections.length);
      sectionIds.push(
        ...(await blocks.evaluateAll((elements) =>
          elements.map((element) =>
            element.getAttribute('data-semantic-section')!,
          ),
        )),
      );
      sourceIds.push(
        ...(await page
          .locator('.sl-markdown-content [id]')
          .evaluateAll((elements) => elements.map((element) => element.id))),
      );
      for (const label of await page
        .locator(
          'main h1, main h2, main h3, main h4, main h5, main h6, starlight-toc a, mobile-starlight-toc a',
        )
        .allTextContents())
        expect(label).not.toMatch(
          /原資料.*ページ|[（(]\s*\d+\s*ページ\s*[）)]\s*$|^ページ\s*\d+$/,
        );
      for (const section of destination.sections.filter(
        (section: { title: string | null }) => section.title,
      )) {
        await expect(page.locator(`[id="${section.id}"]`)).toHaveCount(1);
        if (index > 0 && section === destination.sections[0]) {
          await expect(
            page.locator('main h2').filter({ hasText: section.title! }),
          ).toHaveCount(0);
          continue;
        }
        expect(
          (
            await page
              .locator('starlight-toc a, mobile-starlight-toc a')
              .allTextContents()
          ).map((text) => text.trim()),
        ).toContain(section.title);
      }
      for (const image of await page
        .locator('[data-manual-figure] img')
        .all()) {
        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            image.evaluate(
              (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
            ),
          )
          .toBe(true);
        await image.evaluate((img: HTMLImageElement) => img.decode());
      }
      for (const href of await page
        .locator('.sl-markdown-content a[href]')
        .evaluateAll((elements) =>
          elements.map((element) => (element as HTMLAnchorElement).href),
        )) {
        const url = new URL(href);
        if (url.origin !== new URL(baseURL!).origin) continue;
        expect((await request.get(url.href)).status(), href).toBe(200);
        if (url.hash && url.pathname === new URL(page.url()).pathname)
          expect(
            await page
              .locator('[id]')
              .evaluateAll(
                (elements, id) => elements.some((element) => element.id === id),
                decodeURIComponent(url.hash.slice(1)),
              ),
          ).toBe(true);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      if (index <= 1 || index === destinations.length - 1)
        await page.screenshot({ path: info.outputPath(`manual-${index}.png`) });
      if (index === 1) {
        const figure = page.locator('[data-manual-figure]').first();
        if (await figure.count()) {
          await figure.scrollIntoViewIfNeeded();
          await page.screenshot({ path: info.outputPath('manual-figure.png') });
        }
      }
    }
    expect(sectionIds).toEqual(
      manual.semantic_sections!.map((section) => section.id),
    );
    for (const source of manual.sections)
      expect(sourceIds).toContain(source.id);
    const [oldId, target] = Object.entries(manualAnchorTargets(manual))[0];
    await page.goto(
      new URL(`${manual.route.slice(1)}#${encodeURIComponent(oldId)}`, baseURL)
        .href,
    );
    await expect(page).toHaveURL(new URL(target.slice(1), baseURL).href);
    await expect(page.locator(`[id="${oldId}"]`)).toHaveCount(1);
    if (manual.route === '/manuals/rc8x-quick-reference/') {
      await page.goto(
        new URL(
          'manuals/rc8x-quick-reference/#r8fg-%E5%8F%97%E4%BF%A1%E6%A9%9F',
          baseURL,
        ).href,
      );
      await expect(page).toHaveURL(
        new URL(
          'manuals/rc8x-quick-reference/chapter-08/#section-008-r8fg-%E5%8F%97%E4%BF%A1%E6%A9%9F',
          baseURL,
        ).href,
      );
    }
    if (info.project.name === 'mobile')
      await page.locator('button[popovertarget="starlight__sidebar"]').click();
    const lastChapter = chapters.at(-1)!;
    await page
      .locator(`#starlight__sidebar a[href$="${lastChapter.route}"]`)
      .click();
    await expect(page).toHaveURL(
      new URL(lastChapter.route.slice(1), baseURL).href,
    );
    await expect(
      page.locator(`#starlight__sidebar a[href$="${lastChapter.route}"]`),
    ).toHaveAttribute('aria-current', 'page');
    for (const asset of manual.assets.filter((asset) =>
      asset.src.endsWith('.pdf'),
    )) {
      const response = await request.get(
        new URL(asset.src.slice(1), baseURL).href,
      );
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('pdf');
    }
    expect(errors).toEqual([]);
  });
}

test('manual directory keeps V2, V3 and quick references separate', async ({
  page,
  baseURL,
}) => {
  await page.goto(new URL('manuals/', baseURL).href);
  for (const route of [
    '/manuals/rc4gs-v2/',
    '/manuals/rc4gs-v3/',
    '/manuals/rc8x/',
    '/manuals/rc8x-quick-reference/',
    '/manuals/rc6gs-v3-quick-reference/',
    '/manuals/rc6gs-v3/',
  ])
    await expect(page.locator(`main a[href$="${route}"]`)).toHaveCount(1);
  await expect(page.locator('main a[href*="rc4gs-legacy"]')).toHaveCount(0);
});

for (const manual of inventory.manuals.filter(
  (manual) => manual.publication_status === 'BLOCKED_SAFETY_REVIEW',
)) {
  test(`safety-excluded manual has no generated route ${manual.route}`, async ({
    request,
    baseURL,
  }) => {
    expect(
      (
        await request.get(new URL(manual.route.slice(1), baseURL).href)
      ).status(),
    ).toBe(404);
  });
}
