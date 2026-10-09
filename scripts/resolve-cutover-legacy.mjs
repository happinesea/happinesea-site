import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { format } from 'prettier';
import { fetchRedirects } from './audit-domain-cutover.mjs';

const load = async (name) =>
  JSON.parse(await readFile(`src/data/${name}.json`, 'utf8'));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const escape = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const key = (url) =>
  new URL(url).href.replace(/%[a-f\d]{2}/gi, (s) => s.toUpperCase());
const audit = JSON.parse(
  await readFile('docs/audits/current-legacy-reaudit.json', 'utf8'),
);
const snapshot = await load('legacy-compatibility');
const downloads = await load('static-downloads');
for (const item of downloads.unknown) {
  item.status = 'OWNER_APPROVED_DO_NOT_PUBLISH';
  item.cutover_blocker = false;
  item.reason =
    'Owner decision: unreferenced log/spreadsheet; do not publish and do not block cutover.';
}
const now = new Date().toISOString();
const aliases = audit.old_origin_checks
  .filter(
    (r) =>
      r.counterpart.status === 404 &&
      /\/radiolink-support\/.+\/\d+\.html$/.test(
        new URL(r.legacy_url).pathname,
      ),
  )
  .map((r) => {
    const source =
      audit.required_source_checks.find(
        (s) => key(s.url) === key(r.legacy_url) && s.status === 200,
      ) ??
      audit.source_rechecks.find(
        (s) =>
          key(s.recheck.url) === key(r.legacy_url) && s.recheck.status === 200,
      )?.recheck;
    if (!source || source.final_url === source.url)
      throw new Error(`verified alias destination missing: ${r.legacy_url}`);
    return {
      legacy_url: r.legacy_url,
      target_route: new URL(r.legacy_url).pathname,
      source_route: new URL(source.final_url).pathname,
      canonical: source.final_url,
    };
  });
