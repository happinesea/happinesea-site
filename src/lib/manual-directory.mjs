import catalogue from '../data/product-catalogue.json' with { type: 'json' };
import inventory from '../data/manuals/existing-ja.json' with { type: 'json' };
import receiverManuals from './receiver-manuals.mjs';
import {
  canShowGeneratedManual,
  fullSourceUnavailable,
  generatedManualLabel,
  productDetailPath,
  productMaterialLinks,
} from './product-materials.mjs';

// Catalogue variants supply imagery/category only; manual editions stay explicit.
const models = [
  {
    id: 'rc4gs',
    name: 'RC4GS',
    catalogue: 'rc4gs-v3',
  },
  {
    id: 'rc6gs',
    name: 'RC6GS',
    catalogue: 'rc6gs-v3',
  },
  {
    id: 'rc8x',
    name: 'RC8X',
    catalogue: 'rc8x',
  },
  {
    id: 't8fb',
    name: 'T8FB',
    catalogue: 't8fb-bt',
  },
  {
    id: 'byme-a',
    name: 'Byme-A',
    catalogue: 'byme-a',
  },
  {
    id: 'byme-d',
    name: 'Byme-D',
    catalogue: 'byme-d',
  },
];

models.push(
  ...catalogue
    .filter(
      (product) => !models.some((model) => model.catalogue === product.slug),
    )
    .map((product) => ({
      id: product.slug,
      name: product.name,
      catalogue: product.slug,
    })),
);

export const manualCards = models.map((model) => {
  const product = catalogue.find((product) => product.slug === model.catalogue);
  if (!product)
    throw new Error(`Manual catalogue product missing: ${model.catalogue}`);
  const links = inventory.manuals
    .filter(
      (manual) =>
        manual.product === model.id &&
        manual.publication_status === 'publication_copy',
    )
    .map((manual) => ({
      href: manual.route,
      label: `${manual.document_type === 'quick_reference' ? 'クイックリファレンス' : '取扱説明書'}${manual.generation ? `（${manual.generation}）` : ''}`,
      external: false,
      id: manual.id,
    }));
  if (model.id === 'rc4gs')
    links.unshift({
      href: '/manuals/rc4gs-v2/',
      label: '取扱説明書（V2）',
      external: false,
      id: 'rc4gs-v2',
    });
  if (['rc8x', 'rc8p'].includes(model.id))
    links.unshift({
      href: `/manuals/${model.id}/`,
      label: '取扱説明書',
      external: false,
      id: model.id,
    });
  links.push(
    ...receiverManuals.manuals
      .filter(
        (entry) =>
          (entry.product_id === product.slug ||
            entry.product_route === '/radiolink/' + product.slug + '/') &&
          canShowGeneratedManual(entry),
      )
      .map((entry) => ({
        href: entry.route,
        label: generatedManualLabel(entry),
        external: false,
        id: entry.product_id + '-web-ja-v1',
      })),
    ...productMaterialLinks(product).filter((link) => link.external),
  );
  return {
    id: model.id,
    name: model.name,
    category: product.category,
    productPath: productDetailPath(product),
    description: fullSourceUnavailable(product.slug)
      ? 'この型番の公式全文取扱説明書は確認できていません。'
      : ['rc8x', 'rc8p'].includes(model.id)
        ? '日本語完全版の取扱説明書を掲載しています。'
        : 'この機種の取扱説明書と公式資料を確認できます。',
    image: product.image,
    imageLabel: product.name,
    links,
  };
});
