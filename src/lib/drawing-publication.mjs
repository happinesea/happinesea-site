import catalog from '../data/drawing-library/publication.json' with { type: 'json' };
export { catalog };
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
  return catalog.records.filter(
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
  return catalog.downloads.filter(
    (d) => record.downloads.includes(d.id) && (owner || d.source_path === null),
  );
}
export function recordImage(record) {
  return (
    record.featured_image?.src ??
    record.preview_url ??
    '/images/drawings/placeholder.svg'
  );
}
