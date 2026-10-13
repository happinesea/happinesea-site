import { createHash } from 'node:crypto';
import { readFile, readdir, lstat, realpath, stat } from 'node:fs/promises';
import { join, resolve, relative, isAbsolute } from 'node:path';
import {
  loadInputs,
  verifySource,
  verifyExistingAssets,
  safeRelativePath,
} from './lib/drawing-library.mjs';
import { copyWordpressAliases } from './copy-wordpress-aliases.mjs';
import {
  finalizeLegacyOutputs,
  copyVerifiedAliases,
} from './lib/legacy-compatibility.mjs';
import { manualCanonical } from './lib/rc4gs-v2-manual.mjs';
import { writeLocalArtifact } from './lib/drawing-stage-safety.mjs';
import { catalog } from '../src/lib/drawing-publication.mjs';
const args = process.argv.slice(2);
const source = resolve(args[args.indexOf('--source') + 1] ?? '');
const out = resolve(args[args.indexOf('--out') + 1] ?? '');
if (
  !args.includes('--source') ||
  !args.includes('--out') ||
  process.env.PUBLICATION_MODE === 'production'
)
  throw Error('Local owner staging only; --source and --out required');
const boundary = await realpath('.superpowers');
const output = await realpath(out);
const within = relative(boundary, output);
if (!within || within.startsWith('..') || isAbsolute(within))
  throw Error(
    'Output must be an existing ignored local build under .superpowers',
  );
const input = await loadInputs(process.cwd());
await verifySource(source, input.inventory);
await verifyExistingAssets(process.cwd(), input);
const root = await realpath(source);
const sourceRelative = relative(root, output);
const outputRelative = relative(output, root);
if (
  !sourceRelative ||
  !outputRelative ||
  (!sourceRelative.startsWith('..') && !isAbsolute(sourceRelative)) ||
  (!outputRelative.startsWith('..') && !isAbsolute(outputRelative))
)
  throw Error('Source/output overlap');

// Reject linked artifacts before shared legacy finalizers touch the build.
for (const entry of await readdir(output, { recursive: true })) {
  const info = await lstat(join(output, entry));
  if (info.isSymbolicLink() || (info.isFile() && info.nlink > 1))
    throw Error('Linked owner output refused');
}
const manifest = JSON.parse(
  await readFile('src/data/wordpress-insight-manifest.json', 'utf8'),
);
await copyWordpressAliases(manifest, output);
const snapshot = JSON.parse(
  await readFile('src/data/legacy-compatibility.json', 'utf8'),
);
const manual = JSON.parse(
  await readFile('src/data/manuals/rc4gs-v2.json', 'utf8'),
);
snapshot.pages = snapshot.pages.map((page) => ({
  ...page,
  canonical: manualCanonical(page.canonical, manual),
}));
await finalizeLegacyOutputs(snapshot, output);
const cutover = JSON.parse(
  await readFile('src/data/cutover-compatibility.json', 'utf8'),
);
await copyVerifiedAliases(
  cutover.aliases.map((alias) => ({
    ...alias,
    canonical: manualCanonical(alias.canonical, manual),
  })),
  output,
);

const previews = JSON.parse(
  await readFile(
    '.superpowers/drawing-library-review-cache/previews.json',
    'utf8',
  ),
);
const ids = new Set(catalog.records.flatMap((r) => r.downloads));
const staged = catalog.downloads.filter((d) => d.source_path && ids.has(d.id));
const known = new Set(
  catalog.downloads.filter((d) => !d.source_path).map((d) => d.sha256),
);
const receipt = [];
const digest = (data) => createHash('sha256').update(data).digest('hex');
for (const file of staged) {
  if (
    file.publication_right !== 'REVIEW_REQUIRED' ||
    file.duplicate_status === 'EXACT_DUPLICATE'
  )
    throw Error('Invalid staging state');
  if (known.has(file.sha256)) throw Error('Duplicate binary staging refused');
  known.add(file.sha256);
  if (file.bytes >= 100 * 1024 * 1024) throw Error('Git blob hard limit');
  if (
    !safeRelativePath(file.source_path) ||
    !/^\/downloads\/drawings\/staged\/[a-z0-9-]+(?:\.part[1-9][0-9]*)?\.(zip|rar|pdf|gif|jpg|jpeg|png|7z)$/i.test(
      file.target_url,
    )
  )
    throw Error('Unsafe source/target');
  const path = await realpath(join(root, file.source_path));
  const rel = relative(root, path);
  if (
    rel.startsWith('..') ||
    isAbsolute(rel) ||
    (await lstat(join(root, file.source_path))).isSymbolicLink()
  )
    throw Error('Source escape');
  const before = await stat(path);
  const data = await readFile(path);
  if (data.length !== file.bytes || digest(data) !== file.sha256)
    throw Error('Source SHA/size mismatch');
  const destination = join(output, file.target_url.slice(1));
  if (await lstat(destination).catch(() => null))
    throw Error(
      'Refuse overwriting staged binary; rebuild a clean owner output',
    );
  await writeLocalArtifact(output, destination, data, true);
  if (digest(await readFile(destination)) !== file.sha256)
    throw Error('Staged SHA mismatch');
  const after = await stat(path);
  if (before.mtimeMs !== after.mtimeMs || before.size !== after.size)
    throw Error('Source changed during stage');
  receipt.push({
    id: file.id,
    sha256: file.sha256,
    bytes: file.bytes,
    url: file.target_url,
  });
}
for (const record of catalog.records.filter((r) => !r.existing)) {
  const file = catalog.downloads.find((d) => record.downloads.includes(d.id));
  const preview = previews[file.source_path];
  if (
    preview?.status === 'RENDERED' &&
    preview.filename === file.sha256 + '.png'
  ) {
    const from = join(
      '.superpowers/drawing-library-review-cache',
      preview.filename,
    );
    if ((await lstat(from)).isSymbolicLink())
      throw Error('Preview symlink refused');
    const dest = join(output, record.preview_url.slice(1));
    await writeLocalArtifact(output, dest, await readFile(from), true);
  } else {
    // A generic image is honest when a source preview cannot be safely read.
    const html = join(output, 'drawinglibrary', record.slug, 'index.html');
    const value = await readFile(html, 'utf8');
    await writeLocalArtifact(
      output,
      html,
      value.replaceAll(record.preview_url, '/images/drawings/placeholder.svg'),
    );
    const index = join(output, 'drawinglibrary/index.html');
    await writeLocalArtifact(
      output,
      index,
      (await readFile(index, 'utf8')).replaceAll(
        record.preview_url,
        '/images/drawings/placeholder.svg',
      ),
    );
  }
}
await writeLocalArtifact(
  output,
  join(output, 'owner-staging-receipt.json'),
  JSON.stringify(
    {
      localOnly: true,
      rights: 'REVIEW_REQUIRED',
      files: receipt,
      totalBytes: receipt.reduce((n, f) => n + f.bytes, 0),
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    stagedFiles: receipt.length,
    bytes: receipt.reduce((n, f) => n + f.bytes, 0),
    records: catalog.records.length,
    sourceUnchanged: true,
  }),
);
