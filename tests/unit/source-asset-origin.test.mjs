import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import * as publication from '../../scripts/lib/wordpress-publication.mjs';

test('source asset resolver changes only exact HTTPS public uploads transport', () => {
  assert.equal(typeof publication.resolveBuildTimeSourceUrl, 'function');
  const resolve = publication.resolveBuildTimeSourceUrl;
  assert.equal(
    resolve(
      'https://happinesea.com/wp-content/uploads/2020/06/a%20b.png?size=1%2F2&x=3#figure',
    ),
    'https://cms.happinesea.com/wp-content/uploads/2020/06/a%20b.png?size=1%2F2&x=3#figure',
  );
  for (const url of [
    'https://external.example/wp-content/uploads/image.png',
    'https://happinesea.com.evil.example/wp-content/uploads/image.png',
    'http://happinesea.com/wp-content/uploads/image.png',
    'https://happinesea.com/other/image.png',
    'https://happinesea.com/wp-content/themes/image.png',
    'https://happinesea.com/wp-content/uploads-not/image.png',
    'https://happinesea.com/wp-content/uploads',
    'https://cms.happinesea.com/wp-content/uploads/image.png',
    'https://user:pass@happinesea.com/wp-content/uploads/image.png',
  ])
    assert.equal(resolve(url), url);
  assert.throws(() => resolve('not a URL'), TypeError);
});

test('mapped asset identity rejects missing or different reviewed source hashes', () => {
  assert.equal(typeof publication.assertBuildTimeSourceHash, 'function');
  const url = 'https://happinesea.com/wp-content/uploads/reviewed.png';
  const bytes = Buffer.from('reviewed source bytes');
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert.doesNotThrow(() =>
    publication.assertBuildTimeSourceHash(url, bytes, hash),
  );
  assert.throws(
    () => publication.assertBuildTimeSourceHash(url, bytes),
    /source asset hash/,
  );
  assert.throws(
    () => publication.assertBuildTimeSourceHash(url, bytes, '0'.repeat(64)),
    /source asset hash/,
  );
  assert.doesNotThrow(() =>
    publication.assertBuildTimeSourceHash(
      'https://external.example/image.png',
      bytes,
    ),
  );
});

test('image fetching resolves transport without adopting unreviewed bytes or changing external fetch', async () => {
  const source = 'https://happinesea.com/wp-content/uploads/a.png?x=1';
  const bytes = Buffer.from('fixture image transport bytes');
  const sha = createHash('sha256').update(bytes).digest('hex');
  let requested;
  const fetch = async (url) => {
    requested = String(url);
    return new Response(bytes, { headers: { 'content-type': 'image/png' } });
  };
  const result = await publication.fetchImage(source, fetch, sha);
  assert.equal(
    requested,
    'https://cms.happinesea.com/wp-content/uploads/a.png?x=1',
  );
  assert.deepEqual(result.bytes, bytes);
  assert.equal(result.contentType, 'image/png');
  await assert.rejects(
    publication.fetchImage(source, fetch, '0'.repeat(64)),
    /source asset hash/,
  );
  await publication.fetchImage('https://external.example/a.png', fetch);
  assert.equal(requested, 'https://external.example/a.png');
});
