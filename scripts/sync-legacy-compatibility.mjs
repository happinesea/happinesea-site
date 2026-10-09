import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';
import sharp from 'sharp';
import {
  assetPath,
  downloadFilename,
  entryContent,
  prepareLegacyHtml,
} from './lib/legacy-compatibility.mjs';
import {
  extractRemoteArticleImages,
  fetchJson,
  fetchWithRetry,
  resolveBuildTimeSourceUrl,
  assertBuildTimeSourceHash,
  htmlText,
} from './lib/wordpress-publication.mjs';
import { publicUrls } from './lib/legacy-public-surface.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(
  await readFile(
    join(root, 'src/data/wordpress-insight-manifest.json'),
    'utf8',
  ),
);
const endpoint = process.env.WORDPRESS_API_URL ?? manifest.source_endpoint;
const audit = JSON.parse(
  await readFile(join(root, 'src/data/legacy-public-surface.json'), 'utf8'),
);
const checksum = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pages = [];
const assets = new Map();
const downloads = new Map();
const blocked = [];
const fetched = new Map();
const previous = JSON.parse(
  await readFile(
    join(root, 'src/data/legacy-compatibility.json'),
    'utf8',
  ).catch(() => '{"assets":[]}'),
);
const excludedAsset = (url) =>
  /(?:\.xlsx|\/log_file_[^/]+\.txt)$/.test(new URL(url).pathname);
const retainObservation = (record) => ({
  ...record,
  observed_at: record.observed_at ?? null,
  ...(!record.observed_at
    ? {
        observation_note:
          'Captured before this snapshot; exact per-source observation time was not recorded.',
      }
    : {}),
});
if (process.argv.includes('--reuse-reviewed')) {
  for (const asset of previous.assets.filter(
    (asset) => !excludedAsset(asset.source_url),
  )) {
    const bytes = await readFile(join(root, 'public', asset.target_route));
    if (checksum(bytes) !== asset.sha256)
      throw new Error(`cached asset checksum drift: ${asset.source_url}`);
    assets.set(asset.source_url, {
      ...retainObservation(asset),
    });
    if (asset.download_id) downloads.set(asset.download_id, asset.target_route);
  }
}

async function get(url) {
  if (fetched.has(url)) return fetched.get(url);
  const prior =
    process.argv.includes('--reuse-assets') ||
    process.argv.includes('--reuse-reviewed')
      ? previous.assets.find(
          (asset) => asset.source_url === url.replace(/&refresh=[^&]+/, ''),
        )
      : null;
  if (prior && !excludedAsset(url)) {
    const bytes = await readFile(join(root, 'public', prior.target_route));
    if (checksum(bytes) !== prior.sha256)
      throw new Error(`cached asset checksum drift: ${url}`);
    return {
      bytes,
      record: {
        ...retainObservation(prior),
      },
    };
  }
  const response = await fetchWithRetry(resolveBuildTimeSourceUrl(url), {});
  const bytes = Buffer.from(await response.arrayBuffer());
  const reviewed = previous.assets.find(
    (asset) => asset.source_url === url.replace(/&refresh=[^&]+/, ''),
  );
  assertBuildTimeSourceHash(url, bytes, reviewed?.sha256);
  const record = {
    source_url: url.replace(/&refresh=[^&]+/, ''),
    http_status: response.status,
    content_type: response.headers.get('content-type')?.split(';')[0] ?? null,
    content_length: response.headers.get('content-length'),
    received_bytes: bytes.length,
    sha256: checksum(bytes),
    filename: response.headers.get('content-disposition') ?? null,
    final_url: response.url,
    redirected: response.redirected,
    observed_at: new Date().toISOString(),
  };
  const result = { bytes, record, response };
  fetched.set(url, result);
  return result;
}

async function saveAsset(source, kind, target = assetPath(source)) {
  if (assets.has(source)) return assets.get(source);
  const { bytes, record } = await get(source);
  if (record.http_status !== 200)
    throw new Error(`HTTP ${record.http_status}: ${source}`);
  if (
    kind === 'download' &&
    (/^\s*<(?:!doctype|html)/i.test(bytes.toString('utf8', 0, 200)) ||
      record.content_type === 'text/html')
  )
    throw new Error(`download returned HTML: ${source}`);
  const metadata =
    kind === 'image' ? await sharp(bytes, { animated: true }).metadata() : null;
  if (metadata && (!metadata.width || !metadata.height))
    throw new Error(`image decode failed: ${source}`);
  const asset = {
    ...record,
    kind,
    target_route: target,
    ...(metadata
      ? {
          width: metadata.width,
          height: metadata.pageHeight ?? metadata.height,
        }
      : {}),
  };
  const path = join(root, 'public', target);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
  assets.set(source, asset);
  return asset;
}

