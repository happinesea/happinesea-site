import { withBase } from './urls';

export const SITE_NAME = 'happinesea hobby';
export const SITE_TAGLINE = '夢を現実に！';
export const SITE_DESCRIPTION =
  'ラジコン・ドローン・航空の話題から、電子工作や関連技術、Radiolink製品の使い方まで。';
export const LINE_ACCOUNT_ID = '@662zyrsb';
export const LINE_URL = 'https://line.me/R/ti/p/%40662zyrsb';

export function getNavigation(base = import.meta.env.BASE_URL) {
  return [
    { label: 'Radiolink製品', href: withBase('/radiolink/', base) },
    { label: 'マニュアル', href: withBase('/manuals/', base) },
    { label: 'サポート', href: withBase('/support/', base) },
    { label: 'ニュース・航空知識', href: withBase('/insights/', base) },
    {
      label: '設計図ライブラリ',
      href: 'https://happinesea.com/drawinglibrary',
    },
    { label: '基本用語集', href: 'https://happinesea.com/drone-rc-glossary' },
  ] as const;
}
