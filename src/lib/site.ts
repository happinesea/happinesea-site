import { withBase } from './urls';

export const SITE_NAME = 'happinesea';
export const SITE_DESCRIPTION =
  '航空・RC・ドローン分野の製品情報、マニュアル、サポート、技術・業界情報を提供する日本語情報サイト。';
export const LINE_ACCOUNT_ID = '@662zyrsb';
export const LINE_URL = 'https://line.me/R/ti/p/%40662zyrsb';

export function getNavigation(base = import.meta.env.BASE_URL) {
  return [
    { label: '商品', href: withBase('/radiolink/', base) },
    { label: 'マニュアル', href: withBase('/manuals/', base) },
    { label: 'サポート', href: withBase('/support/', base) },
    { label: '業界・技術', href: withBase('/insights/', base) },
  ] as const;
}