async function capturePage(source, type, post) {
  const { bytes, record } = await get(source);
  if (record.http_status !== 200)
    throw new Error(`HTTP ${record.http_status}: ${source}`);
  const html = bytes.toString('utf8');
  const canonical = html.match(
    /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i,
  )?.[1];
  if (
    !canonical ||
    new URL(canonical).origin !== 'https://happinesea.com' ||
    decodeURIComponent(new URL(canonical).pathname) !==
      decodeURIComponent(new URL(source).pathname)
  )
    throw new Error(`canonical drift: ${source}`);
  const body =
    type === 'download_endpoint'
      ? entryContent(html, 'col-md-7')
      : post.content.rendered;
  const title = post
    ? htmlText(post.title.rendered)
    : htmlText(body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
  if (!title) throw new Error(`title missing: ${source}`);
  const heroUrl = ['drawing', 'download_endpoint'].includes(type)
    ? (html.match(
        /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      )?.[1] ?? null)
    : null;
  return {
    ...record,
    source_url: source,
    type,
    id: post?.id ?? null,
    title,
    canonical,
    target_route: new URL(canonical).pathname,
    source_html: body,
    hero_url: heroUrl,
    modified_at: post?.modified_gmt ?? null,
  };
}

// Explicitly scoped publication copies; WordPress/Git upstream remains the owner.
// Independently reviewed editorial captures are refreshed by their own bounded review.
for (const page of previous.pages.filter((page) =>
  [
    'fixed_page',
    'faq',
    'category_archive',
    'blog_archive',
    'faq_archive',
    'manual_rebuild_notice',
  ].includes(page.type),
)) {
  pages.push({ ...page, source_html: page.content_html });
}
for (const id of [233, 141, 1716, 1726, 1734, 1742, 1891]) {
  const prior = process.argv.includes('--reuse-reviewed')
    ? previous.pages.find((page) => page.id === id)
    : null;
  if (prior) {
    pages.push({
      ...retainObservation(prior),
      source_html: prior.content_html,
    });
    continue;
  }
  const post = await fetchJson(
    new URL(`${id === 233 || id === 141 ? 'pages' : 'posts'}/${id}`, endpoint),
  );
  if (post.status !== 'publish')
    throw new Error(`unpublished legacy content: ${id}`);
  const type =
    id === 233 ? 'drawing_library' : id === 141 ? 'glossary' : 'drawing';
  pages.push(await capturePage(post.link, type, post));
  console.log(`Captured ${type} ${id}`);
}

const packageUrls = new Set(
  pages.flatMap((page) =>
    publicUrls(page.source_html, page.source_url).filter(
      (url) =>
        new URL(url).pathname.startsWith('/download/') && !new URL(url).search,
    ),
  ),
);
for (const source of packageUrls) {
  try {
    const prior = process.argv.includes('--reuse-reviewed')
      ? previous.pages.find((page) => page.source_url === source)
      : null;
    if (prior) {
      pages.push({
        ...retainObservation(prior),
        source_html: prior.content_html,
      });
      continue;
    }
    const page = await capturePage(source, 'download_endpoint');
    const html = (await get(source)).bytes.toString('utf8');
    const query = html
      .match(/data-downloadurl=["']([^"']+)["']/i)?.[1]
      ?.replaceAll('&amp;', '&');
    if (!query) throw new Error('download control missing');
    const url = new URL(query);
    if (
      url.origin !== 'https://happinesea.com' ||
      !/^\d+$/.test(url.searchParams.get('wpdmdl') ?? '')
    )
      throw new Error('invalid download query');
    const { bytes, record } = await get(url.href);
    if (
      record.http_status !== 200 ||
      record.content_type === 'text/html' ||
      /^\s*<(?:!doctype|html)/i.test(bytes.toString('utf8', 0, 200))
    )
      throw new Error(
        `download failed: HTTP ${record.http_status}, ${record.content_type}`,
      );
    const disposition = record.filename ?? '';
    const filename =
      disposition.match(/filename\*?=(?:UTF-8''|["'])?([^"';]+)/i)?.[1] ??
      (/\.(?:pdf|zip|dxf|dwg)$/i.test(new URL(record.final_url).pathname)
        ? new URL(record.final_url).pathname.split('/').at(-1)
        : null);
    const safeName = downloadFilename(filename);
    if (new URL(record.final_url).origin !== 'https://happinesea.com')
      throw new Error('unsupported download origin');
    const target = new URL(record.final_url).pathname.startsWith('/wp-content/')
      ? assetPath(record.final_url)
      : `/assets/legacy-downloads/${url.searchParams.get('wpdmdl')}/${safeName}`;
    const targetPath = resolve(root, 'public', `.${target}`);
    if (!targetPath.startsWith(resolve(root, 'public') + sep))
      throw new Error('download path escapes public directory');
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, bytes);
    const asset = {
      ...record,
      kind: 'download',
      target_route: target,
      source_page: source,
      download_id: url.searchParams.get('wpdmdl'),
    };
    assets.set(record.source_url, asset);
    downloads.set(asset.download_id, target);
    page.download_id = asset.download_id;
    page.download_target = target;
    // Package body only: replace the old plugin's controls with this verified file link.
    page.source_html =
      page.source_html
        .replace(/<h1\b([^>]*)>/gi, '<h2$1>')
        .replaceAll('</h1>', '</h2>') +
      `<p><a href="${target}" download>Download</a></p>`;
    pages.push(page);
    console.log(`Captured package ${asset.download_id}: ${bytes.length} bytes`);
  } catch (error) {
    blocked.push({
      source_url: source,
      status: 'BLOCKED',
      reason: error.message,
      target_route: null,
    });
    console.log(`BLOCKED ${source}: ${error.message}`);
  }
}

for (const entry of audit.entries.filter(
  (entry) => entry.content_type === 'download',
)) {
  try {
    if (excludedAsset(entry.legacy_url)) {
      const { record } = await get(entry.legacy_url);
      blocked.push({
        ...record,
        source_url: entry.legacy_url,
        source: entry.source,
        status: 'BLOCKED',
        target_route: null,
        reason:
          'Public republication purpose/privacy not approved: spreadsheet or operational log requires owner review.',
      });
      continue;
    }
    await saveAsset(entry.legacy_url, 'download');
    assets.get(entry.legacy_url).source = entry.source;
    assets.get(entry.legacy_url).source_page =
      audit.entries.find(
        (item) =>
          item.content_type === 'attachment' &&
          item.source.some((source) => entry.source.includes(source)),
      )?.legacy_url ?? null;
    console.log(`Preserved ${new URL(entry.legacy_url).pathname}`);
  } catch (error) {
    blocked.push({
      source_url: entry.legacy_url,
      status: 'BLOCKED',
      reason: error.message,
      target_route: null,
    });
  }
}

// Alt review overrides are explicit, bounded and tied to visually reviewed source images.
const overridesPath = join(root, 'src/data/legacy-image-review.json');
const reviewed = JSON.parse(await readFile(overridesPath, 'utf8'));
const output = [];
for (const page of pages) {
  try {
    if (page.status === 'READY') {
      output.push({ ...page, source_html: undefined });
      continue;
    }
    const imageAssets = new Map();
    const pendingAltReviews = [];
    const hero = page.hero_url ? await saveAsset(page.hero_url, 'image') : null;
    let body = page.source_html;
    for (const { src, alt } of extractRemoteArticleImages(body)) {
      const asset = await saveAsset(src, 'image');
      const reviewedAlt = reviewed[src]?.alt ?? alt;
      if (!reviewedAlt.trim()) pendingAltReviews.push(src);
      imageAssets.set(src, {
        src: asset.target_route,
        width: asset.width,
        height: asset.height,
      });
      if (reviewedAlt !== alt)
        body = body.replaceAll(/<img\b[^>]*>/gi, (tag) =>
          tag.includes(src)
            ? tag.replace(/\balt=["'][^"']*["']/i, `alt="${reviewedAlt}"`)
            : tag,
        );
    }
    if (pendingAltReviews.length)
      throw new Error(
        `image alt not reviewed: ${pendingAltReviews.join(', ')}`,
      );
    if (hero && !reviewed[page.hero_url]?.alt)
      throw new Error(`featured image alt not reviewed: ${page.hero_url}`);
    const content = prepareLegacyHtml(body, imageAssets, downloads);
    output.push({
      ...page,
      source_html: undefined,
      hero_url: undefined,
      content_html: content,
      hero: hero
        ? {
            src: hero.target_route,
            width: hero.width,
            height: hero.height,
            alt: reviewed[page.hero_url].alt,
          }
        : null,
      status: 'READY',
    });
    console.log(`READY ${page.target_route}`);
  } catch (error) {
    blocked.push({
      source_url: page.source_url,
      status: 'BLOCKED',
      reason: error.message,
      target_route: null,
    });
    console.log(`BLOCKED ${page.source_url}: ${error.message}`);
  }
}

const snapshot = {
  version: '0.1',
  source_origin: 'https://happinesea.com',
  observed_at: new Date().toISOString(),
  pages: output,
  assets: [...assets.values()],
  blocked,
};
await writeFile(
  join(root, 'src/data/legacy-compatibility.json'),
  await format(JSON.stringify(snapshot), { parser: 'json' }),
);
console.log(
  `Legacy compatibility: ${output.length} pages, ${assets.size} assets, ${blocked.length} blocked`,
);
