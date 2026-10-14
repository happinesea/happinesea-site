import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { verifySource, safeRelativePath } from './drawing-library.mjs';
import {
  reanalysis,
  ownerExclusions,
} from '../../src/lib/drawing-publication.mjs';

// The owner moved 44 original RARs before this task; historical paths stay evidence.
export async function currentSourcePath(root, row) {
  if (
    await access(join(root, row.relative_path)).then(
      () => true,
      () => false,
    )
  )
    return row.relative_path;
  const excluded = ownerExclusions.find((e) => e.source_sha256 === row.sha256);
  if (excluded) {
    if (!safeRelativePath(excluded.current_source_path))
      throw Error('Unsafe retired source path');
    return excluded.current_source_path;
  }
  const moved = reanalysis.archives.find(
    (a) => a.source_rar_sha256 === row.sha256,
  );
  if (!moved || !safeRelativePath(moved.source_rar_path))
    throw Error('Missing source mapping');
  return 'rar-zip_変換/' + moved.source_rar_path.replaceAll('\\', '/');
}

export async function verifyCurrentSource(root, inventory) {
  const mapped = [];
  for (const row of inventory)
    mapped.push({ ...row, relative_path: await currentSourcePath(root, row) });
  return verifySource(root, mapped);
}
