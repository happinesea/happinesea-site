import { htmlText } from '../../scripts/lib/wordpress-publication.mjs';

// This projection uses only existing public legacy metadata, never proposed records.
/** @returns {Array<{packageIds: string[], title: string, category: string, description: string, href: string, canonical: string, downloadHref: string, hero: {src: string, alt: string, width: number, height: number} | null}>} */
export function publicDrawings(snapshot, downloads) {
  const files = downloads.files.filter(
    (file) =>
      file.status === 'REPLACE' &&
      file.target_route.startsWith('/downloads/drawings/'),
  );
  if (files.length !== 6)
    throw new Error(
      'drawing public allowlist changed: expected six existing files',
    );
  return files.map((file) => {
    const packages = snapshot.pages.filter(
      (page) =>
        page.type === 'download_endpoint' &&
        file.legacy_routes.includes(page.download_target),
    );
    if (!packages.length) throw new Error('existing drawing package missing');
    const page = packages[0];
    const paragraphs = [
      ...page.content_html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi),
    ]
      .map((match) => htmlText(match[1]))
      .filter((text) => text && !/^download$/i.test(text));
    return {
      packageIds: packages.map((p) => String(p.download_id)),
      title: page.title,
      category: '機体の設計図',
      description:
        paragraphs[0] ?? '設計図ファイルと関連資料をダウンロードできます。',
      href: page.target_route,
      canonical: page.canonical,
      downloadHref: file.target_route,
      hero: page.hero,
    };
  });
}
