import assert from 'node:assert/strict';
import test from 'node:test';
import { manualCards } from '../../src/lib/manual-directory.mjs';

test('manual directory groups editions and quick references without exposing withheld manuals', () => {
  assert.equal(manualCards.length, 6);
  assert.equal(new Set(manualCards.map((card) => card.id)).size, 6);
  assert.deepEqual(
    manualCards
      .find((card) => card.id === 'rc4gs')
      .links.filter((link) => !link.external)
      .map((link) => link.href),
    ['/manuals/rc4gs-v2/', '/manuals/rc4gs-v3/'],
  );
  assert.deepEqual(
    manualCards
      .find((card) => card.id === 'rc6gs')
      .links.filter((link) => !link.external)
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
    ['送信機', 'フライトコントローラー'],
  );
  for (const card of manualCards) {
    assert.ok(card.image.src.startsWith('/assets/'));
    assert.ok(
      card.links.some(
        (link) =>
          link.external && new URL(link.href).hostname === 'www.radiolink.com',
      ),
    );
  }
});
