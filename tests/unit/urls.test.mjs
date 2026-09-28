import assert from 'node:assert/strict';
import test from 'node:test';

import { canonicalUrl, withBase } from '../../src/lib/urls.ts';

test('withBase prefixes project Pages paths', () => {
  assert.equal(
    withBase('/radiolink/', '/happinesea-site/'),
    '/happinesea-site/radiolink/',
  );
  assert.equal(withBase('/radiolink/', '/'), '/radiolink/');
});

test('withBase normalizes duplicate slashes and retains query and hash', () => {
  assert.equal(
    withBase('/radiolink///rc8x/?view=full#specs', '/happinesea-site/'),
    '/happinesea-site/radiolink/rc8x/?view=full#specs',
  );
});

test('withBase rejects external URLs', () => {
  assert.throws(
    () => withBase('https://example.com/path', '/happinesea-site/'),
    /internal path/i,
  );
});

test('canonicalUrl builds an absolute project Pages URL', () => {
  assert.equal(
    canonicalUrl(
      '/radiolink/rc8x/',
      new URL('https://happinesea.github.io'),
      '/happinesea-site/',
    ),
    'https://happinesea.github.io/happinesea-site/radiolink/rc8x/',
  );
});

test('canonicalUrl requires configured site origin outside Astro', () => {
  assert.throws(
    () => canonicalUrl('/radiolink/', undefined, '/'),
    /site configuration/i,
  );
});
