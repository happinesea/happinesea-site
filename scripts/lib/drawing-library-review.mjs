import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicDrawings } from '../../src/lib/drawing-library-index.mjs';
import { validateRecords } from './drawing-library.mjs';
import {
  ownerCatalog as catalog,
  reanalysis,
  ownerExclusions,
} from '../../src/lib/drawing-publication.mjs';

export { publicDrawings };
const escape = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
const categories = ['機体の設計図', 'エンジン・製作資料'];
const size = (bytes) =>
  `${(bytes / 1048576).toFixed(2)} MiB (${bytes.toLocaleString('ja-JP')} bytes)`;

export function buildReviewModel(data) {
  validateRecords(data.records);
  const inventory = new Map(
    data.inventory.map((row) => [row.relative_path, row]),
  );
  for (const file of data.downloads) {
    const source = inventory.get(file.source_path);
    if (
      file.source_path !== null &&
      (!source ||
        source.sha256 !== file.sha256 ||
        source.bytes !== file.bytes ||
        source.original_filename !== file.filename_original)
    )
      throw new Error('review source mapping drift');
    if (
      file.publication_right !== 'REVIEW_REQUIRED' ||
      !/^download-(?:existing-)?[a-f0-9]{64}$/.test(file.id)
    )
      throw new Error('invalid review download state/id');
  }
  for (const record of data.records)
    if (
      record.legacy.canonical_url &&
      new URL(record.legacy.canonical_url).origin !== 'https://happinesea.com'
    )
      throw new Error('invalid related public URL');
  const titles = new Map(data.titles.map((t) => [t.relative_path, t]));
  const ledgers = new Map(data.dedup.map((d) => [d.relative_path, d]));
  const refresh = new Map(
    data.refresh.map((r) => [r.download_id, r.existing_record_ids]),
  );
  const records = new Map(data.records.map((r) => [r.id, r]));
  const downloads = new Map(data.downloads.map((d) => [d.id, d]));
  const files = data.downloads.map((download) => {
    const title = titles.get(download.source_path);
    const related =
      refresh.get(download.id) ??
      (download.mapped_record_id ? [download.mapped_record_id] : []);
    const existingRecords = related
      .map((id) => records.get(id))
      .filter((r) => r?.legacy.canonical_url);
    const record = records.get(download.mapped_record_id);
    const origin =
      download.source_path === null || existingRecords.length
        ? 'existing'
        : 'new';
    return {
      ...download,
      title: title?.title_ja_candidate ?? record?.title_ja ?? download.label,
      originalTitle:
        title?.title_original ??
        record?.title_original ??
        download.filename_original,
      category: title?.category_candidate ?? record?.category ?? '機体の設計図',
      confidence: title?.confidence ?? 'high',
      titleNotes: title?.notes ?? '既存公開ページのタイトル。',
      origin,
      existingRecords,
      grouping_status: record?.grouping_status ?? 'REVIEW_REQUIRED',
      titleReview: title ? title.confidence !== 'high' : false,
      ledger: ledgers.get(download.source_path),
    };
  });
  const fileById = new Map(files.map((f) => [f.id, f]));
  const fileByPath = new Map(
    files.filter((f) => f.source_path).map((f) => [f.source_path, f]),
  );
  const targetMatch = (relation) => {
    const target = downloads.get(relation.id);
    const members =
      target?.archive_members ??
      data.existingDownloads.find((d) => d.sha256 === target?.sha256)?.archive
        ?.members ??
      [];
    const member = members.find((m) => m.name === relation.member);
    return {
      kind: relation.kind,
      targetFilename: target?.filename_original ?? relation.id,
      targetPath: target?.source_path ?? relation.url ?? '既存asset',
      memberPath: relation.member ?? null,
      targetBytes: member?.bytes ?? target?.bytes ?? null,
      targetSHA256:
        member?.sha256 ?? (relation.member ? null : target?.sha256) ?? null,
    };
  };
  const exact = files
    .filter((f) => f.source_path && f.duplicate_status === 'EXACT_DUPLICATE')
    .map((source) => ({
      source,
      matches: source.duplicate_of.map(targetMatch),
      action: 'SKIP_NEW_BINARY',
      actions: [
        'SKIP_NEW_BINARY',
        'KEEP_EXISTING',
        ...(source.existingRecords.length
          ? ['LINK_TO_EXISTING_RECORD']
          : ['REVIEW_REQUIRED']),
      ],
    }));
  const probable = files
    .filter((f) => f.source_path && f.duplicate_status === 'PROBABLE_DUPLICATE')
    .map((source) => {
      const matches = (source.ledger?.evidence ?? []).map((e) => {
        const target = files.find(
          (f) =>
            f.existingRecords.some((r) =>
              r.legacy.existing_download_urls.includes(e.existing_route),
            ) && f.source_path === null,
        );
        return {
          kind: e.kind,
          targetFilename:
            target?.filename_original ?? e.existing_route ?? '既存候補',
          targetPath: e.existing_route ?? '',
          targetBytes: target?.bytes ?? null,
          targetSHA256: target?.sha256 ?? null,
          memberPath: null,
        };
      });
      for (const peer of source.ledger?.source_probable_peers ?? []) {
        const target = fileByPath.get(peer.path);
        matches.push({
          kind: peer.reasons.join(' / '),
          targetFilename: target.filename_original,
          targetPath: target.source_path,
          targetBytes: target.bytes,
          targetSHA256: target.sha256,
          memberPath: null,
        });
      }
      return {
        source,
        matches,
        action: 'REVIEW_REQUIRED',
        actions: ['REVIEW_REQUIRED'],
      };
    });
  const groups = data.groups.map((g) => ({
    ...g,
    files: g.source_paths.map((p) => fileByPath.get(p)),
    title:
      titles.get(g.source_paths[0])?.title_ja_candidate ??
      g.task0_candidate_group,
  }));
  const model = {
    files,
    exact,
    probable,
    groups,
    titles: data.titleQueue.map((t) => ({
      ...t,
      file: fileById.get(t.download_id),
    })),
    rights: data.rights,
    categories: categories.map((category) => ({
      category,
      records: data.records.filter((r) => r.category === category).length,
      files: files.filter((f) => f.category === category).length,
      reviewRequired: files.filter(
        (f) =>
          f.category === category && f.publication_right === 'REVIEW_REQUIRED',
      ).length,
    })),
    summary: data.summary,
  };
  if (
    exact.length !== 20 ||
    probable.length !== 9 ||
    groups.length !== 42 ||
    model.titles.length !== 26 ||
    files.length !== 77
  )
    throw new Error('Phase 1 review counts changed; inspect before review');
  model.publication = catalog;
  for (const file of model.files) {
    const record = catalog.records.find(
      (r) =>
        r.source_paths.includes(file.source_path) ||
        r.downloads.includes(file.id),
    );
    file.category = record?.category ?? file.category;
    file.title = record?.title_ja ?? file.title;
    file.tags = record?.tags ?? [];
    file.tagConfidence = record?.tag_confidence ?? [];
    file.resolution =
      catalog.dedup_decisions.find((d) => d.download_id === file.id)
        ?.decision ?? file.duplicate_status;
    file.resolvedGrouping = record?.grouping_status ?? file.grouping_status;
    if (ownerExclusions.some((e) => e.source_sha256 === file.sha256)) {
      file.resolvedGrouping = 'EXCLUDED_BY_OWNER';
      file.titleNotes =
        'Ownerが設計図として不備と判断し除外。元資料は一旦退避に保持。';
    }
    file.rarUpdate = reanalysis.updates.find((u) => u.record_id === record?.id);
    file.derived = reanalysis.distributions.find(
      (d) => d.download_id === file.id,
    );
  }
  model.currentCategories = categories.map((category) => ({
    category,
    records: catalog.records.filter((r) => r.category === category).length,
    files: model.files.filter((f) => f.category === category).length,
    reviewRequired: model.files.filter((f) => f.category === category).length,
  }));
  return model;
}

