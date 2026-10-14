import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { verifySource, safeRelativePath } from './drawing-library.mjs';
import { reanalysis } from '../../src/lib/drawing-publication.mjs';

// The owner moved 44 original RARs before this task; historical paths stay evidence.
export async function currentSourcePath(root, row) {
  if (
    await access(join(root, row.relative_path)).then(
      () => true,
      () => false,
    )
  )
    return row.relative_path;
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
