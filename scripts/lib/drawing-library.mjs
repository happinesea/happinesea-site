import Ajv2020 from 'ajv/dist/2020.js';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  stat,
  writeFile,
  unlink,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadFilename } from './legacy-compatibility.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const schema = JSON.parse(
  await readFile(
    join(root, 'src/data/contracts/drawing-library-v0.1.schema.json'),
    'utf8',
  ),
);
const ajv = new Ajv2020({ allErrors: true });
const recordValidator = ajv.compile(schema);
const downloadValidator = ajv.compile({
  $defs: schema.$defs,
  type: 'array',
  items: { $ref: '#/$defs/download' },
});
const shaPattern = /^[a-f0-9]{64}$/;
const archives = new Set(['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz']);
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const unique = (values) => [...new Set(values)].sort(compare);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const sorted = (values, key) =>
  [...values].sort((a, b) => compare(a[key], b[key]));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const isBelow = (parent, child) => {
  const path = relative(parent, child);
  return (
    path !== '' &&
    !path.startsWith('..' + sep) &&
    path !== '..' &&
    !isAbsolute(path)
  );
};

export function serialize(value) {
  const canonical = (item) =>
    Array.isArray(item)
      ? item.map(canonical)
      : item && typeof item === 'object'
        ? Object.fromEntries(
            Object.keys(item)
              .sort(compare)
              .map((key) => [key, canonical(item[key])]),
          )
        : item;
  return JSON.stringify(canonical(value), null, 2) + '\n';
}

export function safeRelativePath(path, archive = false) {
  if (typeof path !== 'string' || !path) return false;
  const value = archive ? path.replaceAll('\\', '/') : path;
  let decoded;
  try {
    decoded = decodeURIComponent(
      value.replace(/%(?![a-f0-9]{2})/gi, '%25'),
    ).normalize('NFKC');
  } catch {
    return false;
  }
  return [value, decoded].every((name) => {
    // eslint-disable-next-line no-control-regex -- control bytes cannot belong to portable paths
    if (name.startsWith('/') || /[\\:\x00-\x1f\x7f]/.test(name)) return false;
    return name
      .split('/')
      .every((segment) => segment && segment !== '.' && segment !== '..');
  });
}

const normalizedName = (name) => name.normalize('NFKC').toLowerCase();

function urlKey(value) {
  const url = new URL(value, 'https://happinesea.com');
  assert(
    url.origin === 'https://happinesea.com' && !url.username && !url.password,
    'invalid legacy URL origin',
  );
  const path = decodeURIComponent(url.pathname).replace(/\/$/, '') || '/';
  // URLs may contain fullwidth punctuation forbidden in a local Windows filename.
  assert(
    // eslint-disable-next-line no-control-regex -- reject URL controls without renaming old punctuation
    !/[\\\x00-\x1f\x7f]/.test(path) &&
      !path.split('/').some((part) => part === '.' || part === '..'),
    'unsafe legacy URL',
  );
  return path;
}