export async function loadReviewModel(repoRoot) {
  const repo = repoRoot instanceof URL ? fileURLToPath(repoRoot) : repoRoot;
  const read = async (path) =>
    JSON.parse(await readFile(join(repo, path), 'utf8'));
  return buildReviewModel({
    records: await read('src/data/drawing-library/records.proposed.json'),
    downloads: await read('src/data/drawing-library/downloads.proposed.json'),
    groups: await read('src/data/drawing-library/grouping-review-queue.json'),
    titleQueue: await read('src/data/drawing-library/title-review-queue.json'),
    rights: await read(
      'src/data/drawing-library/publication-right-review-queue.json',
    ),
    refresh: await read(
      'src/data/drawing-library/existing-refresh-proposals.json',
    ),
    summary: await read('src/data/drawing-library/summary.json'),
    titles: await read(
      'docs/drawing-library-task0/title-candidate-ledger.json',
    ),
    dedup: await read('docs/drawing-library-task0/duplicate-ledger.json'),
    inventory: await read('docs/drawing-library-task0/inventory.json'),
    existingDownloads: await read(
      'docs/drawing-library-task0/existing-downloads.json',
    ),
  });
}

export const allowedReviewHost = (host, port) => host === `127.0.0.1:${port}`;

const relatedLinks = (file) =>
  file.existingRecords
    .map(
      (record) =>
        `<a href="${escape(record.legacy.canonical_url)}" target="_blank" rel="noreferrer">${escape(record.title_ja)}</a>`,
    )
    .join('');
