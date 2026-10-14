import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodePublicationImages } from '../e2e/helpers/publication-screenshot.mjs';

function pageWithImages(images) {
  return {
    locator(selector) {
      assert.equal(selector, 'img:visible');
      return { evaluateAll: async (callback) => callback(images) };
    },
  };
}

test('visible lazy images load eagerly and decode concurrently without scrolling', async () => {
  const releases = [];
  const images = [120, 240].map((naturalWidth) => ({
    loading: 'lazy',
    naturalWidth,
    decode() {
      assert.ok(images.every((image) => image.loading === 'eager'));
      return new Promise((resolve) => releases.push(resolve));
    },
  }));
  const result = decodePublicationImages(pageWithImages(images));
  assert.equal(releases.length, 2);
  releases.forEach((resolve) => resolve());
  assert.deepEqual(await result, [120, 240]);
});

test('a broken visible image fails validation', async () => {
  const images = [
    {
      loading: 'lazy',
      decode: async () => {
        throw new Error('broken image');
      },
    },
  ];
  await assert.rejects(
    decodePublicationImages(pageWithImages(images)),
    /broken image/,
  );
});

test('zero natural width remains available for the browser assertion', async () => {
  assert.deepEqual(
    await decodePublicationImages(
      pageWithImages([
        { loading: 'lazy', naturalWidth: 0, decode: async () => {} },
      ]),
    ),
    [0],
  );
});
