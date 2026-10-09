import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capturePublicationScreenshot } from '../e2e/helpers/publication-screenshot.mjs';

function pageWithFailures(failures) {
  let attempts = 0;
  return {
    evaluate: async () => {},
    screenshot: async (options) => {
      assert.equal(options.fullPage, true);
      assert.equal(options.scale, 'css');
      assert.equal(options.path, 'capture.png');
      if (attempts++ < failures.length) throw failures[attempts - 1];
      return Buffer.from('captured');
    },
    attempts: () => attempts,
  };
}
const captureError = () =>
  new Error(
    'page.screenshot: Protocol error (Page.captureScreenshot): Unable to capture screenshot',
  );

test('capture recovers once from the observed compositor failure', async () => {
  const page = pageWithFailures([captureError()]);
  await capturePublicationScreenshot(page, 'capture.png');
  assert.equal(page.attempts(), 2);
});

test('persistent capture failure still fails verification after two attempts', async () => {
  const page = pageWithFailures([captureError(), captureError()]);
  await assert.rejects(
    capturePublicationScreenshot(page, 'capture.png'),
    /Unable to capture screenshot/,
  );
  assert.equal(page.attempts(), 2);
});

test('unrelated screenshot errors are not retried or suppressed', async () => {
  const page = pageWithFailures([new Error('Target closed')]);
  await assert.rejects(
    capturePublicationScreenshot(page, 'capture.png'),
    /Target closed/,
  );
  assert.equal(page.attempts(), 1);
});
