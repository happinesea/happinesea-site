import catalogue from '../data/product-catalogue.json' with { type: 'json' };
import inventory from '../data/manuals/existing-ja.json' with { type: 'json' };

// Catalogue variants supply imagery/category only; manual editions stay explicit.
const models = [
  {
    id: 'rc4gs',
    name: 'RC4GS',
    catalogue: 'rc4gs-v3',
    official: 'rc4gsv3_manual',
    edition: 'V3',
  },
  {
    id: 'rc6gs',
    name: 'RC6GS',
    catalogue: 'rc6gs-v3',
    official: 'rc6gsv3_manual',
    edition: 'V3',
  },
  {
    id: 'rc8x',
    name: 'RC8X',
    catalogue: 'rc8x',
    official: 'rc8x_manual',
    edition: '',
  },
  {
    id: 't8fb',
    name: 'T8FB',
    catalogue: 't8fb-bt',
    official: 't8fb_bt_manual',
    edition: 'BT',
  },
  {
    id: 'byme-a',
    name: 'Byme-A',
    catalogue: 'byme-a',
    official: 'bymea_manual',
    edition: '',
  },
  {
    id: 'byme-d',
    name: 'Byme-D',
    catalogue: 'byme-d',
    official: 'bymed_manual',
    edition: '',
  },
];

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
  if (model.id === 'rc8x')
    links.unshift({
      href: '/manuals/rc8x/',
      label: '取扱説明書（概要・第1章・第2章）',
      external: false,
      id: 'rc8x',
    });
  links.push({
    href: `https://www.radiolink.com/${model.official}`,
    label: `英語版取扱説明書${model.edition ? `（${model.edition}）` : ''}（公式サイト）`,
    external: true,
    id: `${model.id}-official`,
  });
  return {
    id: model.id,
    name: model.name,
    category: product.category,
    description:
      model.id === 'rc8x'
        ? '現在は概要、第1章、第2章を掲載しています。'
        : `${product.subcategoryLabel}の操作方法と設定を確認できます。`,
    image: product.image,
    imageLabel: product.name,
    links,
  };
});
