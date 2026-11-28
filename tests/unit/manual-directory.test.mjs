import assert from 'node:assert/strict';
import test from 'node:test';
import catalogue from '../../src/data/product-catalogue.json' with { type: 'json' };
import {
  canShowGeneratedManual,
  productMaterialLinks,
} from '../../src/lib/product-materials.mjs';
import { manualCards } from '../../src/lib/manual-directory.mjs';

test('manual directory groups editions and quick references without exposing withheld manuals', () => {
  assert.equal(manualCards.length, catalogue.length);
  assert.equal(
    new Set(manualCards.map((card) => card.id)).size,
    catalogue.length,
  );
  assert.deepEqual(
    manualCards
      .find((card) => card.id === 'rc4gs')
      .links.filter(
        (link) => !link.external && !link.href.includes('official-edition'),
      )
      .map((link) => link.href),
    ['/manuals/rc4gs-v2/', '/manuals/rc4gs-v3/'],
  );
  assert.deepEqual(
    manualCards
      .find((card) => card.id === 'rc6gs')
      .links.filter(
        (link) => !link.external && !link.href.includes('official-edition'),
      )
      .map((link) => link.href),
    ['/manuals/rc6gs-v3/', '/manuals/rc6gs-v3-quick-reference/'],
  );
  assert.ok(
    !manualCards
      .flatMap((card) => card.links)
      .some((link) => link.href.includes('rc4gs-legacy')),
  );
  assert.deepEqual(
    [...new Set(manualCards.map((card) => card.category))],
    [
      '送信機',
      'フライトコントローラー',
      'モジュール・アクセサリー',
      'GPS・RTK・センサー',
      '機体',
      '電源・ESC',
      '受信機',
    ],
  );
  assert.equal(
    manualCards.find((card) => card.id === 'rc8x').links[0].label,
    '取扱説明書',
  );
  assert.ok(
    manualCards
      .find((card) => card.id === 'r7fg')
      .links.some(
        (link) => link.href === 'https://www.radiolink.com/r7fg_manual',
      ),
  );
  assert.ok(
    manualCards
      .find((card) => card.id === 'at10-ii')
      .links.some(
        (link) => link.href === 'https://www.radiolink.com/at10ii_manuals',
      ),
  );
  assert.match(
    manualCards.find((card) => card.id === 'pix6').description,
    /公式資料/,
  );
  assert.match(
    manualCards
      .find((card) => card.id === 'pix6')
      .links.find((link) => !link.external).label,
    /マルチローター版/,
  );
  assert.match(
    manualCards
      .find((card) => card.id === 'twc')
      .links.find((link) => !link.external).label,
    /公式Web資料の範囲/,
  );
  assert.match(
    manualCards
      .find((card) => card.id === 'f405')
      .links.find((link) => !link.external).label,
    /クイックガイド/,
  );
  const i2cBoard = catalogue.find(
    (product) => product.slug === 'i2c-expansion-board',
  );
  assert.deepEqual(
    productMaterialLinks(i2cBoard).map((link) => link.href),
    [i2cBoard.officialUrl],
  );
  for (const card of manualCards) {
    assert.ok(card.image.src.startsWith('/assets/'));
    assert.ok(
      card.links.some(
        (link) =>
          link.external &&
          ['www.radiolink.com', 'radiolink.com'].includes(
            new URL(link.href).hostname,
          ),
      ),
    );
  }
});

test('production hides an unpublished manual outside the release allowlist', () => {
  const savedMode = process.env.PUBLICATION_MODE;
  process.env.PUBLICATION_MODE = 'production';
  try {
    assert.equal(
      canShowGeneratedManual({
        route: '/manuals/withheld-fixture/',
        publication_status: 'UNPUBLISHED',
      }),
      false,
    );
  } finally {
    if (savedMode === undefined) delete process.env.PUBLICATION_MODE;
    else process.env.PUBLICATION_MODE = savedMode;
  }
});