function validateInput(input) {
  for (const key of [
    'inventory',
    'dedup',
    'titles',
    'candidates',
    'existingDownloads',
    'existingImages',
  ])
    assert(Array.isArray(input[key]), 'invalid input ' + key);
  assert(
    Array.isArray(input.legacy?.pages) &&
      Array.isArray(input.staticDownloads?.files),
    'invalid existing metadata',
  );
  const seen = new Set();
  for (const row of input.inventory) {
    assert(safeRelativePath(row.relative_path), 'unsafe source path');
    assert(!seen.has(row.relative_path), 'invalid repeated source path');
    seen.add(row.relative_path);
    assert(
      typeof row.original_filename === 'string' &&
        row.original_filename === row.relative_path.split('/').at(-1),
      'invalid filename/path mismatch',
    );
    assert(
      Number.isSafeInteger(row.bytes) &&
        row.bytes >= 0 &&
        shaPattern.test(row.sha256),
      'invalid source size/SHA',
    );
    assert(
      /^\.[a-z0-9]+$/.test(row.extension) &&
        row.original_filename.toLowerCase().endsWith(row.extension),
      'invalid extension',
    );
    assert(
      typeof row.is_archive === 'boolean' &&
        row.is_archive === archives.has(row.extension),
      'invalid archive type',
    );
    if (row.is_archive) {
      assert(
        row.archive &&
          typeof row.archive.status === 'string' &&
          Array.isArray(row.archive.members),
        'invalid archive metadata',
      );
      for (const member of row.archive.members) {
        assert(
          typeof member.name === 'string' &&
            member.name &&
            Number.isSafeInteger(member.bytes) &&
            member.bytes >= 0 &&
            typeof member.safe === 'boolean' &&
            typeof member.extension === 'string',
          'invalid archive member',
        );
        assert(
          !member.sha256 || shaPattern.test(member.sha256),
          'invalid member SHA',
        );
      }
    }
  }
  for (const key of ['dedup', 'titles']) {
    assert(
      input[key].length === seen.size &&
        new Set(input[key].map((row) => row.relative_path)).size === seen.size,
      'invalid ledger coverage',
    );
    for (const row of input[key]) {
      assert(seen.has(row.relative_path), 'invalid ledger path mismatch');
      assert(
        row.file_id === 'file-' + hash(row.relative_path),
        'invalid inventory id',
      );
    }
  }
  for (const row of input.titles) {
    assert(
      /^(drawing-)[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.record_candidate_id),
      'invalid record candidate id',
    );
    assert(
      ['high', 'medium', 'low'].includes(row.confidence),
      'invalid title confidence',
    );
    assert(
      typeof row.title_original === 'string' &&
        row.title_original &&
        typeof row.title_ja_candidate === 'string' &&
        row.title_ja_candidate,
      'invalid title',
    );
    assert(
      ['機体の設計図', 'エンジン・製作資料'].includes(row.category_candidate),
      'invalid category',
    );
  }
  for (const row of input.dedup) {
    assert(
      [
        'NEW_CONTENT',
        'EXACT_DUPLICATE',
        'PROBABLE_DUPLICATE',
        'EXISTING_PAGE_NEEDS_REFRESH',
        'REVIEW_REQUIRED',
      ].includes(row.dedup_status),
      'invalid duplicate status',
    );
    assert(
      Array.isArray(row.evidence) && Array.isArray(row.source_probable_peers),
      'invalid dedup evidence',
    );
    assert(
      row.publication_status === 'REVIEW_REQUIRED' &&
        row.publication_rights === 'UNKNOWN',
      'invalid Task 0 rights promotion',
    );
    for (const id of row.legacy_package_ids ?? [])
      assert(/^[1-9][0-9]*$/.test(String(id)), 'invalid legacy ID');
  }
}

function legacyDownload(file, recordId) {
  const name = basename(file.target_route);
  const extension = '.' + name.split('.').at(-1).toLowerCase();
  return {
    id: 'download-existing-' + file.sha256,
    label: name,
    source_path: null,
    filename_original: basename(file.legacy_routes[0]),
    filename_public_candidate: name,
    extension,
    mime_or_type: file.content_type,
    bytes: file.received_bytes,
    sha256: file.sha256,
    archive_type: archives.has(extension) ? extension.slice(1) : null,
    publication_right: 'REVIEW_REQUIRED',
    duplicate_status: 'EXISTING_PAGE_NEEDS_REFRESH',
    mapped_record_id: recordId,
    notes: [
      'Existing public asset; publication is not proof of redistribution rights.',
    ],
  };
}

function baseRecord(
  id,
  title,
  original,
  category,
  download,
  provenance,
  legacy,
) {
  return {
    id,
    slug: id.replace(/^drawing-/, ''),
    title_ja: title,
    title_original: original,
    category,
    summary_ja: null,
    publication_status: 'REVIEW_REQUIRED',
    publication_right: 'REVIEW_REQUIRED',
    duplicate_status: legacy.canonical_url
      ? 'EXISTING_PAGE_NEEDS_REFRESH'
      : download.duplicate_status,
    grouping_status: 'REVIEW_REQUIRED',
    downloads: [download],
    legacy,
    provenance,
  };
}