const metadata = (pairs) =>
  `<dl>${pairs.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>`;
const preview = (file) =>
  `<img class="preview" loading="lazy" width="640" height="400" src="/preview/${escape(file.id)}" alt="${escape(file.title)}の資料プレビュー"/><p class="preview-note" data-preview-note="${escape(file.id)}">先頭の安全な図面・画像のみ。読めない資料は未確認表示。</p>`;
const fileAttrs = (file) =>
  `data-rar-converted="${Boolean(file.derived)}" data-image-recovered="${Boolean(file.rarUpdate?.image_recovered)}" data-image-missing="${reanalysis.missing_images.some((r) => r.id === file.rarUpdate?.record_id)}" data-title-resolved="${Boolean(file.rarUpdate?.title_resolved)}" data-grouping-resolved="${Boolean(file.rarUpdate?.grouping_resolved)}" data-probable-resolved="${file.duplicate_status === 'PROBABLE_DUPLICATE' && file.resolution !== 'REVIEW_REQUIRED'}" data-grouping-review="${file.resolvedGrouping === 'REVIEW_REQUIRED'}" data-tags="${escape((file.tags ?? []).join('|'))}" data-category="${escape(file.category)}" data-origin="${file.origin}" data-duplicate="${file.duplicate_status}" data-title-review="${file.titleReview}"`;
const fileCard = (
  file,
) => `<article class="card" data-file-card="${file.id}" ${fileAttrs(file)}>
  ${preview(file)}<div class="card-body"><p class="eyebrow">${escape(file.category)} · ${file.origin === 'existing' ? '既存・既存関連' : '新規候補'}</p>
  <h3>${escape(file.title)}</h3><p class="original">${escape(file.originalTitle)}</p>
  <span class="badge confidence-${file.confidence}">${file.confidence} confidence</span>
  ${metadata([
    ['filename', file.filename_original],
    ['source path', file.source_path ?? '既存public asset'],
    ['size', size(file.bytes)],
    ['duplicate', file.duplicate_status],
    ['grouping', file.grouping_status],
    ['publication right', file.publication_right],
    [
      'tags / confidence',
      (file.tagConfidence ?? [])
        .map((t) => `${t.tag} (${t.confidence}; ${t.evidence})`)
        .join(' / '),
    ],
    ['current resolution', file.resolution ?? file.duplicate_status],
    ['current grouping', file.resolvedGrouping ?? file.grouping_status],
  ])}
  <details><summary>SHA-256</summary><code>${file.sha256}</code></details><div class="links">${relatedLinks(file)}
  ${file.source_path ? `<a href="/source/${file.id}">元資料を開く（local）</a>` : ''}</div></div></article>`;

