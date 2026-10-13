# RC8X / RC8P Webマニュアル反映レポート

判定: `RC8X_RC8P_WEB_MANUAL_PUBLICATION_READY_WITH_OPEN_ITEMS`

Draft PRのレビュー対象です。メーカー承認、公開承認、検索対象への昇格、merge、deployは行っていません。

## Source / provenance

- Source repository: `happinesea/RadiolinkManual`
- RadiolinkManual origin/main: `8b523d6e0fb0c2b5a5beec80906f43e6cd87c634`
- happinesea-site origin/main baseline: `b837b83271a53dbb32c316513c47c5086bf627f6`
- Publication build content commit: `386c2b932ce2f989649f4c4420afae58e9f08f83`
- Branch: `codex/rc8x-rc8p-full-manual-publication`
- Canonical/hash basis: UTF-8, LF normalized text. Image hashes are exact saved bytes.
- 詳細なファイルhash、PDF image placement/xref/transform、section、動画、旧anchor、同期分類は [inventory](./rc8x-rc8p-publication-inventory.json) に記録。既存provenanceのsource_repository/source_commit/sources/sha256を再利用し、新しいcontract schemaは追加していません。

| Product | Source PDF SHA-256                                                 |
| ------- | ------------------------------------------------------------------ |
| RC8X    | `b72b03b2975f30e4b0e421ed8aefbe4913a5cacab289ececca4cfd066b306368` |
| RC8P    | `8bc416963c7ce93c96cc5df362d93de14f62563e23dbc5f11b2ad45bbc19b76c` |

## Web publication

| Product | Route          | Pages | Numbered sections | Body headings | Figure placements / unique referenced files | Tables | Video blocks | Status                                 |
| ------- | -------------- | ----- | ----------------- | ------------- | ------------------------------------------- | ------ | ------------ | -------------------------------------- |
| RC8X    | /manuals/rc8x/ | 4     | 114               | 138           | 229 / 210                                   | 7      | 12           | manufacturer_review / noindex,nofollow |
| RC8P    | /manuals/rc8p/ | 6     | 43                | 51            | 102 / 98                                    | 6      | 2            | manufacturer_review / noindex,nofollow |

RC8Xはfront matter、Chapter I/II、back matterです。114 numbered sectionsを保持し、架空のChapter IIIはありません。RC8Pは入口、Chapter 1–4、support/Thanksです。RC8Pの43 numbered headingsに加え、ファームウェア/音声の手順と非番号見出しも収録しています。Body headingsは入口の目次などを含むH2–H4実測値です。

左sidebarはchapter/topicのみ、ページ内TOCはH4まで。RC8X既存chapter URLsを維持し、136旧heading anchorsと入口の`#収録内容`の計137を静的に保持しました。新たにnumber-based `section-1.2.8.1`等を追加し、入口のsemantic目次から全numbered sectionsへ到達できます。

商品ページとmanual directoryにRC8Pの日本語マニュアル導線を追加。RC8Xの一部掲載という旧案内を完全版の案内へ更新しました。商品デザイン・既存仕様値・official-site扱いは変更していません。products.jsonの他の差分はnative formatterによる整形です。

## Fidelity / assets

Translation content change = 0。技術値、UI literals、警告本文、適用条件と未解決の英語原本の矛盾を保持しています。HTMLコメント、mapping-only figure guide、原本の印刷ページ番号付き目次は利用者向け章立てに使わず、semantic目次とinline図に置き換えました。

英語正本PDFの全331 image placementsを登録済みlayout mapのslot/section順に配置。upstreamの`english_manual_layout.raw_image`を使用し、SMask、白背景、原画像の回転/反転を保持。再描画・OCR・生成画像・ダウンサンプリングはありません。Lossless WebP、native dimensions、SHA-256を保存し、重複placementは同じlocal assetを再利用します。RC8Pで同一byteだった9画像はRC8Xの保存assetを共有参照し、保存ファイルは全体299件（RC8X 210、RC8P新規89、RC8P参照先98）です。source figure IDs、出典PDF、寸法、配置を保持し、共有先のhash一致を検証します。RuntimeのRadiolink画像URL依存は0です。

