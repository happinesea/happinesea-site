# Phase 6 全残件の最終判定

2026-10-08。PR #31 merge後の `origin/main` (`e5a75f1c19e99e844d3e8f7a70b8b87068c9654d`) をbaselineとする。このbranchの候補状態であり、mainへのmerge・domain切替完了を意味しない。

## 判定と移行数

- 対象34件を全件判定：READY_AND_MIGRATE 21件、TRANSFORM_AND_MIGRATE 8件、BLOCKED_WITH_EXPLICIT_REASON 5件。
- 新規移行29件。候補の移行総数92/97（Insight adapter 87件＋既存の設計図5件）。未判定NEEDS_REVIEW 0、未処理NEEDS_TRANSFORM 0、明示BLOCKED 5。
- REST inventoryの生集計はREADY 87 / NEEDS_REVIEW 3 / NEEDS_TRANSFORM 0 / BLOCKED 7。後者の3＋2件はadapterとは別経路で公開済みの設計図5件。canonicalと静的出力を確認した上で移行総数へ含める。生集計を書き換えてgateを迂回していない。
- 既存58件のadapter生成データは完全不変。homepage layout、taxonomy、Publication Contract、WordPress runtime非依存、既存localization方式を維持。

判定・原文・HTTP・画像の公開根拠は `src/data/wordpress-phase6-decisions.json` と `tests/fixtures/wordpress-phase6-completion-review.json` に記録する。

| ID   | 最終判定                     | 確認・変換／保留理由                                                                     |
| ---- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| 2086 | READY_AND_MIGRATE            | 原文・画像・外部特許リンクを確認                                                         |
| 2079 | TRANSFORM_AND_MIGRATE        | anchor本文に明記されたYahoo URLを未解決hrefへ復元                                        |
| 2051 | TRANSFORM_AND_MIGRATE        | COOL9030 widgetを確認済み同一PDFの通常リンクへ変換                                       |
| 2035 | TRANSFORM_AND_MIGRATE        | RC6GS V3 widgetを同一PDFへ変換。RESTで取得不能の表紙は公開ページのOG画像から回復         |
| 2012 | READY_AND_MIGRATE            | 原文・画像・YouTubeを保持                                                                |
| 1998 | BLOCKED_WITH_EXPLICIT_REASON | Amazon-only manual広告。B09GYM5NCCの通常リンクを確認できない                             |
| 1947 | READY_AND_MIGRATE            | 原文・画像・外部リンクを保持。外部403は根拠に記録                                        |
| 1895 | BLOCKED_WITH_EXPLICIT_REASON | Amazon検索scriptに確認可能な通常URLがない                                                |
| 1857 | BLOCKED_WITH_EXPLICIT_REASON | Amazon製品iframe 5件に確認可能な通常URLがない                                            |
| 1758 | READY_AND_MIGRATE            | 原文・Google Trendsの図とリンクを保持                                                    |
| 1691 | READY_AND_MIGRATE            | Byme-A第6章。6モードの図を確認                                                           |
| 1687 | READY_AND_MIGRATE            | Byme-A第5章。4サーボ設定図を確認                                                         |
| 1682 | READY_AND_MIGRATE            | Byme-A第4章。2校正図を確認                                                               |
| 1679 | READY_AND_MIGRATE            | Byme-A第3章。3初期設定図を確認                                                           |
| 1675 | READY_AND_MIGRATE            | Byme-A第2章。接続端子図を確認                                                            |
| 1673 | READY_AND_MIGRATE            | Byme-A第1章。旧news-pathの入口も静的互換化                                               |
| 1627 | BLOCKED_WITH_EXPLICIT_REASON | 本文の画像1点にsrcもattachment identityもない                                            |
| 1577 | TRANSFORM_AND_MIGRATE        | 原文のamzn.toリンクの到達ASINとiframe ASINが一致。通常リンクへ変換                       |
| 1559 | READY_AND_MIGRATE            | 原文・画像・YouTubeを保持                                                                |
| 1544 | TRANSFORM_AND_MIGRATE        | 旧WordPress iframeを同じ原文リンク先の通常リンクへ変換。YouTubeは保持                    |
| 1548 | READY_AND_MIGRATE            | Mini Pix開封記事の原文・画像・動画を保持                                                 |
| 1500 | READY_AND_MIGRATE            | 原文・画像を保持                                                                         |
| 1413 | TRANSFORM_AND_MIGRATE        | 404派生画像は原文wp-image-1420とREST media 1420が一致するoriginalへ回復                  |
| 1382 | TRANSFORM_AND_MIGRATE        | HTTP参照先とHTMLが同一のHTTPS到達先を実測しhrefのみ変更                                  |
| 1350 | READY_AND_MIGRATE            | 原文・画像・外部リンクを保持                                                             |
| 1118 | READY_AND_MIGRATE            | 原文・画像を保持                                                                         |
| 1090 | READY_AND_MIGRATE            | 原文・画像・数式のsup/subを保持                                                          |
| 977  | READY_AND_MIGRATE            | 外部画像も実取得・hash・decode後にlocalize                                               |
| 943  | READY_AND_MIGRATE            | 原文・画像を保持。Reutersの外部401は根拠に記録                                           |
| 911  | READY_AND_MIGRATE            | Mini Pix概要の原文・画像を保持                                                           |
| 905  | BLOCKED_WITH_EXPLICIT_REASON | 原文の移転先 `/minipix-manual-multicopter` は404。同名の別manualとの同一性を確認できない |
| 107  | TRANSFORM_AND_MIGRATE        | JAXA HTTPリンクの実到達HTTPSを使用。図1/図2と意味のあるanchorを保持                      |
| 375  | READY_AND_MIGRATE            | 原文・画像・動画を保持。法令の現在性を新たに主張しない                                   |
| 114  | READY_AND_MIGRATE            | 原文・画像を保持。空altは実像の「低空を飛行する黄色いRC飛行機」を記述                    |