function duplicateCard(row, exact) {
  return `<article class="case" data-${exact ? 'exact' : 'probable'}-case="${row.source.id}" ${fileAttrs(row.source)}>
    <div class="case-head"><div><p class="eyebrow">${exact ? 'EXACT_DUPLICATE' : 'PROBABLE_DUPLICATE · 自動排除しない'}</p><h3>${escape(row.source.filename_original)}</h3></div><span class="badge">${row.action}</span></div>
    ${metadata([
      ['source file', row.source.source_path],
      ['source size', size(row.source.bytes)],
      ['source SHA-256', row.source.sha256],
    ])}
    <div class="matches">${row.matches
      .map(
        (match) =>
          `<div class="match">${metadata([
            ['match type', match.kind],
            ['target filename', match.targetFilename],
            ['target path', match.targetPath],
            ['archive member', match.memberPath ?? '—'],
            [
              'target size',
              match.targetBytes === null ? '未記録' : size(match.targetBytes),
            ],
            [
              'target SHA-256',
              match.targetSHA256 ?? '未記録（CRCとSHAを混同しない）',
            ],
          ])}</div>`,
      )
      .join('')}</div>
    <p class="actions">提案: ${row.actions.map(escape).join(' / ')}</p><div class="links">${relatedLinks(row.source)}<a href="/source/${row.source.id}">元資料を開く（local）</a></div>
  </article>`;
}