export function deriveExistingRecords(input) {
  const records = [];
  for (const file of sorted(
    input.staticDownloads.files.filter((file) =>
      file.target_route.startsWith('/downloads/drawings/'),
    ),
    'target_route',
  )) {
    assert(
      shaPattern.test(file.sha256) &&
        Number.isSafeInteger(file.received_bytes) &&
        file.received_bytes >= 0 &&
        Array.isArray(file.legacy_routes),
      'invalid registered download',
    );
    assert(
      safeRelativePath(file.target_route.slice(1)),
      'unsafe existing asset route',
    );
    const packages = input.legacy.pages.filter(
      (page) =>
        page.type === 'download_endpoint' &&
        file.legacy_routes.includes(page.download_target),
    );
    assert(
      packages.length > 0,
      'invalid existing download without package identity',
    );
    packages.sort((a, b) =>
      compare(String(a.download_id), String(b.download_id)),
    );
    const primary = packages[0];
    for (const page of packages) {
      assert(
        /^[1-9][0-9]*$/.test(String(page.download_id)),
        'invalid package ID',
      );
      urlKey(page.canonical);
      urlKey(page.target_route);
      assert(
        typeof page.title === 'string' && page.title,
        'invalid existing title',
      );
    }
    const packageIds = packages.map((page) => String(page.download_id));
    const knownCandidates = input.candidates.filter((candidate) =>
      candidate.legacy_package_ids?.some((id) => packageIds.includes(id)),
    );
    assert(
      knownCandidates.length <= 1,
      'existing identity collision in Task 0 candidates',
    );
    const id =
      knownCandidates[0]?.id ??
      (packageIds.includes('1712')
        ? 'drawing-fighter-ultralight'
        : 'drawing-legacy-' + packageIds[0]);
    const packageKeys = new Set(
      packages.flatMap((page) => [
        urlKey(page.canonical),
        urlKey(page.target_route),
      ]),
    );
    const articles = input.legacy.pages.filter(
      (page) =>
        page.type === 'drawing' &&
        [...(page.content_html ?? '').matchAll(/href="([^"]+)"/g)].some(
          (match) => {
            try {
              return packageKeys.has(urlKey(match[1]));
            } catch {
              return false;
            }
          },
        ),
    );
    const ids = unique([
      ...packageIds,
      ...articles.map((page) => String(page.id)),
    ]);
    const urls = unique(
      [...packages, ...articles].flatMap((page) => [
        page.canonical,
        'https://happinesea.com' + page.target_route,
      ]),
    );
    const legacy = {
      wordpress_id: String(primary.download_id),
      wordpress_ids: ids,
      legacy_urls: urls,
      existing_download_urls: unique([
        file.target_route,
        ...file.legacy_routes,
      ]),
      canonical_url: primary.canonical,
    };
    const download = legacyDownload(file, id);
    const record = baseRecord(
      id,
      primary.title,
      primary.title,
      '機体の設計図',
      download,
      {
        task0_inventory_id: 'existing-public-' + file.sha256,
        source_relative_path: null,
        source_sha256: file.sha256,
        source_size: file.received_bytes,
        title_confidence: 'high',
        dedup_confidence: 'exact',
        classification_notes: [
          'Derived from unchanged legacy metadata. Existing public page remains outside proposal publication states.',
        ],
      },
      legacy,
    );
    if (primary.hero)
      record.featured_image = {
        src: primary.hero.src,
        alt: primary.hero.alt ?? primary.title,
        status: 'REVIEW_REQUIRED',
      };
    records.push(record);
  }
  checkRecordCollisions(records);
  return records;
}

export function checkRecordCollisions(records) {
  const relations = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    for (const other of records.slice(0, index)) {
      if (
        record.id === other.id ||
        record.slug === other.slug ||
        record.legacy.wordpress_ids.some((id) =>
          other.legacy.wordpress_ids.includes(id),
        ) ||
        record.legacy.legacy_urls.some((url) =>
          other.legacy.legacy_urls.some((old) => urlKey(url) === urlKey(old)),
        )
      ) {
        const identity = (item) =>
          unique(item.downloads.map((download) => download.sha256)).join(',');
        assert(
          identity(record) === identity(other),
          'slug collision or legacy identity collision: REVIEW_REQUIRED',
        );
        relations.push({ id: record.id, duplicate_of: other.id });
      }
    }
  }
  return relations;
}