## 明示BLOCKEDとowner判断

| ID   | 必要なowner判断                                                    | cutoverへの影響                        |
| ---- | ------------------------------------------------------------------ | -------------------------------------- |
| 1998 | B09GYM5NCC等の正確な通常リンク、または広告部分の明示的な扱いの承認 | 当該旧記事URLを安全に公開できない      |
| 1895 | 確認可能な同等リンク／静的表現、または旧広告部分の削除承認         | 当該旧記事URLを安全に公開できない      |
| 1857 | 5製品それぞれの正確な通常リンク、または明示的な代替方針            | 当該旧記事URLを安全に公開できない      |
| 1627 | 欠落画像の復元元、または画像の明示的な処分判断                     | 画像を推測復元・silent removalできない |
| 905  | 旧移転先に対する同等manualの確認と公開先の承認                     | 名前だけで別manualへ誘導できない       |

全5件を候補manifestから除外し、source・理由・owner decision・cutover impactを残す。withdrawalや削除、推測redirectではない。

## Source fidelityとassets

原文の本文・slug・canonical・category順は保持。変換は確認済みliteral箇所に限り、原文hashの変更・一致箇所数の変化はbuild failureにする。WordPressのrender-context差が実測された3記事のみ、WPDM更新トークン／段落wrapperとgallery class内の生成連番を安定hashで区別する。本文、src/href、画像順、download IDの変化は拒否する。

28 featured images＋68本文画像の配置を既存pipelineでlocalize（87種類のsource URL）。原URL、SHA-256、decode、dimensions、altの対応を記録。既存非空alt 4配置は保持し、空alt 92配置は画像から確認できる内容のみ追加した。未知の画像を装飾と断定してempty altにはしていない。既存GIFのbytes／処理方式は変更しない。今回の移行対象に新規GIFはない。

download実体は既存の確認済み2ファイルを再利用し、新しい別manualへ置き換えない。

| download | local path                                           | SHA-256                                                            |
| -------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| COOL9030 | `/wp-content/uploads/2022/11/cool9030_manual_jp.pdf` | `bbe86cafd206b88932c5ad0355ebb1a5e05945bd18ecf11bb3453efa1b97dfc7` |
| RC6GS V3 | `/downloads/rc6gs-v3-manual-2032.pdf`                | `9d2c5485f2ebce5226fcf20b75a33bcc169a6305e3e3d51767aa80b0058c6737` |

