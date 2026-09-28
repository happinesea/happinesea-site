import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const route = (path) =>
  readFile(new URL(`../dist/${path}`, import.meta.url), 'utf8');

test('home exposes product and editorial pillars', async () => {
  const html = await route('index.html');

  assert.match(html, /data-home-pillar="products"/);
  assert.match(html, /data-home-pillar="insights"/);
});

test('Radiolink catalogue exposes seven accessible category filters', async () => {
  const html = await route('radiolink/index.html');
  const categories = [
    '送信機',
    '受信機',
    'フライトコントローラー',
    'GPS・RTK・センサー',
    '機体',
    '電源・ESC',
    'モジュール・アクセサリー',
  ];

  for (const category of categories) {
    assert.match(html, new RegExp(`data-category-filter="${category}"`));
  }
  assert.match(html, /aria-live="polite"/);
});
