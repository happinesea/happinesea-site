import { randomUUID } from 'node:crypto';
import { mkdir, realpath, writeFile, rename, unlink } from 'node:fs/promises';
import { dirname, relative, isAbsolute } from 'node:path';
export async function writeLocalArtifact(
  output,
  destination,
  data,
  exclusive = false,
) {
  const logical = relative(output, destination);
  if (!logical || logical.startsWith('..') || isAbsolute(logical))
    throw new Error('Staging destination escape');
  let ancestor = dirname(destination);
  let physical;
  for (;;) {
    try {
      physical = await realpath(ancestor);
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      ancestor = dirname(ancestor);
    }
  }
  const existing = relative(output, physical);
  if (existing.startsWith('..') || isAbsolute(existing))
    throw new Error('Staging destination escape');
  await mkdir(dirname(destination), { recursive: true });
  const parent = await realpath(dirname(destination));
  const within = relative(output, parent);
  if (within.startsWith('..') || isAbsolute(within))
    throw new Error('Staging destination escape');
  if (exclusive) return writeFile(destination, data, { flag: 'wx' });
  // Atomic replacement removes a linked leaf without writing through it.
  const temporary = destination + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temporary, data, { flag: 'wx' });
    await rename(temporary, destination);
  } finally {
    await unlink(temporary).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}