export function renderReview(model) {
  const panel = (id, heading, body) =>
    `<section data-panel="${id}" ${id !== 'files' ? 'hidden' : ''}><h2>${heading}</h2><p class="result" aria-live="polite" data-panel-count></p>${body}</section>`;
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="robots" content="noindex,nofollow"/><title>設計図 Owner Review（local only）</title><link rel="icon" href="data:,"/><link rel="stylesheet" href="/review.css"/><script src="/review.js" defer></script></head><body>
    <header><div class="shell"><p class="eyebrow">LOCAL ONLY · OWNER VISUAL REVIEW</p><h1>設計図の公開前レビュー</h1><p>候補の分類・重複・名称を確認する画面です。選択や表示操作で承認・公開状態は変わりません。</p>
    <div class="stats">${[
      ['Phase1 record', model.summary.records],
      ['現在record', catalog.records.length],
      ['download', 77],
      ['exact', 20],
      ['probable', 9],
      ['grouping', 42],
      ['title', 26],
    ]
      .map(
        ([label, count]) =>
          `<div><strong>${count}</strong><span>${label}</span></div>`,
      )
      .join('')}</div></div></header>
    <main class="shell"><section class="category-summary" aria-label="カテゴリ集計"><h2>カテゴリ別の確認状況</h2><div class="summary-grid">${(model.currentCategories ?? model.categories).map((c) => `<div class="summary-card"><h3>${escape(c.category)}</h3><p>${c.records} records · ${c.files} files · 権利確認待ち ${c.reviewRequired}</p></div>`).join('')}</div><p>recordは39公開準備（owner除外4件）（Phase1原提案33を含む）、fileはsource71＋既存6です。公開権は全件確認待ちです。最新grouping結果は下の公開準備recordと各fileのcurrent groupingを確認してください。</p></section>
    <nav class="tabs" aria-label="レビュー種別">${[
      ['files', '全ファイル 77'],
      ['records', `公開準備 records ${catalog.records.length}`],
      ['rar', 'RAR再解析 44'],
      ['exact', 'Exact 20'],
      ['probable', 'Probable 9'],
      ['groups', 'Grouping 42'],
      ['titles', 'Title 26'],
      ['rights', '公開権 77'],
    ]
      .map(
        ([id, label]) =>
          `<button type="button" data-view="${id}" aria-pressed="${id === 'files'}">${label}</button>`,
      )
      .join('')}</nav>
    <div class="filters"><label>タグ<select data-filter="tag"><option value="all">すべて</option>${catalog.tags.map((t) => `<option>${escape(t.tag)}</option>`).join('')}</select></label><label>カテゴリ<select data-filter="category"><option value="all">すべて</option>${categories.map((c) => `<option>${escape(c)}</option>`).join('')}</select></label>
      <label>既存・新規<select data-filter="origin"><option value="all">すべて</option><option value="existing">既存・既存関連</option><option value="new">新規候補</option></select></label>
      <label>確認対象<select data-filter="status"><option value="all">すべて</option><option value="rarConverted">RAR converted</option><option value="imageRecovered">image recovered</option><option value="imageMissing">image still missing</option><option value="titleResolved">title resolved</option><option value="groupingResolved">grouping resolved</option><option value="probableResolved">probable resolved</option><option value="EXACT_DUPLICATE">exact duplicate</option><option value="PROBABLE_DUPLICATE">probable duplicate</option><option value="grouping">grouping review required</option><option value="title">title review required</option><option value="rights">publication right review</option></select></label>
      <button type="button" data-reset>全条件を解除</button></div>
    ${panel(
      'records',
      `公開準備：${catalog.records.length} records（既存6＋新規${catalog.records.length - 6}）・owner除外4件`,
      catalog.records
        .map((record) => {
          const file = model.files.find((f) => f.id === record.downloads[0]);
          return `<article class="case" data-record-case="${escape(record.id)}" ${fileAttrs({ ...file, tags: record.tags })}><h3>${escape(record.title_ja)}</h3><p>${escape(record.title_original)}</p>${file ? preview(file) : ''}${metadata(
            [
              ['category', record.category],
              [
                'tags',
                record.tag_confidence
                  .map((t) => `${t.tag} (${t.confidence}; ${t.evidence})`)
                  .join(' / '),
              ],
              ['downloads', record.downloads.length],
              ['derived ZIP', file?.derived?.target_url ?? '—'],
              [
                'ZIP bytes / SHA',
                `${file?.derived?.bytes ?? '—'} / ${file?.derived?.sha256 ?? '—'}`,
              ],
              ['grouping', record.grouping_status],
              [
                'model identity',
                record.model_identity_status ?? 'Source label retained',
              ],
              ['rights', record.publication_right],
              ['source', record.source_paths.join(' / ')],
              ['publication status', record.publication_status],
              [
                'previous title / title source',
                `${file?.rarUpdate?.previous_title ?? '—'} / ${file?.rarUpdate?.title_source ?? '—'}`,
              ],
              [
                'previous grouping / new grouping',
                `${file?.rarUpdate?.previous_grouping ?? '—'} / ${record.grouping_status}`,
              ],
              [
                'thumbnail source',
                file?.rarUpdate?.preview?.member ??
                  record.featured_image_status,
              ],
            ],
          )}<a href="http://127.0.0.1:4410/happinesea-site${escape(record.route.replace(/\/$/, '') + '/')}" target="_blank" rel="noreferrer">公開準備detail（local）</a></article>`;
        })
        .join(''),
    )}
    ${panel(
      'rar',
      'RAR再解析・derived ZIP（local only）',
      reanalysis.archives
        .map((archive) => {
          const file = model.files.find((f) => f.sha256 === archive.sha256);
          const members = (row) =>
            row.members
              ?.filter((m) => !m.directory)
              .map(
                (m) =>
                  `${m.name} · ${m.extension} · ${m.bytes} bytes · ${m.sha256}`,
              )
              .join('\n') ?? '';
          return `<article class="case" ${fileAttrs(file)}><h3>${escape(archive.filename)}</h3>${preview(file)}${metadata(
            [
              ['source RAR', archive.source_rar_path],
              ['source SHA-256', archive.sha256],
              ['status', archive.status],
              [
                'derived ZIP',
                archive.derived_zip_path ??
                  'split continuation: first-volume ZIP contains all members',
              ],
              [
                'ZIP bytes / SHA-256',
                `${archive.derived_zip_bytes ?? '—'} / ${archive.derived_zip_sha256 ?? '—'}`,
              ],
              [
                'current distribution',
                file.derived
                  ? 'ZIP配布候補'
                  : '再利用・重複除外・split evidenceのみ',
              ],
              [
                'previous / new',
                `${file.rarUpdate?.previous_grouping ?? '—'} / ${file.resolvedGrouping}`,
              ],
            ],
          )}<details><summary>archive members・PDF title・nested inventory</summary><pre>${escape(members(archive))}</pre>${(archive.nested ?? []).map((n) => `<p>${escape(n.member)} · ${escape(n.status)}</p><pre>${escape(members(n))}</pre>`).join('')}<p>${escape(
            (archive.members ?? [])
              .filter((m) => m.document_title)
              .map(
                (m) => `${m.name}: ${m.document_title}; pages=${m.page_count}`,
              )
              .join(' / '),
          )}</p></details>${file.derived ? `<a href="/derived/${file.id}">derived ZIPを確認（local）</a>` : ''}</article>`;
        })
        .join(''),
    )}
    ${panel('files', '全ファイル', `<div class="cards">${model.files.map(fileCard).join('')}</div>`)}
    ${panel('exact', 'Exact duplicate：20件の対応関係', '<p>file全体とarchive memberの一致を区別します。20件はsource間のSHA group数ではなく、照合するsource fileの件数です。</p>' + model.exact.map((r) => duplicateCard(r, true)).join(''))}
    ${panel('probable', 'Probable duplicate：9件を個別に確認', '<p>CRC・容量・filename・部分一致は候補です。自動mergeや除外は行いません。</p>' + model.probable.map((r) => duplicateCard(r, false)).join(''))}
    ${panel(
      'groups',
      `Grouping：42候補・${42 - catalog.records.filter((r) => r.grouping_status === 'REVIEW_REQUIRED').length}整理済み／${catalog.records.filter((r) => r.grouping_status === 'REVIEW_REQUIRED').length}確認待ち`,
      model.groups
        .map(
          (g) =>
            `<article class="case" data-group-case="${escape(g.task0_candidate_group)}" ${fileAttrs({ ...g.files[0], duplicate_status: [...new Set(g.files.map((f) => f.duplicate_status))].join('|'), titleReview: g.files.some((f) => f.titleReview) })}><p class="eyebrow">${escape(g.files[0].resolvedGrouping)}</p><h3>${escape(g.title)}</h3><p>現在の候補: ${escape(g.suggested_relation)}</p><p class="small">検討候補: SAME_AIRCRAFT_DIFFERENT_VERSION / SAME_AIRCRAFT_DIFFERENT_DESIGN / SAME_PACKAGE_SPLIT / UNKNOWN_RELATION</p><div class="group-files">${g.files
              .map(
                (f) =>
                  `<div>${preview(f)}<h4>${escape(f.originalTitle)}</h4>${metadata(
                    [
                      ['file', f.source_path],
                      ['size / type', size(f.bytes) + ' / ' + f.extension],
                      ['confidence', f.confidence],
                      ['relation', f.duplicate_status],
                    ],
                  )}<div class="links">${relatedLinks(f)}</div></div>`,
              )
              .join('')}</div></article>`,
        )
        .join(''),
    )}
    ${panel(
      'titles',
      'Title：26件の原題と表示候補',
      model.titles
        .map(
          (t) =>
            `<article class="case" data-title-case="${t.download_id}" ${fileAttrs(t.file)}><span class="badge confidence-${t.confidence}">${t.confidence} confidence</span><h3>${escape(t.title_ja_candidate)}</h3>${metadata(
              [
                ['原題', t.title_original],
                ['原filename', t.file.filename_original],
                ['notes', t.notes],
              ],
            )}</article>`,
        )
        .join(''),
    )}
    ${panel('rights', '公開権：全77件が確認待ち', '<p>ローカルに存在すること、既存公開、無料downloadは再配布許諾の証拠に代えません。</p><div class="cards">' + model.files.map(fileCard).join('') + '</div>')}
    <footer>この画面はproduction buildに含まれません。原題・型式を保持し、作者やlicenseは推測しません。</footer></main></body></html>`;
}

export function reviewRequestPath(target) {
  if (
    typeof target !== 'string' ||
    !target.startsWith('/') ||
    target.startsWith('//')
  )
    return null;
  try {
    return new URL(target, 'http://127.0.0.1').pathname;
  } catch {
    return null;
  }
}