既存`ManualFigure`へ寸法とsource-figure identifierを追加し、`ManualVideo`をそのまま再利用。既存Starlight calloutにcanonicalの注意/警告ラベルと本文を保持。表は13件ともHTML table、画像化なし。tableのみ横スクロールを許容し、page overflowは0です。

仕様の`121*163*209mm`、`L*W*H`、`L*1`、`HA3.0*12mm`等はliteral `*`をescapeして表示。`250mA±10mA@8.4V`等はcode markupで誤ったemail autolinkを抑止。生成HTMLの実際の表示文字列に回帰assertionを追加しました。

## YouTube inventory

| Product | Section | Source URL                                  | Video ID      | Block result     |
| ------- | ------- | ------------------------------------------- | ------------- | ---------------- |
| RC8X    | 1.2.7   | https://www.youtube.com/watch?v=6YpKuzUdwQQ | `6YpKuzUdwQQ` | ManualVideo PASS |
| RC8X    | 1.3.2   | https://www.youtube.com/watch?v=jQoF1mJWu6o | `jQoF1mJWu6o` | ManualVideo PASS |
| RC8X    | 1.3.4   | https://www.youtube.com/watch?v=uDIiyr9tmYA | `uDIiyr9tmYA` | ManualVideo PASS |
| RC8X    | 1.3.7   | https://www.youtube.com/watch?v=RA0NasTZS90 | `RA0NasTZS90` | ManualVideo PASS |
| RC8X    | 2.1.9   | https://www.youtube.com/watch?v=m00C4pvAyfI | `m00C4pvAyfI` | ManualVideo PASS |
| RC8X    | 2.1.9   | https://www.youtube.com/watch?v=W_5y_OxVn2o | `W_5y_OxVn2o` | ManualVideo PASS |
| RC8X    | 2.1.9   | https://www.youtube.com/watch?v=fIBKCq7quLY | `fIBKCq7quLY` | ManualVideo PASS |
| RC8X    | 2.1.10  | https://www.youtube.com/watch?v=pRnrocA0kKI | `pRnrocA0kKI` | ManualVideo PASS |
| RC8X    | 2.2.3   | https://www.youtube.com/watch?v=m00C4pvAyfI | `m00C4pvAyfI` | ManualVideo PASS |
| RC8X    | 2.2.9   | https://www.youtube.com/watch?v=m00C4pvAyfI | `m00C4pvAyfI` | ManualVideo PASS |
| RC8X    | 2.9     | https://www.youtube.com/watch?v=ULw-8ui4Bco | `ULw-8ui4Bco` | ManualVideo PASS |
| RC8X    | 2.11    | https://www.youtube.com/watch?v=cUAxwb3nxuw | `cUAxwb3nxuw` | ManualVideo PASS |
| RC8P    | 1.3.2   | https://www.youtube.com/watch?v=uDIiyr9tmYA | `uDIiyr9tmYA` | ManualVideo PASS |
| RC8P    | 1.3.4   | https://www.youtube.com/watch?v=uDIiyr9tmYA | `uDIiyr9tmYA` | ManualVideo PASS |

RC8X: 12 references / 10 unique video IDs。RC8P: 2 references / 1 unique ID（RC8Xとも共有）。同一動画を異なるcanonical sectionが参照する場合は各節に保持しました。全体で14 blocks / 10 unique IDs。Accidental duplicate block = 0。通常段落や通常linkとして残るraw YouTube URL = 0。Invalid URL/ID syntax = 0。動画の現在の配信可否・内容・live playbackは未確認で、代替動画を推測していません。

## QA evidence

