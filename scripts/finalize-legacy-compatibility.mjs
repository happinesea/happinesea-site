import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { manualCanonical } from './lib/rc4gs-v2-manual.mjs';
import {
  finalizeLegacyOutputs,
  copyVerifiedAliases,
} from './lib/legacy-compatibility.mjs';

const snapshot = JSON.parse(
  await readFile(
    new URL('../src/data/legacy-compatibility.json', import.meta.url),
    'utf8',
  ),
);
const manual = JSON.parse(
  await readFile(
    new URL('../src/data/manuals/rc4gs-v2.json', import.meta.url),
    'utf8',
  ),
);
snapshot.pages = snapshot.pages.map((page) => ({
  ...page,
  canonical: manualCanonical(page.canonical, manual),
}));
await finalizeLegacyOutputs(
  snapshot,
  fileURLToPath(new URL('../dist/', import.meta.url)),
);
const cutover = JSON.parse(
  await readFile(
    new URL('../src/data/cutover-compatibility.json', import.meta.url),
    'utf8',
  ),
);
await copyVerifiedAliases(
  cutover.aliases.map((alias) => ({
    ...alias,
    canonical: manualCanonical(alias.canonical, manual),
  })),
  fileURLToPath(new URL('../dist/', import.meta.url)),
);
console.log(
  `Verified ${snapshot.pages.length} legacy pages and ${snapshot.assets.length} byte-preserved assets.`,
);
