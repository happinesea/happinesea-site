import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { finalizeLegacyOutputs } from './lib/legacy-compatibility.mjs';

const snapshot = JSON.parse(
  await readFile(
    new URL('../src/data/legacy-compatibility.json', import.meta.url),
    'utf8',
  ),
);
await finalizeLegacyOutputs(
  snapshot,
  fileURLToPath(new URL('../dist/', import.meta.url)),
);
console.log(
  `Verified ${snapshot.pages.length} legacy pages and ${snapshot.assets.length} byte-preserved assets.`,
);