| Check                             | Result | Scope/count                                                                                        |
| --------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| npm run validate                  | PASS   | 134 unit, Astro check, lint, format, staging build, 32 built-output tests                          |
| Final unit                        | PASS   | 134 / 0 failed                                                                                     |
| Astro check                       | PASS   | 160 files, 0 errors/warnings/hints                                                                 |
| Lint / format                     | PASS   | Repository native commands                                                                         |
| Production build                  | PASS   | production origin=https://happinesea.com, base=/                                                   |
| Staging build                     | PASS   | staging origin=https://happinesea.github.io, base=/happinesea-site                                 |
| Final built-output tests          | PASS   | 32 per publication mode; headings, hashes, literal specs, deep TOC, figures, tables, videos, links |
| New full-manual browser scenarios | PASS   | 22 staging + 22 production = 44; desktop/mobile, 10 manual routes, index and both product links    |
| Existing manual regression        | PASS   | 28 desktop/mobile scenarios; 26 passed plus corrected preview directory-request test's 2 passed    |
| Total scoped browser scenarios    | PASS   | 72                                                                                                 |
| Local HTML references             | PASS   | 1860 reference occurrences / 732 unique local targets; all resolve, including fragments            |
| Image assets                      | PASS   | 299 exact saved-file hashes, 331 rendered placements; all decode on both devices                   |
| Videos                            | PASS   | 14 expected blocks, valid IDs, responsive 16:9, lazy iframe, no autoplay                           |
| Legacy fragments                  | PASS   | 137 old RC8X anchors + new stable section anchors                                                  |
| Missing / broken local assets     | PASS   | 0                                                                                                  |
| Console/page errors               | PASS   | 0 in scoped browser tests                                                                          |
| Page horizontal overflow          | PASS   | 0 on desktop/mobile                                                                                |
| Independent review                | PASS   | P0=0, P1=0; read-only source/content, figures, warnings, metadata, regression tests                |

正式native validate後の最終literal-symbol/TOC markup変更は、unit、check、lint、format、両Astro/post-build pipeline、32 built-output testsと両モードのbrowserで再検証しました。PR CIは最終headで`npm run validate`を再実行します。Build時のWordPress同期はread-onlyで、生成された無関係な記事データは元に戻し、差分0を確認しました。

BrowserのYouTube iframe responseはfixtureに置き換えています。これはlocal iframe URL/配置/比率/overflowを検証するためで、外部playerの再生成功を示しません。画像、local scripts、CSS、navigation、tablesは実際の生成物を使っています。全サイトの全E2E suiteの合格を主張せず、今回のmanual/index/product導線と既存manual suiteが対象です。

## Existing manual regression

RC4GS V2（入口、2 chapters、旧URL mappings）、RC4GS V3、RC6GS V3 Full/Quick Reference、RC8X Quick Reference、T8FB、Byme-A V2、Byme-Dのsemantic chapter routes、sidebar、TOC、images、legacy fragments、no-CMS-runtime、mobile overflowを既存suiteで確認しました。除外中のRC4GS legacy routeも生成されないままです。

既存RC4GS compatibility testはAstro previewでdirectory URLを末尾slash付きで要求するよう修正。公開route/redirect/製品内容は変更していません。

## External / review-dependent open items

- Manufacturer confirmation of upstream contradictions and applicability, current firmware/UI/revision confirmation.
- Source QR destinations and current video availability/content verification.
- Manufacturer/publication approval. Both manuals remain manufacturer_review and noindex,nofollow.
- Knowledge/claim validation and Agent-ready promotion are outside this publication copy task; no changes.

## Reconciliation

KEEPはcanonical本文が既存siteに既に一致する箇所です。図、動画、literal symbol表示等のpublication markupは必要に応じて同期しました。UPDATEは既存本文がoutdated/partial、ADDは既存route/sectionが欠ける箇所。新しい技術解釈による翻訳変更はありません。

### RC8X

