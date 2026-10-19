# 通常sitemapの網羅性確認

2026-10-19、baseline `e77923da81bca51f38398d9a44704b76ff5966a7`。対象originは `https://happinesea.com/`。全HTML・canonical・robots・sitemap XML・公開台帳を照合した。ページごとのcanonical／robots／除外理由は [全量台帳](./sitemap-production-coverage.json) を参照。

## 結果と検証範囲

通常のlive CMS同期を含むproduction artifactで、index可能なcanonical **225件すべて登録、漏れ0、sitemap重複0、不正URL0**。HTMLは398件、うち152件は正常なcanonical統合、21件はnoindexまたは404で除外。

初回は記事1627のwithdrawal identity検証で通常buildが停止した。ownerがCMSのhome/siteurl両方を `https://cms.happinesea.com` とする構成を正式に維持すると明示したため、取得元と公開URLを分離して解消した。CMS／旧公開originのHTTPS入力だけを許可し、path不一致・ID／slug／route driftは拒否する。公開canonicalはmanifest／既存台帳に固定し、CMSから推測しない。withdrawalも同じpath identity検証で維持。

通常`npm run validate`が成功した。90記事の生成データは`contract.source_url`だけCMS入力へ更新し、公開ID／slug／route／canonical・本文・画像は不変。CMS観測98投稿に対し既存inventory96件／公開manifest90件を維持し、新規2197は登録していない。Download Managerのorigin変更は2051・2035の2件だけ既存hash固定variantとして追加し、旧承認本文とのbyte一致と、別の本文変更の拒否を確認した。398 HTML・sitemap・robotsも初回snapshotとbyte一致。現在配信中artifactとの一致やdeploy readinessは別の確認事項。

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

通常の検証:

```powershell
$env:PUBLICATION_MODE='production'
npm run validate
node --test tests/cms-api.integration.mjs
```

初回調査時に使用した保存済みsnapshotのproduction artifact手順（通常buildの代替合格にはしない）:

```powershell
$env:PUBLICATION_MODE='production'
npx astro build
node scripts/copy-wordpress-aliases.mjs
node scripts/finalize-legacy-compatibility.mjs
node scripts/verify-sitemap.mjs
npm run test:dist
```

初回の通常build失敗と、identity分離後の通常build成功を区別して検証した。

- sitemap verifier: XML構文・namespace・index→配下XML参照・全canonical一致・漏れ・重複・origin・robots参照がPASS。225 URL／1 chunk。staging／CMS URL 0。架空のlastmod等0。
- build-output: 36 PASS。production manifest回帰テストは39 drawing、8商品detail、既存日本語manualと独立章、RC4GS V2各節の章URL、RC8X／RC8P、glossary／FAQ／download、90記事を照合する。
- unit: 8種類の新規ページをfixtureに追加すると、既存serializerが自動採用。各種類を1件ずつsitemapから抜くmutationで、build gateが全ケース失敗することを確認。noindexは採用されない。
- 実際に一時Astro pageを追加してbuildし、sitemapが226件になり新規canonicalが自動登録されることも確認。そのpageを削除して再build後、225件に戻りbuild-output 36件が再度PASS。一時pageはcommitしない。
- sampleの新しいnoindex assertionは修正前artifactでFAIL、修正後でPASSを確認。
- 通常production `npm run validate` PASS、Astro error 0、lint／format PASS、build-output 36 PASS。追加testを含む最終unit 175 PASS。live CMS integration 2 PASS。
- HTTP publication-origin verifier: first-party link/asset 1,449、canonical 397、legacy manual alias 23／article alias 90を検証し、broken link・canonical conflict・CMS runtime・staging残留各0。
- Drawing39件×desktop/mobile 78、47 download HTTP／SHA、画像・tag・sitemap PASS。複数のbrowser/verifierを同時実行した初回はローカル接続／画像decode失敗を観測し、他のHTTP検証完了後に無変更で再実行してPASS。assertionやtimeoutは緩和していない。
- 独立read-onlyレビュー: unresolved P0／P1／P2 0。CMS入力分離と2件のhash固定variantを確認。

実装は記事robots条件とbuild-time CMS identity分離。`astro.config.mjs`、sitemap生成library、robots、Publication Contract schema、manual source、legacy URL／301、Google設定、News sitemap、新規投稿自動採用、WordPress設定／plugin、production承認フローは変更しない。Draft PRまでとし、merge・production deployは実施しない。
