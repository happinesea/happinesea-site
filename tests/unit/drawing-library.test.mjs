import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import {
  mkdtemp,
  mkdir,
  link,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const moduleUrl = new URL(
  '../../scripts/lib/drawing-library.mjs',
  import.meta.url,
);
const hash = (text) => createHash('sha256').update(text).digest('hex');
const module = await import(moduleUrl).catch(() => ({}));

test('unproven exact claims and standalone rights promotion fail closed', async () => {
  const input = fixture();
  input.dedup[0].dedup_status = 'EXACT_DUPLICATE';
  assert.throws(() => module.proposeDrawingLibrary(input), /unproven exact/);
  const root = await mkdtemp(join(tmpdir(), 'drawing-gate-'));
  try {
    await mkdir(join(root, 'source'));
    const result = module.proposeDrawingLibrary(fixture(['set.part1.rar']));
    result.downloads[0].publication_right = 'OWNER_APPROVED';
    await assert.rejects(
      module.writeProposals({
        repoRoot: root,
        sourceRoot: join(root, 'source'),
        outputRoot: join(root, 'src/data/drawing-library'),
        result,
      }),
      /rights promotion/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('hardlinked proposal destinations cannot overwrite source or public assets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'drawing-hardlink-'));
  try {
    const source = join(root, 'source');
    const output = join(root, 'src/data/drawing-library');
    await mkdir(source);
    await mkdir(output, { recursive: true });
    const original = join(source, 'untouched.pdf');
    await writeFile(original, 'original');
    await link(original, join(output, 'records.proposed.json'));
    await module.writeProposals({
      repoRoot: root,
      sourceRoot: source,
      outputRoot: output,
      result: module.proposeDrawingLibrary(fixture()),
    });
    assert.equal(await readFile(original, 'utf8'), 'original');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function fixture(names = ['飞机图纸.pdf']) {
  const inventory = names.map((name, index) => ({
    relative_path: name,
    original_filename: name,
    parent_directory: '.',
    extension: '.' + name.split('.').at(-1).toLowerCase(),
    bytes: 5,
    sha256: hash('data' + index),
    is_archive: /\.(zip|rar)$/i.test(name),
    type: /\.(zip|rar)$/i.test(name) ? 'archive' : 'pdf',
    ...(/\.(zip|rar)$/i.test(name)
      ? { archive: { status: 'LISTED', members: [] } }
      : {}),
  }));
  return {
    inventory,
    dedup: inventory.map((row, index) => ({
      relative_path: row.relative_path,
      file_id: 'file-' + hash(row.relative_path),
      record_candidate_id: 'drawing-' + index,
      dedup_status: 'NEW_CONTENT',
      publication_status: 'REVIEW_REQUIRED',
      publication_rights: 'UNKNOWN',
      evidence: [],
      source_exact_peers: [],
      source_probable_peers: [],
      source_archive_member_matches: [],
    })),
    titles: inventory.map((row, index) => ({
      relative_path: row.relative_path,
      file_id: 'file-' + hash(row.relative_path),
      record_candidate_id: 'drawing-' + index,
      title_original: row.original_filename.slice(0, -row.extension.length),
      title_ja_candidate: '機体資料 ' + index,
      confidence: 'low',
      notes: '名称未確認',
      category_candidate: '機体の設計図',
    })),
    candidates: [],
    legacy: { pages: [], assets: [] },
    staticDownloads: { files: [] },
    existingDownloads: [],
    existingImages: [],
  };
}

function addExisting(input, sha = hash('old')) {
  const route = '/downloads/drawings/old.pdf';
  input.staticDownloads.files.push({
    target_route: route,
    sha256: sha,
    received_bytes: 5,
    content_type: 'application/pdf',
    legacy_routes: ['/wp-content/uploads/old.pdf'],
    source_urls: [],
  });
  input.existingDownloads.push({
    target_route: route,
    sha256: sha,
    bytes: 5,
    package_ids: ['12'],
  });
  input.legacy.pages.push({
    type: 'download_endpoint',
    download_id: '12',
    target_route: '/download/old',
    canonical: 'https://happinesea.com/download/old',
    download_target: '/wp-content/uploads/old.pdf',
    title: '既存図面',
    hero: null,
  });
}

test('drawing importer exposes a dry-run planner', () => {
  assert.equal(typeof module.proposeDrawingLibrary, 'function');
});

test('proposals preserve Chinese originals and are deterministic without status promotion', () => {
  const input = fixture();
  const first = module.proposeDrawingLibrary(input);
  assert.equal(
    module.serialize(first),
    module.serialize(module.proposeDrawingLibrary(input)),
  );
  assert.equal(first.records[0].title_original, '飞机图纸');
  assert.equal(first.records[0].publication_status, 'REVIEW_REQUIRED');
  assert.equal(first.records[0].publication_right, 'REVIEW_REQUIRED');
  assert.equal(first.records[0].grouping_status, 'REVIEW_REQUIRED');
  assert.equal(first.title_review_queue.length, 1);
});

test('SHA exact reuses existing binary and never generates another record or filename', () => {
  const input = fixture();
  addExisting(input, input.inventory[0].sha256);
  const result = module.proposeDrawingLibrary(input);
  assert.equal(result.records.length, 1);
  const source = result.downloads.find((d) => d.source_path);
  assert.equal(source.duplicate_status, 'EXACT_DUPLICATE');
  assert.equal(source.filename_public_candidate, null);
  assert.ok(source.duplicate_of.some((r) => r.kind === 'EXISTING_BINARY'));
});

test('archive member equality is a relation, not a whole package duplicate', () => {
  const input = fixture(['planes.zip']);
  addExisting(input);
  input.inventory[0].archive.members = [
    {
      name: 'old.pdf',
      bytes: 5,
      extension: '.pdf',
      sha256: hash('old'),
      safe: true,
    },
  ];
  const result = module.proposeDrawingLibrary(input);
  const source = result.downloads.find((d) => d.source_path);
  assert.notEqual(source.duplicate_status, 'EXACT_DUPLICATE');
  assert.ok(
    source.duplicate_of.some((r) => r.kind === 'CONTAINS_EXISTING_BINARY'),
  );
  assert.equal(source.filename_public_candidate, null);
});

test('legacy ID and encoded/slash URL collisions route to refresh rather than new records', () => {
  for (const kind of ['id', 'url']) {
    const input = fixture();
    addExisting(input);
    if (kind === 'id') input.dedup[0].legacy_package_ids = ['12'];
    else
      input.dedup[0].evidence = [
        {
          kind: 'NORMALIZED_FILENAME',
          legacy_url: 'https://happinesea.com/download/%6fld/',
        },
      ];
    const result = module.proposeDrawingLibrary(input);
    assert.equal(result.records.length, 1);
    assert.equal(result.existing_refresh_proposals.length, 1);
    assert.equal(
      result.downloads.find((d) => d.source_path).mapped_record_id,
      null,
    );
  }
});

test('different content at the same slug fails closed; identical content becomes a relation', () => {
  const input = fixture(['first.pdf', 'second.pdf']);
  input.titles.forEach((t) => {
    t.record_candidate_id = 'drawing-same';
  });
  // A multi-file title group is held, not silently collapsed into a slug.
  const held = module.proposeDrawingLibrary(input);
  assert.equal(held.records.length, 0);
  assert.equal(held.grouping_review_queue.length, 1);
  const records = module.proposeDrawingLibrary(fixture()).records;
  const other = JSON.parse(JSON.stringify(records[0]));
  other.id = 'drawing-another';
  other.downloads[0].sha256 = hash('other');
  assert.throws(
    () => module.validateRecords([...records, other]),
    /slug collision.*REVIEW_REQUIRED/,
  );
  other.downloads[0].sha256 = records[0].downloads[0].sha256;
  assert.equal(module.checkRecordCollisions([...records, other]).length, 1);
});

test('probable duplicates and filename-only grouping are held without auto merge', () => {
  const input = fixture(['J10.rar', '歼10.rar']);
  input.dedup.forEach((d) => {
    d.dedup_status = 'PROBABLE_DUPLICATE';
  });
  input.titles.forEach((t) => {
    t.record_candidate_id = 'drawing-j10';
  });
  const result = module.proposeDrawingLibrary(input);
  assert.equal(result.records.length, 0);
  assert.equal(result.downloads.length, 2);
  assert.equal(result.grouping_review_queue[0].owner_decision_required, true);
  assert.ok(result.downloads.every((d) => d.mapped_record_id === null));
});

test('nested, split and unsafe archive names remain review-only without extraction', () => {
  const input = fixture(['inner.rar', 'set.part1.rar', 'set.part2.rar']);
  input.inventory[0].archive.members = [
    { name: '../escape.zip', bytes: 5, extension: '.zip', safe: false },
  ];
  const result = module.proposeDrawingLibrary(input);
  assert.ok(
    result.downloads.every((d) => d.publication_right === 'REVIEW_REQUIRED'),
  );
  assert.ok(
    result.downloads.every((d) => d.filename_public_candidate === null),
  );
  assert.equal(result.records.length, 0);
});

test('case-insensitive filename collisions do not conflate different source files', () => {
  const input = fixture(['Plane.pdf', 'plane.PDF']);
  const result = module.proposeDrawingLibrary(input);
  assert.equal(result.records.length, 0);
  assert.equal(result.duplicate_report.filename_collisions.length, 1);
  assert.equal(new Set(result.downloads.map((d) => d.id)).size, 2);
});

test('source paths and malformed metadata fail closed', () => {
  for (const path of [
    '../x.pdf',
    '/x.pdf',
    'C:/x.pdf',
    'a\\x.pdf',
    'a//x.pdf',
    'a/./x.pdf',
    'x\0.pdf',
    '%2e%2e/x.pdf',
  ]) {
    const input = fixture();
    input.inventory[0].relative_path = path;
    assert.throws(
      () => module.proposeDrawingLibrary(input),
      /unsafe|invalid|mismatch/,
    );
  }
  const input = fixture();
  input.inventory[0].bytes = -1;
  assert.throws(() => module.proposeDrawingLibrary(input), /invalid/);
  const promoted = module.proposeDrawingLibrary(fixture()).records;
  promoted[0].publication_status = 'READY';
  assert.throws(
    () => module.validateRecords(promoted),
    /promotion|rights|review/,
  );
});

test('replay hashes source while preserving size/mtime; mutation and missing files fail', async () => {
  const root = await mkdtemp(join(tmpdir(), 'drawing-source-'));
  try {
    const input = fixture(['中文設計図.pdf']);
    const file = join(root, '中文設計図.pdf');
    await writeFile(file, 'data0');
    const before = await stat(file);
    await module.verifySource(root, input.inventory);
    const after = await stat(file);
    assert.equal(before.size, after.size);
    assert.equal(before.mtimeMs, after.mtimeMs);
    assert.equal(hash(await readFile(file)), input.inventory[0].sha256);
    await writeFile(file, 'changed');
    await assert.rejects(
      module.verifySource(root, input.inventory),
      /source.*changed|SHA|size/,
    );
    await rm(file);
    await assert.rejects(
      module.verifySource(root, input.inventory),
      /source|missing|inventory/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('proposal writer accepts only review directories and never public/source output', async () => {
  const root = await mkdtemp(join(tmpdir(), 'drawing-output-'));
  try {
    const source = join(root, 'source');
    await mkdir(source);
    const result = module.proposeDrawingLibrary(fixture());
    for (const target of [
      join(root, 'public/downloads/drawings'),
      source,
      join(root, 'src/pages'),
      join(root, 'outside'),
    ]) {
      await assert.rejects(
        module.writeProposals({
          repoRoot: root,
          sourceRoot: source,
          outputRoot: target,
          result,
        }),
        /output|review/,
      );
    }
    const outputRoot = join(root, 'src/data/drawing-library');
    await module.writeProposals({
      repoRoot: root,
      sourceRoot: source,
      outputRoot,
      result,
    });
    assert.ok(
      (await readdir(outputRoot)).every((name) => name.endsWith('.json')),
    );
    assert.deepEqual(await readdir(source), []);
    await assert.rejects(stat(join(root, 'public')), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('real Task 0 produces held groups and protects all six existing records and F-14 canonical', async () => {
  const input = await module.loadInputs(new URL('../../', import.meta.url));
  const result = module.proposeDrawingLibrary(input);
  assert.equal(result.summary.source_downloads, 71);
  assert.equal(result.summary.existing_records, 6);
  assert.ok(
    result.records.some(
      (r) =>
        r.legacy.wordpress_ids.includes('1712') &&
        r.legacy.wordpress_ids.includes('1717'),
    ),
  );
  const f14 = result.records.find((r) =>
    r.legacy.wordpress_ids.includes('2168'),
  );
  assert.ok(f14.legacy.canonical_url.includes('f4d'));
  assert.ok(
    result.downloads.every((d) => d.publication_right === 'REVIEW_REQUIRED'),
  );
  assert.ok(
    result.records.every((r) => r.publication_status === 'REVIEW_REQUIRED'),
  );
});
