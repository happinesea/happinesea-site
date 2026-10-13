import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadInputs,
  proposeDrawingLibrary,
  serialize,
  verifyExistingAssets,
  verifySource,
  writeProposals,
} from './lib/drawing-library.mjs';

const args = process.argv.slice(2);
let sourceRoot, outputRoot;
for (let index = 0; index < args.length; index += 1) {
  const flag = args[index];
  if (flag === '--dry-run') continue;
  if (['--source', '--output'].includes(flag)) {
    const value = args[++index];
    if (!value || value.startsWith('--'))
      throw new Error('missing value for ' + flag);
    if (flag === '--source') sourceRoot = resolve(value);
    else outputRoot = resolve(value);
  } else
    throw new Error(
      'unsupported option; this importer only supports DRY RUN: ' + flag,
    );
}
if (!sourceRoot)
  throw new Error(
    'usage: node scripts/import-drawing-library.mjs --source <directory> [--output <review-directory>]',
  );
const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const input = await loadInputs(repoRoot);
const result = proposeDrawingLibrary(input);
await verifySource(sourceRoot, input.inventory);
await verifyExistingAssets(repoRoot, input);
if (outputRoot)
  await writeProposals({ repoRoot, sourceRoot, outputRoot, result });
console.log(serialize(outputRoot ? result.summary : result).trimEnd());