export function validateRecords(records) {
  assert(
    recordValidator(records),
    'invalid drawing record: ' + ajv.errorsText(recordValidator.errors),
  );
  for (const record of records) {
    assert(
      record.publication_status === 'REVIEW_REQUIRED' &&
        record.publication_right === 'REVIEW_REQUIRED' &&
        record.grouping_status === 'REVIEW_REQUIRED',
      'proposal status promotion requires separate rights/grouping review',
    );
    assert(
      record.downloads.every((d) => d.publication_right === 'REVIEW_REQUIRED'),
      'download rights promotion forbidden',
    );
    for (const download of record.downloads) {
      assert(
        download.source_path === null || safeRelativePath(download.source_path),
        'unsafe source path',
      );
      if (download.filename_public_candidate)
        downloadFilename(download.filename_public_candidate);
    }
  }
  return checkRecordCollisions(records);
}

export function proposeDrawingLibrary(input) {
  validateInput(input);
  const existing = deriveExistingRecords(input);
  const records = [...existing];
  const downloads = existing.flatMap((record) => record.downloads);
  const titles = new Map(input.titles.map((row) => [row.relative_path, row]));
  const ledgers = new Map(input.dedup.map((row) => [row.relative_path, row]));
  const groups = new Map();
  for (const title of input.titles)
    groups.set(title.record_candidate_id, [
      ...(groups.get(title.record_candidate_id) ?? []),
      title.relative_path,
    ]);
  const filenameGroups = new Map();
  for (const row of input.inventory)
    filenameGroups.set(normalizedName(row.original_filename), [
      ...(filenameGroups.get(normalizedName(row.original_filename)) ?? []),
      row.relative_path,
    ]);
  const filenameCollisions = [...filenameGroups.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([name, paths]) => ({ name, paths: unique(paths) }));
  const collidedPaths = new Set(
    filenameCollisions.flatMap((group) => group.paths),
  );
  const refresh = [];
  const titleReview = [];
  for (const row of sorted(input.inventory, 'relative_path')) {
    const title = titles.get(row.relative_path);
    const ledger = ledgers.get(row.relative_path);
    const id = 'download-' + ledger.file_id.slice(5);
    const relations = [];
    const matchedRecords = new Set();
    const memberMatches = [];
    for (const old of input.existingDownloads) {
      const oldRecord = existing.find((record) =>
        record.downloads.some((d) => d.sha256 === old.sha256),
      );
      assert(
        oldRecord &&
          input.staticDownloads.files.some(
            (file) =>
              file.target_route === old.target_route &&
              file.sha256 === old.sha256 &&
              file.received_bytes === old.bytes,
          ),
        'invalid existing receipt mismatch',
      );
      if (row.sha256 === old.sha256) {
        relations.push({
          kind: 'EXISTING_BINARY',
          id: oldRecord.downloads[0].id,
          url: old.target_route,
        });
        matchedRecords.add(oldRecord.id);
      }
      for (const member of old.archive?.members ?? [])
        if (member.sha256 === row.sha256) {
          relations.push({
            kind: 'EXISTING_ARCHIVE_MEMBER',
            id: oldRecord.downloads[0].id,
            url: old.target_route,
            member: member.name,
          });
          matchedRecords.add(oldRecord.id);
        }
      for (const member of row.archive?.members ?? [])
        if (member.sha256 === old.sha256) {
          memberMatches.push({
            kind: 'CONTAINS_EXISTING_BINARY',
            id: oldRecord.downloads[0].id,
            url: old.target_route,
            member: member.name,
          });
          matchedRecords.add(oldRecord.id);
        }
    }
    for (const image of input.existingImages)
      if (image.sha256 === row.sha256)
        relations.push({
          kind: 'EXISTING_IMAGE',
          id: image.sha256,
          url: image.target_route,
        });
    for (const peer of input.inventory) {
      if (
        peer.relative_path !== row.relative_path &&
        peer.sha256 === row.sha256
      )
        relations.push({
          kind: 'SOURCE_BINARY',
          id: 'download-' + hash(peer.relative_path),
        });
      for (const member of peer.archive?.members ?? [])
        if (member.sha256 === row.sha256)
          relations.push({
            kind: 'SOURCE_ARCHIVE_MEMBER',
            id: 'download-' + hash(peer.relative_path),
            member: member.name,
          });
    }
    const referenceIds = unique(
      [
        ...(ledger.legacy_package_ids ?? []),
        ...ledger.evidence.flatMap((e) => e.package_ids ?? []),
      ].map(String),
    );
    const referenceUrls = ledger.evidence.flatMap((e) =>
      [e.legacy_url, e.existing_route].filter(Boolean),
    );
    for (const record of existing)
      if (
        record.id === title.record_candidate_id ||
        referenceIds.some((legacyId) =>
          record.legacy.wordpress_ids.includes(legacyId),
        ) ||
        referenceUrls.some((url) =>
          [
            ...record.legacy.legacy_urls,
            ...record.legacy.existing_download_urls,
          ].some((old) => urlKey(url) === urlKey(old)),
        )
      )
        matchedRecords.add(record.id);
    const split =
      /\.part\d+\.rar$/i.test(row.original_filename) ||
      row.archive?.status === 'MULTIVOLUME_REVIEW';
    const nested =
      row.archive?.members.some((member) => archives.has(member.extension)) ??
      false;
    const unsafe =
      row.archive?.members.some(
        (member) =>
          !member.safe ||
          !safeRelativePath(member.name, true) ||
          member.encrypted,
      ) ?? false;
    const archiveReview =
      row.is_archive &&
      (row.archive.status !== 'LISTED' || split || nested || unsafe);
    const probable =
      ledger.dedup_status === 'PROBABLE_DUPLICATE' ||
      ledger.source_probable_peers.length > 0;
    const exact = relations.length > 0;
    assert(
      ledger.dedup_status !== 'EXACT_DUPLICATE' || exact,
      'unproven exact duplicate claim',
    );
    let status = exact
      ? 'EXACT_DUPLICATE'
      : probable
        ? 'PROBABLE_DUPLICATE'
        : matchedRecords.size
          ? 'EXISTING_PAGE_NEEDS_REFRESH'
          : archiveReview
            ? 'REVIEW_REQUIRED'
            : 'UNIQUE';
    if (memberMatches.length && status === 'UNIQUE') status = 'REVIEW_REQUIRED';
    const multi = groups.get(title.record_candidate_id).length > 1;
    const hold =
      exact ||
      probable ||
      matchedRecords.size > 0 ||
      memberMatches.length > 0 ||
      archiveReview ||
      multi ||
      collidedPaths.has(row.relative_path);
    const download = {
      id,
      label: title.title_ja_candidate,
      source_path: row.relative_path,
      filename_original: row.original_filename,
      filename_public_candidate: hold
        ? null
        : 'drawing-' + row.sha256 + row.extension,
      extension: row.extension,
      mime_or_type: row.type,
      bytes: row.bytes,
      sha256: row.sha256,
      archive_type: row.is_archive ? row.extension.slice(1) : null,
      ...(row.is_archive ? { archive_members: row.archive.members } : {}),
      publication_right: 'REVIEW_REQUIRED',
      duplicate_status: status,
      duplicate_of: [...relations, ...memberMatches],
      mapped_record_id: null,
      notes: [
        title.notes ?? '',
        ...(archiveReview
          ? ['Archive requires review; no extraction or grouping performed.']
          : []),
        ...(multi
          ? ['Task 0 filename/model group is a review candidate only.']
          : []),
      ].filter(Boolean),
    };
    if (!hold) {
      download.mapped_record_id = title.record_candidate_id;
      records.push(
        baseRecord(
          title.record_candidate_id,
          title.title_ja_candidate,
          title.title_original,
          title.category_candidate,
          download,
          {
            task0_inventory_id: ledger.file_id,
            source_relative_path: row.relative_path,
            source_sha256: row.sha256,
            source_size: row.bytes,
            title_confidence: title.confidence,
            dedup_confidence: 'unverified',
            classification_notes: [
              title.notes ?? '',
              'Single inventory package proposal; logical design grouping remains unconfirmed.',
            ],
          },
          {
            wordpress_ids: [],
            legacy_urls: [],
            existing_download_urls: [],
            canonical_url: null,
          },
        ),
      );
    } else if (matchedRecords.size) {
      refresh.push({
        download_id: id,
        source_path: row.relative_path,
        existing_record_ids: unique([...matchedRecords]),
        action: 'REFRESH_PROPOSAL_ONLY',
        owner_decision_required: true,
        duplicate_status: status,
      });
    }
    downloads.push(download);
    if (title.confidence !== 'high')
      titleReview.push({
        download_id: id,
        source_path: row.relative_path,
        title_original: title.title_original,
        title_ja_candidate: title.title_ja_candidate,
        confidence: title.confidence,
        notes: title.notes,
      });
  }
  validateRecords(records);
  assert(
    downloadValidator(downloads),
    'invalid download metadata: ' + ajv.errorsText(downloadValidator.errors),
  );
  const grouping = [...groups.entries()]
    .sort(([a], [b]) => compare(a, b))
    .map(([candidateId, paths]) => ({
      task0_candidate_group: candidateId,
      source_paths: unique(paths),
      grouping_status: 'REVIEW_REQUIRED',
      grouping_review_required: true,
      owner_decision_required: true,
      suggested_relation: paths.some((path) => /\.part\d+\.rar$/i.test(path))
        ? 'SAME_PACKAGE_SPLIT'
        : paths.length > 1
          ? 'UNKNOWN_RELATION'
          : 'UNKNOWN_RELATION',
      notes:
        'Candidate only. Same model name, CRC overlap, nested/split containers do not authorize automatic grouping.',
    }));
  const sourceDownloads = downloads.filter((d) => d.source_path !== null);
  const statusCounts = Object.fromEntries(
    unique(sourceDownloads.map((d) => d.duplicate_status)).map((status) => [
      status,
      sourceDownloads.filter((d) => d.duplicate_status === status).length,
    ]),
  );
  return {
    records: sorted(records, 'id'),
    downloads: sorted(downloads, 'id'),
    duplicate_report: {
      source_status_counts: statusCounts,
      filename_collisions: filenameCollisions,
      relations: sourceDownloads
        .filter((d) => d.duplicate_of.length)
        .map((d) => ({
          download_id: d.id,
          duplicate_status: d.duplicate_status,
          duplicate_of: d.duplicate_of,
        })),
    },
    grouping_review_queue: grouping,
    title_review_queue: sorted(titleReview, 'source_path'),
    publication_right_review_queue: sorted(
      downloads.map((d) => ({
        download_id: d.id,
        source_path: d.source_path,
        publication_right: 'REVIEW_REQUIRED',
        author: null,
        license: null,
        approval_evidence: null,
      })),
      'download_id',
    ),
    existing_refresh_proposals: sorted(refresh, 'source_path'),
    summary: {
      mode: 'DRY_RUN',
      records: records.length,
      existing_records: existing.length,
      new_record_proposals: records.length - existing.length,
      downloads: downloads.length,
      source_downloads: input.inventory.length,
      source_duplicate_status_counts: statusCounts,
      grouping_unresolved: grouping.length,
      title_review: titleReview.length,
      publication_right_counts: { REVIEW_REQUIRED: downloads.length },
      binary_copies: 0,
      public_outputs: 0,
    },
  };
}

