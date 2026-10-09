import test from 'node:test';
import assert from 'node:assert/strict';
import {
  selectMode,
  requireApproval,
  requireStagingPages,
} from '../../scripts/publication-deployment.mjs';
import { assertSafeRuntime } from '../../scripts/lib/publication-origin.mjs';

test('staging never overwrites an assigned custom domain', () => {
  assert.doesNotThrow(() => requireStagingPages({ cname: null }));
  assert.throws(() => requireStagingPages({ cname: 'happinesea.com' }));
  assert.throws(() => requireStagingPages({}));
});

test('only explicit main manual dispatch can select production', () => {
  assert.equal(selectMode('push', 'refs/heads/main', ''), 'staging');
  assert.equal(
    selectMode('workflow_dispatch', 'refs/heads/main', ''),
    'staging',
  );
  assert.equal(
    selectMode('workflow_dispatch', 'refs/heads/main', 'staging'),
    'staging',
  );
  assert.equal(
    selectMode('workflow_dispatch', 'refs/heads/main', 'production'),
    'production',
  );
  assert.throws(() => selectMode('push', 'refs/heads/main', 'production'));
  assert.throws(() =>
    selectMode('workflow_dispatch', 'refs/heads/test', 'production'),
  );
  assert.throws(() =>
    selectMode('workflow_dispatch', 'refs/heads/main', 'invalid'),
  );
});

test('missing or empty reviewer protection cannot authorize production', () => {
  assert.throws(() => requireApproval({ protection_rules: [] }));
  assert.throws(() =>
    requireApproval({
      protection_rules: [{ type: 'required_reviewers', reviewers: [] }],
    }),
  );
  assert.throws(() =>
    requireApproval({ protection_rules: [{ type: 'branch_policy' }] }),
  );
  assert.doesNotThrow(() =>
    requireApproval({
      protection_rules: [
        {
          type: 'required_reviewers',
          reviewers: [{ type: 'User', reviewer: { id: 1 } }],
        },
      ],
    }),
  );
});

test('production static origin is allowed without permitting CMS/PHP runtime', () => {
  const check = (url, base = 'https://happinesea.com/', mode = 'production') =>
    assertSafeRuntime({ kind: 'runtime', url }, base, mode);
  assert.doesNotThrow(() => check('https://happinesea.com/assets/image.webp'));
  assert.doesNotThrow(() =>
    check('http://127.0.0.1:4343/assets/image.webp', 'http://127.0.0.1:4343/'),
  );
  for (const url of [
    'https://cms.happinesea.com/image.webp',
    'https://happinesea.com/wp-json/posts',
    'https://happinesea.com/wp-json',
    'https://happinesea.com/blog/wp-json/posts',
    'https://happinesea.com/wp-admin',
    'https://happinesea.com/index%2Ephp',
    'https://happinesea.com/index.php',
    'https://happinesea.com/?download=1',
    'http://happinesea.com/assets/image.webp',
    'https://www.happinesea.com/assets/image.webp',
  ])
    assert.throws(() => check(url), url);
  assert.throws(() =>
    check('https://happinesea.com/assets/image.webp', 'http://127.0.0.1:4343/'),
  );
  assert.throws(() =>
    check(
      'https://happinesea.com/assets/image.webp',
      'https://happinesea.com/',
      'staging',
    ),
  );
  assert.throws(() =>
    check(
      'http://127.0.0.1:4343/happinesea-site/wp-json/posts',
      'http://127.0.0.1:4343/happinesea-site/',
      'staging',
    ),
  );
});