| Section                       | Existing site                                          | New canonical                                          | Action          |
| ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------ | --------------- |
| 1.1                           | already current                                        | 1.1 安全上の注意                                       | KEEP            |
| 1.1.1                         | already current                                        | 1.1.1 送信機の安全ガイドライン                         | KEEP            |
| 1.1.2                         | already current                                        | 1.1.2 SDカードの安全ガイドライン                       | KEEP            |
| 1.2                           | already current                                        | 1.2 RC8Xの概要                                         | KEEP            |
| 1.2.1                         | already current                                        | 1.2.1 特長                                             | KEEP            |
| 1.2.2                         | already current                                        | 1.2.2 仕様                                             | KEEP            |
| 1.2.3                         | already current                                        | 1.2.3 パッケージ内容                                   | KEEP            |
| 1.2.4                         | outdated/partial                                       | 1.2.4 ボタンの概要                                     | UPDATE          |
| 1.2.5                         | already current                                        | 1.2.5 ボタン名称                                       | KEEP            |
| 1.2.6                         | outdated/partial                                       | 1.2.6 2ポジションスイッチ                              | UPDATE          |
| 1.2.7                         | already current                                        | 1.2.7 3ポジションスイッチ                              | KEEP            |
| 1.2.8                         | already current                                        | 1.2.8 送信機の電源を入れる前の準備                     | KEEP            |
| 1.2.8.1                       | already current                                        | 1.2.8.1 送信機の電源                                   | KEEP            |
| 1.2.8.2                       | outdated/partial                                       | 1.2.8.2 送信機の電源を入れる                           | UPDATE          |
| 1.2.8.3                       | already current                                        | 1.2.8.3 言語選択                                       | KEEP            |
| 1.2.9                         | already current                                        | 1.2.9 アイコンの概要                                   | KEEP            |
| 1.2.10                        | already current                                        | 1.2.10 送信機低電圧アラーム                            | KEEP            |
| 1.2.11                        | outdated/partial                                       | 1.2.11 対応受信機                                      | UPDATE          |
| 1.3                           | already current                                        | 1.3 受信機の概要                                       | KEEP            |
| 1.3.1                         | already current                                        | 1.3.1 R8FGの特長                                       | KEEP            |
| 1.3.2                         | already current                                        | 1.3.2 バインド                                         | KEEP            |
| 1.3.3                         | already current                                        | 1.3.3 受信機の接続                                     | KEEP            |
| 1.3.3.1                       | outdated/partial                                       | 1.3.3.1 ケーブル接続                                   | UPDATE          |
| 1.3.3.2                       | outdated/partial                                       | 1.3.3.2 テレメトリー用R8FGの正しい接続方法             | UPDATE          |
| 1.3.3.3                       | already current                                        | 1.3.3.3 モデル低電圧アラーム設定                       | KEEP            |
| 1.3.4                         | already current                                        | 1.3.4 R8FGの動作モード                                 | KEEP            |
| 1.3.5                         | already current                                        | 1.3.5 R8FGのジャイロ機能                               | KEEP            |
| 1.3.6                         | already current                                        | 1.3.6 受信機アンテナの取り付け                         | KEEP            |
| 1.3.7                         | already current                                        | 1.3.7 RSSI試験                                         | KEEP            |
| 2.1                           | already current                                        | 2.1 システムメニュー（System menu）                    | KEEP            |
| 2.1.1                         | already current                                        | 2.1.1 言語（Language）                                 | KEEP            |
| 2.1.2                         | already current                                        | 2.1.2 Theme setting                                    | KEEP            |
| 2.1.3                         | already current                                        | 2.1.3 バックライト（Backlight）                        | KEEP            |
| 2.1.4                         | already current                                        | 2.1.4 サウンド（Sound）                                | KEEP            |
| 2.1.5                         | already current                                        | 2.1.5 バッテリー（送信機バッテリー電圧）               | KEEP            |
| 2.1.6                         | already current                                        | 2.1.6 Vibration setting                                | KEEP            |
| 2.1.7                         | already current                                        | 2.1.7 LED setting                                      | KEEP            |
| 2.1.8                         | already current                                        | 2.1.8 HOME button setting                              | KEEP            |
| 2.1.9                         | already current                                        | 2.1.9 External input output                            | KEEP            |
| 2.1.10                        | outdated/partial                                       | 2.1.10 校正（Calibration）                             | UPDATE          |
| 2.1.11                        | already current                                        | 2.1.11 Information                                     | KEEP            |
| 2.2                           | already current                                        | 2.2 基本メニュー（Basic menu）                         | KEEP            |
| 2.2.1                         | already current                                        | 2.2.1 チャンネルリバース（Channel reverse）            | KEEP            |
| 2.2.2                         | already current                                        | 2.2.2 チャンネルディレイ（Channel Delay）              | KEEP            |
| 2.2.3                         | already current                                        | 2.2.3 エンドポイント調整（EPA）                        | KEEP            |
| 2.2.4                         | already current                                        | 2.2.4 サブトリム（Sub trim）                           | KEEP            |
| 2.2.5                         | already current                                        | 2.2.5 Channel setting                                  | KEEP            |
| 2.2.6                         | already current                                        | 2.2.6 Channel limiter                                  | KEEP            |
| 2.2.7                         | outdated/partial                                       | 2.2.7 Trim/Dial select                                 | UPDATE          |
| 2.2.8                         | outdated/partial                                       | 2.2.8 Switch select                                    | UPDATE          |
| 2.2.9                         | outdated/partial                                       | 2.2.9 デュアルレート（Double Ratio）                   | UPDATE          |
| 2.2.10                        | already current                                        | 2.2.10 フェイルセーフ（Fail-safe）                     | KEEP            |
| 2.2.11                        | outdated/partial                                       | 2.2.11 Receiver setting                                | UPDATE          |
| 2.2.12                        | already current                                        | 2.2.12 Subsidiary ID mode                              | KEEP            |
| 2.3                           | already current                                        | 2.3 テレメトリー設定（Telemetry setting）              | KEEP            |
| 2.3.1                         | already current                                        | 2.3.1 Receiver signal                                  | KEEP            |
| 2.3.2                         | already current                                        | 2.3.2 Transmitter voltage                              | KEEP            |
| 2.3.3                         | already current                                        | 2.3.3 Receiver voltage                                 | KEEP            |
| 2.3.4                         | already current                                        | 2.3.4 Engine battery voltage                           | KEEP            |
| 2.3.5                         | already current                                        | 2.3.5 Telemetry broadcast                              | KEEP            |
| 2.4                           | already current                                        | 2.4 レーシングメニュー（Racing menu）                  | KEEP            |
| 2.4.1                         | outdated/partial                                       | 2.4.1 ステアリングカーブ（Steering curve）             | UPDATE          |
| 2.4.2                         | outdated/partial                                       | 2.4.2 スロットルカーブ（Throttle curve）               | UPDATE          |
| 2.4.3                         | already current                                        | 2.4.3 ブレーキカーブ（Brake curve）                    | KEEP            |
| 2.4.4                         | outdated/partial                                       | 2.4.4 Acceleration                                     | UPDATE          |
| 2.4.5                         | already current                                        | 2.4.5 Steering delay                                   | KEEP            |
| 2.4.6                         | outdated/partial                                       | 2.4.6 Throttle delay                                   | UPDATE          |
| 2.4.7                         | already current                                        | 2.4.7 クルーズコントロール（Cruise Control）           | KEEP            |
| 2.4.8                         | already current                                        | 2.4.8 Idle up                                          | KEEP            |
| 2.4.9                         | outdated/partial                                       | 2.4.9 Throttle Setting (Trigger)                       | UPDATE          |
| 2.4.10                        | already current                                        | 2.4.10 Traction control (T.R.C)                        | KEEP            |
| 2.4.11                        | already current                                        | 2.4.11 A.B.S                                           | KEEP            |
| 2.4.12                        | already current                                        | 2.4.12 Motor Start                                     | KEEP            |
| 2.4.13                        | already current                                        | 2.4.13 Engine cut                                      | KEEP            |
| 2.5                           | already current                                        | 2.5 ミキシングメニュー（Mixing menu）                  | KEEP            |
| 2.5.1                         | already current                                        | 2.5.1 Steering mixing                                  | KEEP            |
| 2.5.2                         | outdated/partial                                       | 2.5.2 Brake mixing                                     | UPDATE          |
| 2.5.3                         | already current                                        | 2.5.3 Gyro mixing                                      | KEEP            |
| 2.5.4                         | already current                                        | 2.5.4 4WS mixing                                       | KEEP            |
| 2.5.5                         | outdated/partial                                       | 2.5.5 Dual ESC mixing                                  | UPDATE          |
| 2.5.6                         | outdated/partial                                       | 2.5.6 CPS mixing                                       | UPDATE          |
| 2.5.7                         | already current                                        | 2.5.7 Tank mixing                                      | KEEP            |
| 2.5.8                         | already current                                        | 2.5.8 プログラマブルミキシング（Programmable mixing）  | KEEP            |
| 2.5.9                         | already current                                        | 2.5.9 Tilt mixing                                      | KEEP            |
| 2.6                           | already current                                        | 2.6 ツールメニュー（Tools menu）                       | KEEP            |
| 2.6.1                         | already current                                        | 2.6.1 Screenshot setting                               | KEEP            |
| 2.6.2                         | already current                                        | 2.6.2 タイマー（Timer）                                | KEEP            |
| 2.6.3                         | already current                                        | 2.6.3 Roll out chart                                   | KEEP            |
| 2.6.4                         | already current                                        | 2.6.4 Gear ratio chart                                 | KEEP            |
| 2.7                           | already current                                        | 2.7 モデル選択（Model select）                         | KEEP            |
| 2.7.1                         | already current                                        | 2.7.1 Model select                                     | KEEP            |
| 2.7.2                         | already current                                        | 2.7.2 Copy model/Paste model                           | KEEP            |
| 2.7.3                         | already current                                        | 2.7.3 Rename model                                     | KEEP            |
| 2.7.4                         | already current                                        | 2.7.4 Reset model                                      | KEEP            |
| 2.7.5                         | already current                                        | 2.7.5 Delete model                                     | KEEP            |
| 2.7.6                         | already current                                        | 2.7.6 Model data copy                                  | KEEP            |
| 2.8                           | already current                                        | 2.8 SD Card Folder                                     | KEEP            |
| 2.8.1                         | outdated/partial                                       | 2.8.1 SD Card Folder Name Introduction                 | UPDATE          |
| 2.8.2                         | already current                                        | 2.8.2 SD Card Files Copy Methods                       | KEEP            |
| 2.8.3                         | already current                                        | 2.8.3 Note for SD card content modification            | KEEP            |
| 2.9                           | already current                                        | 2.9 Modifying for Left-hand Use                        | KEEP            |
| 2.9.1                         | already current                                        | 2.9.1 Remove the Wheel                                 | KEEP            |
| 2.9.2                         | already current                                        | 2.9.2 Remove the Wheel Installation Port Cover         | KEEP            |
| 2.9.3                         | already current                                        | 2.9.3 Install Wheel                                    | KEEP            |
| 2.9.4                         | outdated/partial                                       | 2.9.4 Install the Wheel Installation Port Cover        | UPDATE          |
| 2.10                          | already current                                        | 2.10 Wheel or Trigger Mechanical Adjustment            | KEEP            |
| 2.10.1                        | already current                                        | 2.10.1 Trigger brake lever adjustment                  | KEEP            |
| 2.10.2                        | already current                                        | 2.10.2 Trigger tension screw adjustment                | KEEP            |
| 2.10.3                        | outdated/partial                                       | 2.10.3 Trigger slide adjustment                        | UPDATE          |
| 2.10.4                        | outdated/partial                                       | 2.10.4 Wheel tension screw adjustment                  | UPDATE          |
| 2.11                          | already current                                        | 2.11 ファームウェア更新（Firmware Update）             | KEEP            |
| 2.11.1                        | already current                                        | 2.11.1 Methods for Firmware Copy                       | KEEP            |
| 2.11.2                        | already current                                        | 2.11.2 Methods for Firmware Upgrade                    | KEEP            |
| 2.12                          | already current                                        | 2.12 カスタム音声の作成（Customized Voice Production） | KEEP            |
| front/back matter             | partial                                                | intro, semantic TOC, support and Thanks                | ADD             |
| publication-only introduction | publication-only wording / outdated source attribution | canonical full English source translation              | REMOVE_OBSOLETE |

