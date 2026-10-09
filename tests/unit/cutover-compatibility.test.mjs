import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import * as compatibility from '../../scripts/lib/legacy-compatibility.mjs';

test('verified manual aliases copy existing HTML without redirect or canonical substitution', async () => {
  assert.equal(typeof compatibility.copyVerifiedAliases, 'function');
  const dir = await mkdtemp(join(tmpdir(), 'cutover-alias-'));
  const html =
    '<link rel="canonical" href="https://happinesea.com/manual/123.html"><h1>Manual</h1>';
  const aliases = [
    {
      target_route: '/old/123.html',
      source_route: '/manual/123.html',
      canonical: 'https://happinesea.com/manual/123.html',
    },
  ];
  try {
    await mkdir(join(dir, 'manual'));
    await writeFile(join(dir, 'manual/123.html'), html);
    await compatibility.copyVerifiedAliases(aliases, dir);
    assert.equal(await readFile(join(dir, 'old/123.html'), 'utf8'), html);
    await assert.rejects(
      () => compatibility.copyVerifiedAliases(aliases, dir),
      /collision/,
    );
    await assert.rejects(
      () =>
        compatibility.copyVerifiedAliases(
          [{ ...aliases[0], target_route: '/../escape.html' }],
          dir,
        ),
      /unsafe/,
    );
    await assert.rejects(
      () =>
        compatibility.copyVerifiedAliases(
          [
            {
              ...aliases[0],
              target_route: '/bad.html',
              canonical: 'https://happinesea.com/wrong',
            },
          ],
          dir,
        ),
      /canonical/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('owner-approved link-only edits preserve labels and reject literal/source drift', () => {
  assert.equal(typeof compatibility.applyApprovedLinkEdits, 'function');
  const html =
    '<p>Manual <a href="https://happinesea.com/missing">R6DSM</a></p>';
  const edits = [
    {
      route: '/index',
      content_sha256: createHash('sha256').update(html).digest('hex'),
      links: ['https://happinesea.com/missing'],
    },
  ];
  assert.equal(
    compatibility.applyApprovedLinkEdits(html, '/index', edits),
    '<p>Manual R6DSM</p>',
  );
  assert.equal(
    compatibility.applyApprovedLinkEdits(html, '/other', edits),
    html,
  );
  assert.throws(
    () => compatibility.applyApprovedLinkEdits(html + 'drift', '/index', edits),
    /drift/,
  );
});
