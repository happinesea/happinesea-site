import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const services = await import('../../src/lib/google-services.mjs').catch(
  () => ({}),
);

test('Google publication requires explicit production and independent true flags', () => {
  assert.equal(typeof services.googleServiceFlags, 'function');
  const flags = services.googleServiceFlags;
  assert.deepEqual(flags({}), { analytics: false, adsense: false });
  for (const mode of ['staging', 'invalid', undefined])
    assert.deepEqual(
      flags({
        PUBLICATION_MODE: mode,
        ANALYTICS_ENABLED: 'true',
        ADSENSE_ENABLED: 'true',
      }),
      { analytics: false, adsense: false },
    );
  assert.deepEqual(
    flags({ PUBLICATION_MODE: 'production', ANALYTICS_ENABLED: 'true' }),
    { analytics: true, adsense: false },
  );
  assert.deepEqual(
    flags({
      PUBLICATION_MODE: 'production',
      ADSENSE_ENABLED: 'true',
      ANALYTICS_ENABLED: '1',
    }),
    { analytics: false, adsense: true },
  );
});

test('Google bootstrap only loads once on exact HTTPS public origin', () => {
  assert.equal(typeof services.startGoogleService, 'function');
  for (const origin of [
    'http://localhost:4321',
    'https://happinesea.github.io',
    'http://happinesea.com',
    'https://www.happinesea.com',
    'https://happinesea.com',
  ]) {
    const scripts = [];
    const window = { location: { origin } };
    const document = {
      getElementById: (id) => scripts.find((s) => s.id === id),
      createElement: () => ({}),
      head: { append: (s) => scripts.push(s) },
    };
    for (let i = 0; i < 2; i++) {
      runInNewContext(
        `(${services.startGoogleService})('G-R5SC3Z7WHL', 'analytics')`,
        { window, document, Date },
      );
      runInNewContext(
        `(${services.startGoogleService})('ca-pub-9916217226323909', 'adsense')`,
        { window, document, Date },
      );
    }
    if (origin !== 'https://happinesea.com') {
      assert.equal(scripts.length, 0);
      assert.equal(window.dataLayer, undefined);
    } else {
      assert.equal(scripts.length, 2);
      assert.equal(
        scripts[0].src,
        'https://www.googletagmanager.com/gtag/js?id=G-R5SC3Z7WHL',
      );
      assert.equal(
        scripts[1].src,
        'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9916217226323909',
      );
      assert.equal(scripts[1].crossOrigin, 'anonymous');
      assert.ok(scripts.every((s) => s.async));
      assert.deepEqual(Array.from(window.dataLayer[1]), [
        'config',
        'G-R5SC3Z7WHL',
      ]);
      assert.equal(window.dataLayer.length, 2);
    }
  }
});

test('privacy replacement changes only the future-service supplement and fails on drift', () => {
  assert.equal(typeof services.updateGooglePrivacy, 'function');
  const original = JSON.parse(
    readFileSync('src/data/legacy-compatibility.json'),
  ).pages.find((p) => p.id === 3).content_html;
  const updated = services.updateGooglePrivacy(original, {
    analytics: true,
    adsense: true,
  });
  assert.match(updated, /Google Analytics 4を利用しています/);
  assert.match(updated, /Google AdSenseを利用しています/);
  const boundary = original.indexOf('<h3>アクセス解析・広告配信</h3>');
  assert.equal(updated.slice(0, boundary), original.slice(0, boundary));
  assert.equal(
    updated.slice(updated.indexOf('<h3>外部リンク')),
    original.slice(original.indexOf('<h3>外部リンク')),
  );
  const disabled = services.updateGooglePrivacy(original, {
    analytics: false,
    adsense: false,
  });
  assert.doesNotMatch(disabled, /を利用しています/);
  assert.throws(
    () =>
      services.updateGooglePrivacy(
        original.replace('現在導入していません', 'drift'),
        {},
      ),
    /privacy supplement drift/,
  );
});
