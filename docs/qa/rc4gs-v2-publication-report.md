# RC4GS V2 日本語マニュアル公開準備・QA

## 収録・出典

公開先は `/manuals/rc4gs-v2/` と `chapter-01/`、`chapter-02/`。既存Astro/Starlight、検索・目次・sidebarを使用する。V2を明記し、V3以降と非公式サポート資料の境界を案内する。他製品本文を変更していない。

旧総覧921、旧総覧188、カテゴリ20をlive CMSから確認した。カテゴリの29記事だけで完了とせず、総覧にあるカテゴリ外の160（firmware）/47（ATL）も含めて30記事を収録した。第1章5節、第2章22節、受信機の3小節とPMIXの3小節、計33項目。カテゴリ一覧に含まれる製品/ニュースを追加で自動移行していない。

本文図26点＋カバー1点＝27点。既存localized WebPと既存altをそのまま再利用した。元URL・元画像SHA-256・ローカル画像SHA-256は `src/data/manuals/rc4gs-v2.json` に記録。元画像27点を既存source-origin resolver経由でCMSからHTTP取得し、全source hash一致を確認した。画像実物のcontact sheetも確認した。新しい画像・alt・downloadを推測生成していない。

## 日本語QAと技術的保留

Radiolink Manual Translation Skill v0.3、既存翻訳標準・用語集・日本語style/QAを使用した。MODE_CONVERSION=DISABLED。助詞、文法、押下→押す、デュアルレート、デューティ比、誤字、操作文について125件の変更記録（計178箇所）を作成した。変更前後はJSONの `changes` に記録する。HTML text nodeのみ校正し、画像属性/alt・順序・captionを変更していない。

自動QA: 全30記事のsource SHA-256、出版本文SHA-256、数値列、英字UI/技術表記列、画像・caption列一致がPASS。全本文を確認したが、不整合のある技術記述は推測訂正せず、各該当節に注意を置いた。日本語保全QA PASSはメーカー仕様確認PASSを意味しない。

Open ItemsはJSONの `open_items` 18件。電源範囲/電池条件、受信機の電源投入順序、R6GF表記、4分の低電圧時間、EAP/EPA、STEXP初期値、REV/ATLのコピーされた手順、STM/ABP、ARARM、PMIXのTH/STとマスター/スレーブ、AUXチャンネル、Streering UI、ACCEL見出し、バッテリーMODE等。安全上疑わしい操作をそのまま実行しない旨を明示し、数値や仕様を変更していない。技術確認はV2実機/メーカーV2資料による別レビューが必要。

## 旧URL・canonical・301

[対応表](./rc4gs-v2-url-map.md)は91件。新ページは各publication modeの自己参照canonical。対象旧表示は新章/indexへcanonicalと案内リンクを向け、本文snapshot・migration manifestのsource canonical/hashは維持する。旧記事本文中の確認済みリンクと旧固定ページの内部リンクを新しい章節へ向ける。旧手動index/カテゴリ/旧記事の非canonical URLは自動sitemapから除外される。

WordPress側は別所有repoの連携Draft PRで、default-offのHTTP 301、廃止meta、実有効化日の記録、公開200/canonical/anchor確認、core/Yoast sitemap除外とrollbackを準備した。本番WordPressに適用していない。

**GitHub Pagesは静的配信であり、WordPress側の301はpublic originのPagesへ届く要求を捕捉しない。** Public側の旧URLは現時点の実装では200の互換ページで、301ではない。Public HTTP 301はowner-controlledなredirect-capable hosting/edgeでの別適用判断と公開後確認が必要。DNS/ドメイン/本番deploy/mergeは行っていない。

## QA evidence

- 新マニュアルのstaging/production静的build、alias生成、legacy asset hash、sitemap検証: PASS。
- Unit 108 PASS、Astro check 0 errors/warnings/hints、lint/format PASS。新テストはsource/UI/数値/画像/alt/caption/URL mapping、27ローカル画像hashを検証。
- Staging build-output tests: 28 PASS。
- Desktop/mobile: index・全章、全source section、受信機4分割、全91旧URLのcanonical、内部リンクHTTP、画像decode、console/runtime CMS/overflowを検証。実captureを確認。Production対象14件と既存公開面smoke20件PASS。Stagingでは95記事とlegacyを含む358ケースを実行し356 PASS、ローカルHTTP接続/画像decode失敗2件は同じassertionの単独再実行で2 PASS。その後、新manual8件も全件PASS。Astro previewの末尾slashなし404はPages同等のdirectory redirectを持つ静的HTTPサーバーで検証し、公開コード・assertionを緩めていない。
- Production publication-origin verifier: HTML306、canonical/OG305、first-party HTTP830、download URL/hash43、manual alias23、article alias90。broken links/assets、canonical conflicts、CMS runtime、staging残存は0。既存RC8X asset生成は現行workflowと同じ `assets:sync` を実行し、他製品の生成物はこのPRへ含めない。
- 既存95 source本文/metadata/画像を変更していない。新旧production出力比較では、非対象59記事＋設計図5件のHTMLは共通CSSのcontent-hash filename以外一致。対象31記事のみcanonical/移行案内/確認済み内部hrefを意図して変更した。Download19payloadのSHA-256は不変、再利用画像27byte hash一致。RC8Xの追加sidebar入口は意図した共通navigation変更であり、本文変更ではない。
- 独立read-onlyレビュー: P0/P1なし、WP側P2（受信機小節hash/移行日再実行）2件を修正し回帰テストPASS。

`npm run validate` はunit/check/lint/formatを通過した後、**既存CMS source review gateがarticle2086でdriftを検出し停止**した。hashは `ccbeadcfaac96cc3a65f1974c4d5527d478f65cff1a81ca392f0e2ee19f5bdfd`。このPRはgateや2086を変更していない。対象マニュアル30記事のlive正規化本文照合はPASS。CMS siteurl変更に伴うfeatured image origin差分も既存gateが検出するため、無関係なreviewを自動更新していない。保存済み公開データによるbuild QAと、live全記事validateを区別する。**validate全体PASS・本番公開済みとは報告しない。**

## 本番公開前の残作業

1. 既存live CMS driftをownerの正規レビューで解消する（gateを弱めない）。
2. 必要なV2技術Open Itemsの確認と公開判断。
3. 連携Draft PRをownerがreview/mergeし、新manualをdeployして200/canonical/画像/リンクを確認。
4. WordPress廃止meta/301を公開確認後にownerが有効化。public originのHTTP 301層は別owner判断。

本PRに翻訳システム新設・新依存・WordPress本文変更・他製品本文変更はない。