if (aliases.length !== 23) throw new Error('expected 23 verified aliases');
const linkEdits = [
  {
    route: '/radiolink-productions-manual',
    links: [
      'https://happinesea.com/r6dsm-manual',
      'https://happinesea.com/minipix-manual-multicopter',
    ],
    reason:
      'Owner approved broken-link removal; retain labels, no guessed manual substitute.',
  },
  {
    route: '/category/experience',
    links: ['https://happinesea.com/experience/202107081627.html'],
    reason: 'Owner-retired article remains absent; remove archive link only.',
  },
  {
    route: '/blog/page/3',
    links: ['https://happinesea.com/experience/202107081627.html'],
    reason: 'Owner-retired article remains absent; remove archive link only.',
  },
  {
    route: '/sample-page',
    links: ['https://happinesea.com/wp-admin/'],
    reason: 'Owner approved removal of obsolete CMS management navigation.',
  },
].map((edit) => {
  const page = snapshot.pages.find((p) => p.target_route === edit.route);
  if (
    !page ||
    edit.links.some((url) => !page.content_html.includes(`href="${url}"`))
  )
    throw new Error(`link edit literal missing: ${edit.route}`);
  return { ...edit, content_sha256: digest(page.content_html) };
});
const newPages = [];
for (const ref of audit.old_origin_checks.filter(
  (r) =>
    r.counterpart.status === 404 && r.legacy_url.includes('/document-tag/'),
)) {
  const { response, current } = await fetchRedirects(ref.legacy_url);
  if (response.status !== 200)
    throw new Error(`tag archive unavailable: ${ref.legacy_url}`);
  const html = await response.text();
  const canonical = /<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i.exec(
    html,
  )?.[1];
  if (
    !canonical ||
    new URL(canonical).origin !== 'https://happinesea.com' ||
    decodeURIComponent(new URL(canonical).pathname) !==
      decodeURIComponent(new URL(ref.legacy_url).pathname)
  )
    throw new Error('tag canonical mismatch');
  const target = new URL(ref.legacy_url).pathname;
  const members = snapshot.pages.filter(
    (p) =>
      p.download_id &&
      p.content_html.toUpperCase().includes(target.toUpperCase()),
  );
  if (!members.length) throw new Error(`tag members not verified: ${target}`);
  const title = /<title>(.*?) アーカイブ -/s.exec(html)?.[1];
  if (!title) throw new Error('tag title missing');
  newPages.push({
    source_url: ref.legacy_url,
    source_final_url: current,
    source_sha256: digest(html),
    observed_at: now,
    http_status: 200,
    type: 'download_tag_archive',
    title,
    canonical,
    target_route: target,
    status: 'READY',
    content_html: `<p>${escape(title)}の公開ダウンロード情報。</p><ul>${members.map((p) => `<li><a href="https://happinesea.com${escape(p.target_route)}">${escape(p.title)}</a></li>`).join('')}</ul>`,
    member_routes: members.map((p) => p.target_route),
    hero: null,
  });
}
const queryPage = 'https://happinesea.com/download/rc4gs-v6-0-1fhss-rx';
const { response } = await fetchRedirects(queryPage);
if (response.status !== 200) throw new Error('firmware page unavailable');
const html = await response.text();
const sourceUrl = /data-downloadurl="([^"]*wpdmdl=394[^" ]*)"/
  .exec(html)?.[1]
  ?.replaceAll('&amp;', '&');
if (!sourceUrl) throw new Error('literal firmware download missing');
const binary = await fetchRedirects(sourceUrl);
const bytes = Buffer.from(await binary.response.arrayBuffer());
const expected =
  '1a7dec9ec4990dff69e1312f9f6c99bab3e6b8702a80f67b5edb1ac11a7cf024';
if (
  binary.response.status !== 200 ||
  !/zip/i.test(binary.response.headers.get('content-type') ?? '') ||
  digest(bytes) !== expected
)
  throw new Error('reviewed Japanese firmware ZIP drift');
const route =
  '/downloads/radiolink/RC4GS_firmware_V6.0.1-2019.7.8_jp-1a7dec9ec499.zip';
await mkdir('public/downloads/radiolink', { recursive: true });
await writeFile(`public${route}`, bytes);
if (!downloads.files.some((f) => f.sha256 === expected))
  downloads.files.push({
    status: 'KEEP',
    sha256: expected,
    content_type: 'application/zip',
    received_bytes: bytes.length,
    target_route: route,
    legacy_routes: [],
    source_urls: [sourceUrl],
    source_page: queryPage,
    source_final_url: binary.current,
    observed_at: now,
  });
for (const [path, title, fileHash, description] of [
  [
    '/download/rc4gs-v6-0-1fhss-rx',
    'RC4GS-V6.0.1(FHSS-RX)',
    expected,
    '日本語変更履歴を含むファームウェアパッケージ。',
  ],
  [
    '/download/rc4gs-firmware-v3-0-8',
    'RC4GS V3.0.8',
    'ed0e198286a74a53f9252a22cfc2ba9b92f3c3b4072e5d3894956e0a55a6f532',
    'ファームウェアの公開ZIPファイル。',
  ],
]) {
  const source = await fetchRedirects('https://happinesea.com' + path);
  if (source.response.status !== 200)
    throw new Error('firmware source unavailable');
  const sourceHtml = await source.response.text();
  const canonical = /<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i.exec(
    sourceHtml,
  )?.[1];
  if (
    !canonical ||
    new URL(canonical).origin !== 'https://happinesea.com' ||
    new URL(canonical).pathname !== path
  )
    throw new Error('firmware canonical mismatch');
  const file = downloads.files.find((f) => f.sha256 === fileHash);
  if (!file) throw new Error('firmware identity missing');
  newPages.push({
    source_url: 'https://happinesea.com' + path,
    source_sha256: digest(sourceHtml),
    observed_at: now,
    http_status: 200,
    title,
    canonical,
    target_route: path,
    type: 'firmware_download',
    status: 'READY',
    hero: null,
    content_html: `<p>${description}</p><p><a href="${file.target_route}" download data-download-sha256="${file.sha256}">ZIPをダウンロード</a></p>`,
    download_target: file.target_route,
    download_id: path.endsWith('fhss-rx') ? 394 : 398,
  });
}
for (const page of newPages) {
  if (snapshot.pages.some((p) => p.target_route === page.target_route))
    throw new Error(`new route collision: ${page.target_route}`);
  snapshot.pages.push(page);
}
const resolution = {
  version: '0.1',
  baseline_commit: 'efe10bba091ef92d007d079434b43f147b18d7f1',
  observed_at: now,
  aliases,
  link_edits: linkEdits,
  new_routes: newPages.map((p) => p.target_route),
  japanese_firmware_sha256: expected,
  owner_decisions: {
    management_navigation: 'REMOVE_LINK_ONLY',
    unreferenced_files: 'DO_NOT_PUBLISH_NOT_A_CUTOVER_BLOCKER',
  },
};
for (const [path, value] of [
  ['src/data/legacy-compatibility.json', snapshot],
  ['src/data/static-downloads.json', downloads],
  ['src/data/cutover-compatibility.json', resolution],
])
  await writeFile(
    path,
    await format(JSON.stringify(value), { parser: 'json' }),
  );
console.log(
  `Prepared ${aliases.length} aliases, ${newPages.length} static entries and one separate reviewed ZIP.`,
);