export async function loadInputs(repoRoot) {
  const repo =
    repoRoot instanceof URL ? fileURLToPath(repoRoot) : resolve(repoRoot);
  const read = async (path) =>
    JSON.parse(await readFile(join(repo, path), 'utf8'));
  const input = {
    inventory: await read('docs/drawing-library-task0/inventory.json'),
    dedup: await read('docs/drawing-library-task0/duplicate-ledger.json'),
    titles: await read(
      'docs/drawing-library-task0/title-candidate-ledger.json',
    ),
    candidates: await read('docs/drawing-library-task0/record-candidates.json'),
    existingDownloads: await read(
      'docs/drawing-library-task0/existing-downloads.json',
    ),
    existingImages: await read(
      'docs/drawing-library-task0/existing-drawing-images.json',
    ),
    legacy: await read('src/data/legacy-compatibility.json'),
    staticDownloads: await read('src/data/static-downloads.json'),
  };
  const provenance = await read('docs/drawing-library-task0/provenance.json');
  assert(
    hash(
      await readFile(join(repo, 'docs/drawing-library-task0/inventory.json')),
    ) === provenance.source_inventory_sha256,
    'Task 0 inventory provenance SHA mismatch',
  );
  return input;
}

async function fileSha(path) {
  const sha = createHash('sha256');
  for await (const chunk of createReadStream(path)) sha.update(chunk);
  return sha.digest('hex');
}

