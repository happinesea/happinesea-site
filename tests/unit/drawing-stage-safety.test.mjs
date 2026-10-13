import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  link,
  symlink,
  rm,
} from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeLocalArtifact } from '../../scripts/lib/drawing-stage-safety.mjs';
test('exclusive staging rejects a hardlinked leaf; atomic metadata replacement preserves source', async () => {
  const root = await mkdtemp(join(tmpdir(), 'drawing-stage-'));
  const output = join(root, 'build');
  await mkdir(output);
  const source = join(root, 'source.pdf');
  await writeFile(source, 'original');
  const destination = join(output, 'preview.png');
  await link(source, destination);
  try {
    await assert.rejects(
      writeLocalArtifact(output, destination, Buffer.from('preview'), true),
      /EEXIST/,
    );
    await writeLocalArtifact(output, destination, 'metadata');
    assert.equal(await readFile(source, 'utf8'), 'original');
    assert.equal(await readFile(destination, 'utf8'), 'metadata');
    await assert.rejects(
      writeLocalArtifact(output, join(root, 'escape/new.png'), 'bad'),
      /escape/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('symlinked output directories cannot create descendants outside staging', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'drawing-stage-'));
  const output = join(root, 'build'),
    outside = join(root, 'outside');
  await mkdir(output);
  await mkdir(outside);
  try {
    try {
      await symlink(outside, join(output, 'linked'), 'junction');
    } catch (error) {
      if (error.code === 'EPERM') {
        t.skip('OS symlink privilege unavailable');
        return;
      }
      throw error;
    }
    await assert.rejects(
      writeLocalArtifact(output, join(output, 'linked/new/file'), 'bad'),
      /escape/,
    );
    await assert.rejects(readFile(join(outside, 'new/file')), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
