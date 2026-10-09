# Sitemap / Search Console readiness

## 正式URL

- canonical root: `https://happinesea.com/`
- sitemap送信先: `https://happinesea.com/sitemap-index.xml`
- robots: `https://happinesea.com/robots.txt`

`sitemap.xml` は使用しない。indexが自動分割された `sitemap-*.xml` を列挙するため、Search Consoleへ個別chunkを追加する必要はない。

## 自動生成と除外

既存 `@astrojs/sitemap` がAstroの生成routeを取得し、生成済みHTMLのheadからcanonicalとrobotsを読む。canonical URLを重複排除して掲載する。記事・商品・マニュアル・固定ページを追加して通常のproduction buildを実行すれば反映される。手動のURL一覧や記事追加時のsitemap追記は不要。

次は掲載しない。

- noindex（googlebot指定を含む）/ none
- publication modeと異なるorigin、CMS origin、production内のstaging base
- canonical先と異なる互換alias、同一canonicalの重複
- 管理/API/404/500入口、test/staging/preview/internal入口、query/hash付きcanonical
- 未生成・withdrawn記事1627、noindexのMini Pix記事905案内

既存WordPress記事のcanonicalは旧exact `.html` URLのまま保持する。これらは正式URLとして掲載し、canonicalが旧URLを指す `/insights/<slug>/` は掲載しない。古いURLという理由だけでは除外しない。旧manual aliasesもcanonical先の正式URLだけを掲載する。

`lastmod` / `changefreq` / `priority` / `hreflang` は追加しない。確認できない更新日は補完しない。sitemap libraryの分割機構を維持する。

既存productionではRC8Xを含む8商品詳細とRC8X manualのindex/2章が `noindex, nofollow`。905案内と合わせて12ページを除外する。このPRでは正式な既存noindex方針を変更しない。これらを検索対象にしたい場合は、商品/manualの公開方針を別途確認してnoindexを解除する必要がある（解除後は通常buildで自動掲載）。HTTP 200とindex対象であることは別である。

robotsの現行 `Allow: /` 方針は両modeで維持する。staging robotsはstagingのsitemapだけを案内し、production sitemapを混入させない。stagingに新しいglobal noindex方針を導入する変更ではない。

## Build gate / 例外時

`npm run build` のalias生成・legacy output確定後に `scripts/verify-sitemap.mjs` がXMLをparseし、全chunkのorigin/base・URL重複・canonical自己整合・HTML実体・noindex除外・掲載漏れ・robotsのSitemap指定を検証する。違反はbuild failure。`verify-publication-origin.mjs` も同じ検証を再利用する。

確認コマンド:

```powershell
$env:PUBLICATION_MODE = 'production'
npm run build
node scripts/verify-sitemap.mjs
```

fixture testsは新規canonical記事、alias重複、noindex、foreign/CMS/staging origin、missing target、malformed XML、誤ったrobots originを扱う。canonical/noindexを変更した場合は通常のbuildで再確認する。Search Consoleに掲載漏れがあれば、生成HTMLのcanonical/noindex、XMLと対象routeのHTTP statusを順に確認する。推測redirectやURLの手動追加で隠さない。

## OwnerのSearch Console操作（本PRは実施しない）

1. 修正版をmerge後、owner-controlled production workflowでdeployする。
2. 正式sitemap/index/chunkとrobotsのHTTP 200、XML parse、production originを再確認する。
3. 既存の確認済み `happinesea.com` Domain propertyがあればその運用を継続する。公開frontendだけを確認する場合はURL-prefix property `https://happinesea.com/` を使用する。Domain propertyはCMS subdomainも範囲に含むため、CMSのsitemapを送信しない。所有権確認/DNSの操作はownerが実施する。
4. 「サイトマップ」から `https://happinesea.com/sitemap-index.xml` を送信する。
5. 読み込み成功・検出URL数・index/not indexedを確認する。URL検査でroot、Radiolink、RC8X商品、manual、記事の旧canonical `.html`、privacy policyを確認する。
6. canonical conflicts、404/redirect、duplicate without user-selected canonical、crawled currently not indexedを確認する。sitemap送信はindex登録を保証しない。

旧WordPress URLがGoogle indexに残っている場合も、現在のcanonical/互換alias/withdrawal方針を維持する。1627は404、905はnoindex案内であり、推測redirectや記事の復活はしない。互換aliasが検索結果に残る場合はcanonical先との関係をURL検査で確認する。

公式手順:

- [Sitemapの作成・送信](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Search Console property](https://support.google.com/webmasters/answer/34592)
- [Sitemaps report](https://support.google.com/webmasters/answer/7451001)
- [URL検査](https://support.google.com/webmasters/answer/9012289)

## 実測・QA

2026-10-10の本番実測: robots/index/chunkはHTTP 200、XML Content-Typeは `application/xml`。robotsは正式indexを1つ案内する。旧sitemapは189 URLで、canonicalと異なるslash付きURLや `/insights/` の非canonical URLを掲載していた。`sitemap.xml` は404（正式送信先ではない）。本PRをdeployするまではこの旧sitemapが配信される。

修正後production buildは173 URL。生成HTML302ページのうち117ページは同じcanonicalの互換入口、12ページはnoindexとして重複掲載／index対象から除外する（404は別途対象外）。stagingは同originの7 URLだけを掲載し、既存のproduction canonicalを持つページ等295件は掲載しない。

最終 `npm run validate` 成功: unit104件、build-output28件、Astro診断136 filesで0 errors/warnings、lint/format成功。両modeのpublication verifierは830 first-party HTTP checks、43 download hash checks、canonical conflicts / broken links / CMS runtime references各0。desktop/mobile Playwrightは両mode各20件成功。既存本番artifactとの95記事HTML byte差分0、43 download配信先byte/hash差分0。Google bootstrapの出力も既存設定のまま検証した。

Windows buildとLinux本番artifactの全ファイルbyte同一性は主張しない。対象外manual1件はCRLF/LF差のみ（正規化後一致）、Pagefind UI JSはminified symbol名差がある。公開ソースの本文・canonical・Google設定には差分がなく、既存exact artifact verifierは弱めていない。

DNS / Pages / Google管理画面 / CMS / production deployはこの作業では変更しない。