async function treeFiles(root, directory = root) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    assert(!entry.isSymbolicLink(), 'source symlink/reparse point forbidden');
    if (entry.isDirectory()) files.push(...(await treeFiles(root, path)));
    else if (entry.isFile())
      files.push(relative(root, path).split(sep).join('/'));
    else throw new Error('unsupported source file');
  }
  return files.sort(compare);
}

export async function verifySource(sourceRoot, inventory) {
  const source = await realpath(sourceRoot);
  const paths = inventory.map((row) => row.relative_path).sort(compare);
  assert(
    serialize(await treeFiles(source)) === serialize(paths),
    'source inventory files changed/missing',
  );
  for (const row of inventory) {
    assert(safeRelativePath(row.relative_path), 'unsafe source path');
    const path = join(source, row.relative_path);
    assert(
      isBelow(source, await realpath(path)) &&
        !(await lstat(path)).isSymbolicLink(),
      'source path escaped root',
    );
    const before = await stat(path, { bigint: true });
    assert(
      Number(before.size) === row.bytes,
      'source size changed: ' + row.relative_path,
    );
    assert(
      (await fileSha(path)) === row.sha256,
      'source SHA changed: ' + row.relative_path,
    );
    const after = await stat(path, { bigint: true });
    assert(
      before.size === after.size &&
        before.mtimeNs === after.mtimeNs &&
        before.ino === after.ino,
      'source changed during replay',
    );
  }
  assert(
    serialize(await treeFiles(source)) === serialize(paths),
    'source inventory changed during replay',
  );
}

