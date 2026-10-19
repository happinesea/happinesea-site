# 通常sitemapの網羅性確認

2026-10-19、baseline `e77923da81bca51f38398d9a44704b76ff5966a7`。対象originは `https://happinesea.com/`。全HTML・canonical・robots・sitemap XML・公開台帳を照合した。ページごとのcanonical／robots／除外理由は [全量台帳](./sitemap-production-coverage.json) を参照。

## 結果と検証範囲

Gitに保存済みの公開snapshotによるproduction artifactでは、index可能なcanonical **225件すべて登録、漏れ0、sitemap重複0、不正URL0**。HTMLは398件、うち152件は正常なcanonical統合、21件はnoindexまたは404で除外。

**通常のCMS同期を含むproduction build／`npm run validate`は未完了**。既存のwithdrawal identity検証が記事1627で停止する。CMS APIは `https://cms.happinesea.com/experience/202107081627.html` を返す一方、承認済みwithdrawal台帳は `https://happinesea.com/experience/202107081627.html` を指定している。CMS originへの変化を無条件で許容せず、Publication Contract・withdrawal・同期処理は変更していない。この問題は本sitemap修正と独立したbuild blockerであり、CI成功やdeploy readinessは宣言しない。

通常buildの停止後、Gitの保存済み公開snapshotに対して `astro build` と既存alias後処理、sitemap verifierを実行した。live CMS再同期の成功や現在配信中artifactとの一致を証明するものではない。

## 種類別集計（修正後）

| 種類             | 生成HTML | index可能canonical | sitemap | 漏れ | sitemap重複 | canonical統合HTML | 除外HTML |
| ---------------- | -------: | -----------------: | ------: | ---: | ----------: | ----------------: | -------: |
| 商品             |       10 |                  2 |       2 |    0 |           0 |                 0 |        8 |
| マニュアル       |      164 |                 62 |      62 |    0 |           0 |                91 |       11 |
| 設計図           |       45 |                 45 |      45 |    0 |           0 |                 0 |        0 |
| ダウンロード案内 |       11 |                 11 |      11 |    0 |           0 |                 0 |        0 |
| 用語集           |        1 |                  1 |       1 |    0 |           0 |                 0 |        0 |
| サポート         |       11 |                 11 |      11 |    0 |           0 |                 0 |        0 |
| 業界・技術記事   |      129 |                 67 |      67 |    0 |           0 |                61 |        1 |
| その他           |       27 |                 26 |      26 |    0 |           0 |                 0 |        1 |
| 合計             |      398 |                225 |     225 |    0 |           0 |               152 |       21 |

分類はcanonicalの対象を優先する。移行済みマニュアルの旧記事HTMLはマニュアルへ分類。設計図は一覧1・採用39 detail・既存engineering-drawing記事5を含むため45。設計図recordに対応する既存6 download detailは設計図に数え、ダウンロード案内と二重計上しない。index可能canonicalはHTML単位の重複を除いた数であり、別々の既存canonicalを持つ解説とdownload案内を勝手に統合しない。

## 発見と最小修正

登録漏れは修正前から0件。修正前のsitemapは226件だったが、Git由来の `content_status: sample` 記事 `/insights/aircraft-engine-stop/` が1件含まれていた。本文を隠してavailability案内を表示しているのに、robots指定がWordPress側の`noindex`だけを参照していたため。

記事テンプレートのrobotsを `!isPublished || wordpressData?.noindex` で判定し、非公開状態の案内HTMLをnoindexにした。URL・canonical・availability本文は維持し、公開済み記事の扱いは変えない。`@astrojs/sitemap`の既存serializerがnoindexを読んで自動除外するため、XML列挙やconfig修正は不要。更新日・公開日は補完していない。

修正前後の全HTML SHA比較では、変わったHTMLはこのsample案内1件だけ。残る397 HTML、robots.txt、sitemap-index.xmlはbyte一致。sitemap-0.xmlからsampleの1 URLのみが減った。

## 台帳・代表URLの検証

- 商品: `/radiolink` と旧 `/radiolink/rc4gs` が登録。商品台帳のdetail 8件はmanufacturer_reviewで全件noindexを維持。catalogueのdetail未準備75件はHTML未生成であり、登録漏れではない。
- マニュアル: `/manuals/`、既存日本語publication_copy 7資料の入口・独立章HTML、およびRC4GS V2の入口・2章を検証。例 `/manuals/rc4gs-v2/chapter-01/`、`/manuals/t8fb/chapter-01/` は登録。節が章内fragmentの場合は独立HTMLではないため、fragment URLは登録しない。
- RC8X 4ページ・RC8P 6ページはmanufacturer_reviewのnoindex維持。MiniPix再構成案内1件も既存noindexを維持。
- 設計図: owner承認済み39 recordのroute全件がindex可能で、canonicalがsitemapに存在する。例 `/drawinglibrary/f16/` と旧download route。除外済み4件を復活させていない。
- ダウンロード案内: `/downloads/`、既存download endpoint、firmware案内を検証。例 `/download/rc4gs-firmware-v3-0-8`。ZIP・PDF・画像などbinary自体のsitemap登録0。
- 用語集: `/drone-rc-glossary` 登録。サポートは `/support/` と既存FAQ全件を検証。
- WordPress同期対象90記事はmanifest canonicalとRC4GS V2の移行先を照合。Git由来sample案内は修正後noindex。例 `/news/202601202187.html` は登録。
- その他: `/`、privacy等の公開静的ページを含む。404は対象外。

## QAと再現

保存済みsnapshotのproduction artifact:

```powershell
$env:PUBLICATION_MODE='production'
npx astro build
node scripts/copy-wordpress-aliases.mjs
node scripts/finalize-legacy-compatibility.mjs
node scripts/verify-sitemap.mjs
npm run test:dist
```

上記はCMS syncを含む通常buildの代替合格ではない。通常コマンドも実行し、失敗をそのまま記録する。

- sitemap verifier: XML構文・namespace・index→配下XML参照・全canonical一致・漏れ・重複・origin・robots参照がPASS。225 URL／1 chunk。staging／CMS URL 0。架空のlastmod等0。
- build-output: 36 PASS。production manifest回帰テストは39 drawing、8商品detail、既存日本語manualと独立章、RC4GS V2各節の章URL、RC8X／RC8P、glossary／FAQ／download、90記事を照合する。
- unit: 8種類の新規ページをfixtureに追加すると、既存serializerが自動採用。各種類を1件ずつsitemapから抜くmutationで、build gateが全ケース失敗することを確認。noindexは採用されない。
- 実際に一時Astro pageを追加してbuildし、sitemapが226件になり新規canonicalが自動登録されることも確認。そのpageを削除して再build後、225件に戻りbuild-output 36件が再度PASS。一時pageはcommitしない。
- sampleの新しいnoindex assertionは修正前artifactでFAIL、修正後でPASSを確認。
- 通常`npm run validate`: unit 172 PASS、Astro error 0、lint／format PASS。その後のCMS syncで記事1627のidentity不一致によりexit 1。全体PASSではない。

実装は記事robots条件のみ。`astro.config.mjs`、sitemap生成library、robots、Publication Contract、manual source、legacy URL／301、Google設定、News sitemap、CMS連携、production承認フローは変更しない。Draft PRまでとし、merge・production deployは実施しない。