COOL9030のdownload topも実際のWordPress表示DOMから静的化。pluginが空欄として処理したplaceholderに値を創作しない。metadataは取得時点の記録であり、live download counterではない。`?wpdmdl=2047` は既存のbrowser handoffを再利用する。HTTP-only query responseがPDFを返す保証ではなく、このhosting制約は残る。

外部リンクのHTTP status／final URL／content typeを実測。Flightradar24 403、Google Trendsの一回目429、Reuters 401は原リンクを保持して記録した。外部リンク全件が利用可能とは主張しない。移転先404の905はBLOCKEDとした。

## Legacy compatibilityとByme-A

87 Insightの旧 `.html` はmodern routeとbyte-identicalのexact static alias。既存設計図5件と合わせて92記事の旧canonical routeを維持し、redirectを生成しない。追加でByme-A前書きの旧 `/news/202109281673.html` 入口とCOOL9030 download topを保存する。

Byme-A 6章は6/6移行済み。章間リンク、6canonical、前書きのnews-path表記差異も検証対象。親 `/radiolink-productions-manual/byme-a-manual` は再評価したが、Amazon B09GYM5NCCの通常リンクが確認できずBLOCKEDを維持。6章の移行だけを理由に親のAmazon部分を削除していない。

## QA／独立レビュー

最終 `npm run validate`：unit 60件、Astro check、lint、repository-level Prettier、実WordPress取得、schema、静的build、build-output 24件がPASS。CMS outage fail-closed等の既存checkを維持。

最終Playwrightは70/70 PASS。全新規29記事のdesktop/mobile、追加互換入口、PDF実HTTP取得とhash、Byme-A、既存homepageを確認した。対象画面でfirst-party console error、overflow、内部リンク切れ、画像404/decode failure、canonical drift、unexpected remote image、missing downloadはいずれも0。全62記事・互換ページcaptureとhomepageのdesktop/mobile captureを実視認した。

独立レビューはsource fidelity、画像実物とalt、旧58記事の不変性、87exact aliasのbytes/canonical、PDF2件のhashを確認。指摘されたalt、COOL9030 query入口、抜粋entity表示を修正し、未解消P0/P1/P2は0。YouTube動画の実再生は未確認。外部HTTP制限、5記事とByme-A親のBLOCKED、およびDomain Cutoverの未解消事項は維持する。

## Domain Cutover

候補のlegacy inventory：1,376 URLs、preserved 223、unresolved 1,153、HTTP unknown 1,071、BLOCKED surfaces 16、old-domain-only asset candidates 621、known broken source URLs 4、recorded missing downloads 0、canonical conflicts 0。未測定部分もあるため、0という記録は全siteの不存在保証ではない。今回実参照の画像localizationと、旧asset URL全621件の互換公開は別の事項。

Domain Cutoverは **NOT READY**。

- 記事5件の未公開旧URL。
- `/radiolink` の旧landingと現Git catalogueの非同等性。catalogueは上書きしない。
- Byme-A親indexの未確認Amazon部分。
- `/style-guide` の公開価値／削除承認とURL collisionの判断。
- `/privacy-policy` の静的サイトへの適用とowner確認。
- RC6GSのHTTP-only query-download／download-tag archive互換。既存homepageのorigin/canonical gateも未解消。
- 未解消legacy surface、旧originにのみあるassets、既知source broken links。
- このDraft branchはPagesへ未deploy。baseline mainの最新runはcheck/build/deploy成功、browser-checkはhidden carousel imageのscroll timeoutで失敗。Actions定義は変更しない。

現行Pages homepageを別途desktop/mobileで開き、HTTP 200・canonical・overflow 0・first-party console error 0を確認。これは候補29記事のremote deployment検証ではない。

Phase 6の全記事最終判定は **COMPLETE_WITH_EXPLICIT_BLOCKERS**。domain切替承認ではなく、DNS/CNAME/custom domain/公開先/Search Console/Analytics/AdSenseには進まない。mergeしない。
