import baselineCatalog from '../data/drawing-library/publication.json' with { type: 'json' };
import reanalysis from '../data/drawing-library/rar-reanalysis.json' with { type: 'json' };
import ownerExclusions from '../data/drawing-library/owner-exclusions.json' with { type: 'json' };
export { ownerExclusions };
export { reanalysis };
// Display notes are removed without changing source titles or review evidence.
export function drawingDisplayText(value) {
  return value
    .replace(/[（(][^）)]*(?:未確認|候補|原題)[^）)]*[）)]/g, '')
    .replaceAll('微风', '微風')
    .replaceAll('原題・内部資料名を保持し、', '')
    .replaceAll(
      '原題とファイル情報を確認できます。',
      'ファイル情報を確認できます。',
    )
    .trim();
}
export function drawingDisplayTags(tags) {
  return tags.filter((tag) => tag !== '名称・機種未確認');
}
export const ownerCatalog = {
  ...baselineCatalog,
  records: reanalysis.records.filter(
    (record) => !ownerExclusions.some((e) => e.record_id === record.id),
  ),
  tags: reanalysis.tags
    .map((tag) => ({
      ...tag,
      records: reanalysis.records.filter(
        (r) =>
          r.tags.includes(tag.tag) &&
          !ownerExclusions.some((e) => e.record_id === r.id),
      ).length,
    }))
    .filter((t) => t.records > 0),
  downloads: baselineCatalog.downloads.map((file) => {
    const derived = reanalysis.distributions.find(
      (d) => d.download_id === file.id,
    );
    return derived
      ? {
          ...file,
          ...derived,
          filename_distribution: derived.target_url.split('/').at(-1),
        }
      : file;
  }),
  dedup_decisions: reanalysis.dedup_decisions,
};
export const catalog =
  process.env.DRAWING_OWNER_PREVIEW === '1' ? ownerCatalog : baselineCatalog;
export function publicationRecords(env = process.env) {
  if (
    env.DRAWING_OWNER_PREVIEW === '1' &&
    (env.PUBLICATION_MODE === 'production' || env.CI)
  )
    throw new Error('Owner drawing preview is forbidden in production');
  if (catalog.records.some((r) => r.publication_right !== 'REVIEW_REQUIRED'))
    throw new Error(
      'Rights promotion requires an explicit reviewed publication change',
    );
  const selected =
    env.DRAWING_OWNER_PREVIEW === '1' ? ownerCatalog : baselineCatalog;
  return selected.records.filter(
    (r) => r.existing || env.DRAWING_OWNER_PREVIEW === '1',
  );
}
export function packageRecord(page) {
  return catalog.records.find(
    (r) =>
      r.existing &&
      r.legacy.wordpress_ids.includes(String(page.download_id ?? page.id)),
  );
}
export function recordDownloads(record, env = process.env) {
  const owner = env.DRAWING_OWNER_PREVIEW === '1';
  return (owner ? ownerCatalog : baselineCatalog).downloads
    .filter(
      (d) =>
        record.downloads.includes(d.id) && (owner || d.source_path === null),
    )
    .map((file) => ({
      ...file,
      filename_distribution:
        'filename_distribution' in file ? file.filename_distribution : null,
    }));
}
export function recordImage(record) {
  return (
    record.featured_image?.src ??
    record.preview_url ??
    '/images/drawings/placeholder.svg'
  );
}
