import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { canonicalUrl, withBase } from '../../src/lib/urls.ts';

const config = (mode) =>
  JSON.parse(
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import config from './astro.config.mjs'; console.log(JSON.stringify({site:config.site,base:config.base}));",
      ],
      {
        env: { ...process.env, PUBLICATION_MODE: mode },
        encoding: 'utf8',
        stdio: 'pipe',
      },
    ),
  );
test('default and explicit staging retain project Pages URLs', () => {
  for (const mode of ['', 'staging']) {
    const value = config(mode);
    assert.equal(
      canonicalUrl('/radiolink/', new URL(value.site), value.base),
      'https://happinesea.github.io/happinesea-site/radiolink/',
    );
  }
});
test('explicit production emits root public canonical and asset paths', () => {
  const value = config('production');
  assert.equal(
    canonicalUrl('/radiolink/', new URL(value.site), value.base),
    'https://happinesea.com/radiolink/',
  );
  assert.equal(
    withBase('/assets/image.webp', value.base),
    '/assets/image.webp',
  );
});
test('unknown publication mode fails closed instead of silently selecting an origin', () => {
  assert.throws(() => config('prodution'));
});