### RC8P

| Section           | Existing site | New canonical                                     | Action |
| ----------------- | ------------- | ------------------------------------------------- | ------ |
| 1.1               | missing       | 1.1 安全上の注意                                  | ADD    |
| 1.2               | missing       | 1.2 RC8Pの概要                                    | ADD    |
| 1.2.1             | missing       | 1.2.1 仕様                                        | ADD    |
| 1.2.2             | missing       | 1.2.2 同梱品                                      | ADD    |
| 1.2.3             | missing       | 1.2.3 RC8Pの概要                                  | ADD    |
| 1.2.4             | missing       | 1.2.4 RC8Pの電源                                  | ADD    |
| 1.2.5             | missing       | 1.2.5 送信機の基本操作                            | ADD    |
| 1.2.6             | missing       | 1.2.6 RC8Pの電源を入れる                          | ADD    |
| 1.2.7             | missing       | 1.2.7 言語選択                                    | ADD    |
| 1.2.8             | missing       | 1.2.8 送信機低電圧アラーム                        | ADD    |
| 1.3               | missing       | 1.3 R8FGの概要                                    | ADD    |
| 1.3.1             | missing       | 1.3.1 R8FGの特長                                  | ADD    |
| 1.3.2             | missing       | 1.3.2 バインド                                    | ADD    |
| 1.3.3             | missing       | 1.3.3 受信機の接続                                | ADD    |
| 1.3.4             | missing       | 1.3.4 R8FGの動作モード                            | ADD    |
| 1.3.5             | missing       | 1.3.5 R8FGのジャイロ機能                          | ADD    |
| 1.3.6             | missing       | 1.3.6 受信機アンテナの取り付け                    | ADD    |
| 1.3.7             | missing       | 1.3.7 RSSIテスト                                  | ADD    |
| 2.1               | missing       | 2.1 システム設定（SYSTEM SETTING）                | ADD    |
| 2.2               | missing       | 2.2 モデル管理（MODEL）                           | ADD    |
| 2.3               | missing       | 2.3 リバース（REVERSE）                           | ADD    |
| 2.4               | missing       | 2.4 AUXチャンネル（AUX CH）                       | ADD    |
| 2.5               | missing       | 2.5 スイッチ音声（SW AUDIO）                      | ADD    |
| 2.6               | missing       | 2.6 エンドポイント調整（END POINTS）              | ADD    |
| 2.7               | missing       | 2.7 RF設定（RF SETTING）                          | ADD    |
| 2.8               | missing       | 2.8 サブID（Sub ID）                              | ADD    |
| 2.9               | missing       | 2.9 アラーム設定（ALARM）                         | ADD    |
| 2.10              | missing       | 2.10 トリム（TRIMS）                              | ADD    |
| 2.11              | missing       | 2.11 フェイルセーフ（FAIL SAFE）                  | ADD    |
| 2.12              | missing       | 2.12 チャンネル速度（CH SPEED）                   | ADD    |
| 2.13              | missing       | 2.13 チャンネルホールド（CHANNEL HOLD）           | ADD    |
| 2.14              | missing       | 2.14 コンディション（CONDITIONS）                 | ADD    |
| 2.15              | missing       | 2.15 ジャイロ（GYRO）                             | ADD    |
| 2.16              | missing       | 2.16 ステアリングカーブ（STEERING CURVE）         | ADD    |
| 2.17              | missing       | 2.17 スロットルカーブ（THROTTLE CURVE）           | ADD    |
| 2.18              | missing       | 2.18 ブレーキカーブ（BRAKE CURVE）                | ADD    |
| 2.19              | missing       | 2.19 ABS機能（A.B.S.）                            | ADD    |
| 2.20              | missing       | 2.20 プログラマブルミキシング（PROGRAMMABLE MIX） | ADD    |
| 2.21              | missing       | 2.21 トレーナー（TRAINER）                        | ADD    |
| 2.22              | missing       | 2.22 校正（CALIBRATION）                          | ADD    |
| 2.23              | missing       | 2.23 タイマー（TIMER）                            | ADD    |
| 2.24              | missing       | 2.24 センサー音声通知（SENSOR BROADCAST）         | ADD    |
| 2.25              | missing       | 2.25 スイッチ設定（SWITCH SETTING）               | ADD    |
| front/back matter | missing       | intro, semantic TOC, support and Thanks           | ADD    |

PRはDraftとして作成し、merge/deployは行いません。最終PR URL、head SHA、CI、mergeabilityはPRと最終回答に記録します。
