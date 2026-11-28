import official from '../data/manuals/official-links.json' with { type: 'json' };
import japanese from '../data/manuals/existing-ja.json' with { type: 'json' };
import receiverManuals from './receiver-manuals.mjs';
import { isInitialManualRelease } from './manual-release.mjs';

const unavailableFullSources = new Set([
  'ant-b10',
  'ant-m7',
  'divit',
  'f330',
  'f405',
  'i2c-expansion-board',
  'i2c-transfer-board',
  'se100-m10n',
]);

export function canShowGeneratedManual(entry) {
  return (
    process.env.PUBLICATION_MODE !== 'production' ||
    entry.publication_status === 'PUBLISHED' ||
    isInitialManualRelease(entry)
  );
}

function generatedManuals(slug) {
  return receiverManuals.manuals.filter(
    (entry) =>
      (entry.product_route === '/radiolink/' + slug + '/' ||
        entry.product_id === slug) &&
      canShowGeneratedManual(entry),
  );
}

export function productDetailPath(product) {
  return (
    product.detailPath ||
    receiverManuals.manuals.find(
      (entry) => entry.product_route === '/radiolink/' + product.slug + '/',
    )?.product_route ||
    '/radiolink/materials/' + product.slug + '/'
  );
}

export function generatedManualLabel(entry) {
  if (entry.source.document_scope === 'QUICK_START_GUIDE_NOT_FULL_MANUAL')
    return '日本語クイックガイド';
  if (entry.source.document_scope === 'MULTIROTOR_FULL_MANUAL')
    return '日本語取扱説明書（マルチローター版）';
  if (entry.product_id === 'twc') return '日本語ガイド（公式Web資料の範囲）';
  if (entry.product_id.endsWith('-official-edition'))
    return '日本語取扱説明書（現行英語原典に対応）';
  return '日本語取扱説明書';
}

export function productMaterialLinks(product) {
  const { slug } = product;
  const family =
    { 't8fb-bt': 't8fb', 'rc6gs-v3': 'rc6gs', 'rc4gs-v3': 'rc4gs' }[slug] ??
    slug;
  const links = japanese.manuals
    .filter(
      (manual) =>
        manual.publication_status === 'publication_copy' &&
        manual.product === family &&
        (manual.generation === 'V3' ||
          !['rc4gs-v3', 'rc6gs-v3'].includes(slug)),
    )
    .map((manual) => ({
      href: manual.route,
      label: manual.title,
      id: manual.id,
      external: false,
    }));
  links.push(
    ...generatedManuals(slug).map((entry) => ({
      href: entry.route,
      label: generatedManualLabel(entry),
      id: entry.product_id + '-web-ja-v1',
      external: false,
    })),
  );
  if (!unavailableFullSources.has(slug)) {
    links.push(
      ...official.links
        .filter((entry) => entry.product === slug)
        .map((entry, index) => ({
          href: entry.url,
          label: officialMaterialLabel(slug, entry.edition),
          id: slug + '-official-' + index,
          external: true,
        })),
    );
  }
  if (slug === 'f405') {
    const quickGuide = receiverManuals.manuals.find(
      (entry) =>
        entry.product_id === slug &&
        entry.source.document_scope === 'QUICK_START_GUIDE_NOT_FULL_MANUAL',
    );
    if (quickGuide) {
      links.push({
        href: quickGuide.source.source_url,
        label: '英語クイックガイド（公式サイト）',
        id: 'f405-official-quick-guide',
        external: true,
      });
    }
  }
  if (!links.some((link) => link.external)) {
    links.push({
      href: product.officialUrl,
      label: '製品・サポート情報（Radiolink公式サイト）',
      id: slug + '-official-product',
      external: true,
    });
  }
  return links;
}

function officialMaterialLabel(slug, edition) {
  if (slug === 'twc') return '公式Web資料（英語、掲載範囲のみ・公式サイト）';
  if (slug === 'pix6')
    return '公式資料（マルチローター・固定翼／QuadPlane・クイックガイド・公式サイト）';
  const label = slug === 'a560' ? '英語版組立説明書' : '英語版取扱説明書';
  return label + (edition ? '（' + edition + '）' : '') + '（公式サイト）';
}

export function fullSourceUnavailable(slug) {
  return unavailableFullSources.has(slug);
}