export async function verifyExistingAssets(repoRoot, input) {
  for (const file of input.staticDownloads.files.filter((file) =>
    file.target_route.startsWith('/downloads/drawings/'),
  )) {
    const path = join(repoRoot, 'public', file.target_route.slice(1));
    assert(
      (await fileSha(path)) === file.sha256 &&
        (await stat(path)).size === file.received_bytes,
      'existing binary changed: ' + file.target_route,
    );
  }
  for (const image of input.existingImages) {
    assert(
      safeRelativePath(image.target_route.slice(1)),
      'unsafe existing image route',
    );
    assert(
      (await fileSha(join(repoRoot, 'public', image.target_route.slice(1)))) ===
        image.sha256,
      'existing image changed',
    );
  }
}

export async function writeProposals({
  repoRoot,
  sourceRoot,
  outputRoot,
  result,
}) {
  const repo = resolve(repoRoot),
    source = await realpath(sourceRoot),
    output = resolve(outputRoot);
  assert(
    output === join(repo, 'src/data/drawing-library') ||
      isBelow(join(repo, '.superpowers/drawing-library-phase1'), output),
    'output must be a drawing review directory',
  );
  assert(
    !isBelow(source, output) && !isBelow(output, source) && source !== output,
    'output overlaps source',
  );
  let parent = output;
  while (true) {
    try {
      const actual = await realpath(parent);
      assert(actual === parent, 'output symlink/reparse path forbidden');
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      parent = dirname(parent);
    }
  }
  const files = {
    'records.proposed.json': result.records,
    'downloads.proposed.json': result.downloads,
    'duplicate-report.json': result.duplicate_report,
    'grouping-review-queue.json': result.grouping_review_queue,
    'title-review-queue.json': result.title_review_queue,
    'publication-right-review-queue.json':
      result.publication_right_review_queue,
    'existing-refresh-proposals.json': result.existing_refresh_proposals,
    'summary.json': result.summary,
  };
  validateRecords(result.records);
  assert(downloadValidator(result.downloads), 'invalid proposed downloads');
  for (const download of result.downloads) {
    assert(
      download.publication_right === 'REVIEW_REQUIRED',
      'download rights promotion forbidden',
    );
    assert(
      download.source_path === null || safeRelativePath(download.source_path),
      'unsafe proposed source path',
    );
    if (download.filename_public_candidate)
      downloadFilename(download.filename_public_candidate);
  }
  // Validate every destination before the first write; existing symlink leaves are forbidden too.
  for (const name of Object.keys(files)) {
    try {
      assert(
        !(await lstat(join(output, name))).isSymbolicLink(),
        'output file symlink forbidden',
      );
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  await mkdir(output, { recursive: true });
  for (const [name, value] of Object.entries(files)) {
    // Replace the directory entry; never truncate a hardlinked source/public file.
    const temporary = join(output, '.drawing-' + randomUUID() + '.tmp');
    try {
      await writeFile(temporary, serialize(value), {
        encoding: 'utf8',
        flag: 'wx',
      });
      await rename(temporary, join(output, name));
    } finally {
      await unlink(temporary).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  }
}
