import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const snapshot = JSON.parse(
  readFileSync('src/data/legacy-compatibility.json', 'utf8'),
);
const fixture = JSON.parse(
  readFileSync('tests/fixtures/legacy-editorial-review.json', 'utf8'),
);

test('archive headings identify their actual WordPress category or FAQ archive', async ({
  page,
}) => {
  await page.goto('./category/news');
  await expect(page.locator('h1')).toHaveText('ニュース・航空知識');
  await expect(page.locator('[data-legacy-body]')).toContainText(
    'ニュース、航空豆知識をまとめてます。',
  );
  await page.goto('./ufaq');
  await expect(page.locator('h1')).toHaveText('Archives: FAQs');
});

test('archive pagination and migrated article links use local compatibility routes without changing membership', async ({
  page,
}) => {
  const canonical = 'https://happinesea.com/category/radiolink-support/page/2';
  const source = fixture.pages.find(
    (x: { canonical: string }) => x.canonical === canonical,
  );
  await page.goto(`.${source.target_route}`);
  const members = page
    .locator('[data-legacy-body] > ul')
    .first()
    .getByRole('link');
  await expect(members).toHaveCount(10);
  for (const [index, entry] of source.archive_entries.entries()) {
    await expect(members.nth(index)).toHaveText(entry.title);
    expect(
      new URL(
        (await members.nth(index).getAttribute('href')) ?? '',
        page.url(),
      ).pathname.replace(/^\/happinesea-site/, ''),
    ).toBe(new URL(entry.url).pathname);
  }
  const firstPage = page
    .locator('[data-legacy-body] a[href$="/category/radiolink-support/"]')
    .first();
  await expect(firstPage).toHaveAttribute(
    'href',
    '/happinesea-site/category/radiolink-support/',
  );
  await page.goto('./radiolink-productions-manual/rc4gs-manual');
  await expect(
    page
      .locator('[data-legacy-body] a')
      .filter({ hasText: '1.3．RC4GSファームウェアアップグレード手順' }),
  ).toHaveAttribute(
    'href',
    '/happinesea-site/radiolink-support/20200313160.html',
  );
});

test('percent-escape casing variants preserve FAQ canonical and answer', async ({
  page,
  request,
}) => {
  const item = snapshot.pages.find((x: { id: number }) => x.id === 1624);
  const path = new URL(item.source_url).pathname;
  for (const value of [
    path,
    path.replace(/%[0-9a-f]{2}/gi, (escape: string) => escape.toUpperCase()),
  ]) {
    expect((await request.get(`.${value}`)).status()).toBe(200);
    await page.goto(`.${value}?compat=1`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      item.canonical,
    );
    await expect(page.locator('[data-legacy-body]')).toContainText(
      'RC4GS/RC6GSとも、最大、10件まで保存できます。',
    );
    expect(new URL(page.url()).search).toBe('?compat=1');
  }
});
