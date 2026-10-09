# Domain Cutover legacy compatibility — PR #39後の再監査

## 判定と基準

**Domain Cutover: NOT READY。** 対象は merge 済み最新main `b501c7fac4a935f91422f6409a382565316c5310`。2026-10-09の実測結果は [監査JSON](audits/current-legacy-reaudit.json) に保存した。新規互換実装・コンテンツ変更・assetコピー・公開設定変更は行っていない。

[main workflow](https://github.com/happinesea/happinesea-site/actions/runs/37869333620) の check/build/deploy は成功。Pagesへ実配信されたHTML 272 routeをGETし、現行mainのstatic buildとcanonicalを照合した。browser-checkはhomeのdesktop/mobileで全imgへのscroll待ちtimeoutにより2件失敗。testが非表示carousel画像も対象にする点が原因候補であり、今回browser testは変更していない。deploy成功とworkflow全体成功を区別する。

以前の「旧WordPress HTMLにも参照があるから必須」という基準は使用しない。現行配信HTMLのnavigation/runtime参照を基点とし、そこから実際に使われるdownload入口だけを追加調査した。旧本文・REST mediaだけに現れるURLは現行サイト必須としない。ORPHAN/DERIVATIVEはこの観測範囲での分類であり、削除承認や外部被リンク不存在の保証ではない。

## Fresh counts

| 項目                                     |                 今回の実測 |
| ---------------------------------------- | -------------------------: |
| 歴史的発見inventory                      |                  1,376 URL |
| 現行HTMLから新たに発見                   |       1 URL (`/wp-admin/`) |
| 分類総数                                 |                  1,377 URL |
| ALREADY_RESOLVED                         |                        333 |
| REQUIRED_FOR_CUTOVER（navigation）       |                         32 |
| SAFE_TO_RETIRE（明示owner decision）     | 2 (`1627`, `/style-guide`) |
| ORPHAN                                   |                        741 |
| DERIVATIVE                               |                        264 |
| UNKNOWN_OWNER_DECISION                   |                          5 |
| 現行HTMLからのold-origin参照             |                    130 URL |
| 切替先に対応routeがないold-originリンク  |                     34 URL |
| 未解消old-origin runtime asset           |                          0 |
| 追加調査で判明した未公開download payload |                      1 ZIP |

**root/base/canonical以外の残作業は35対象**：必要なnavigation 32 URL、不要リンク整理2 URL、別hashのdownload payload 1件。URL数と原因グループ数は異なる。同一記事への複数の表示箇所はURL単位で重複排除した。未参照のowner-decision asset 4件は必須blockerへ加算しない。

333件のALREADY_RESOLVEDには「旧pathそのものがstaticに存在」と「旧source画像が既存localizationで置換済み」の両方がある。JSONでは `target_route` と `localized_source_target` を分け、後者をexact旧URL互換とは扱わない。現行HTMLで使われる旧URLについては、localizationの有無だけで解決扱いにせず実Pages counterpartを検証した。query URLは承認済みstatic案内の可用性であり、query-to-binary動作の再現ではない。未参照の旧 `?p=` permalink 21件は、rootが200でも同等記事へ到達した証拠にならないためORPHANとした。実装・削除の承認ではない。

以前のold-origin asset候補621 URLも現行参照集合と照合し直した結果、ALREADY_RESOLVED 91 / ORPHAN 262 / DERIVATIVE 264 / UNKNOWN_OWNER_DECISION 4となった。現行runtime不足は0。これらに、今回追加調査で見つかった別hashのquery ZIP 1件を混ぜない。

## 対応推奨（今回は実装しない）

| 対象                                           |        数 | 観測結果と推奨                                                                                                                                                            |
| ---------------------------------------------- | --------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RC4GS manual旧alias + Mini Pix旧alias          |    23 URL | 旧originがredirectする実到達先はすべてPages上でも200。対応する既存記事へのリンク修正、または確認済みaliasのstatic互換を別bounded taskで行う。名前からmanualを推定しない。 |
| download/document-tag archive                  |     5 URL | 旧originは200、Pagesは404。RC6GS tagを含む。既存downloadだけのstatic一覧/入口が可能。異なるtagを一律同じPDFへredirectしない。                                             |
| RC4GS firmware入口                             |     2 URL | 旧ページ200、Pages404。後述の実体・hashを維持するstatic案内が必要。旧PHP/queryは再現しない。                                                                              |
| `/r6dsm-manual`, `/minipix-manual-multicopter` |     2 URL | 旧originも404。manual親indexに残るリンクを確認済みの既存routeへ修正可能か、既存データと照合する。推測redirect・架空manualは不可。                                         |
| retired 1627へのarchiveリンク                  |     1 URL | 旧originにはまだ本文があるが、新サイト404はowner-approved。記事を復活させず、`/blog/page/3/`・`/category/experience/`の掲載リンクだけ整理する。                           |
| `/sample-page/`から`/wp-admin/`                |     1 URL | CMS管理画面は公開static互換対象ではない。WordPress runtimeを導入しない。デモ文面中の管理導線を外す扱いをowner decisionとして分離。                                        |
| V6.0.1日本語変更履歴付きZIP                    | 1 payload | 実queryから取得成功。既存ZIPとbyte/hashが異なるため統合しない。literal receipt/hashに固定して別static assetへ保存する候補。                                               |

UNKNOWN_OWNER_DECISION 5件は、未公開log/spreadsheet 4件と上記管理導線1件。前者は今回の配信HTMLから参照されず、公開する判断がない限りcutover必須ではない。後者は公開コンテンツの復元ではなく不要導線の処置判断である。

## Downloads・hash

18 permanent payload URL + 24既存static URL = **42 GET、全200、全SHA-256一致**。18 distinct hashで、同一payloadのaliasは意図した重複。さらにRC4GS firmware原media ZIP 2件を旧origin/Pages双方でGETし、保存済みhashと一致した。これらは既にstatic公開されているが、旧download入口2 routeは欠けている。

V6.0.1 query ZIPは75,113 bytes、SHA-256 `1a7dec9ec4990dff69e1312f9f6c99bab3e6b8702a80f67b5edb1ac11a7cf024`。保存済み原media ZIPは77,117 bytes、`3807bccee5d12bb883d737ab09ec3cbe0bb28230aff76389ac8647454dbfd7ed`。メモリ上でZIP内ファイルも確認した。BIN (`e118c35a8ae808851120227e514321cd7771dd8f378949c6af0e06cfb73bd707`) とMAC (`2af0cd742dc41c86a880e9cfe6af1e8155d252fdb0aea3093beba8647471da23`) は一致するが、日本語変更履歴473 bytes (`0b3256f8eac054b2d66ab0d598ab75e9a00a457b879937358731bad599e43131`) と原ZIPの説明403 bytes (`1de4907bf815f9238699fb54886a540850deb18a53d6b710bb60ca6de9e3426c`) は異なる。ZIP全体を同一物とみなさない。

V3.0.8 queryはHTTP 200でも `text/html`、本文は `No file is attached with this package!`。成功downloadではない。原media ZIPは34,067 bytes、`ed0e198286a74a53f9252a22cfc2ba9b92f3c3b4072e5d3894956e0a55a6f532` で旧origin/Pages双方に実在。案内を作る際は確認済み原mediaの扱いを明示し、壊れたqueryをbinary成功扱いにしない。

## 前監査からの変化

前監査の未解消navigation 39 URLから、1998/1895/1857/Byme-A親の**4 URLは今回200で解決を確認**。905は現行配信HTMLから参照されなくなった1 URLであり、復元による解決とは区別する。残counterpart 404は34 URL。旧267 required assetsは旧WordPress本文も参照集合へ含めた値なので、今回の0 runtime不足へ単純に「267件移行完了」とは計上しない。

`/radiolink`新hub、Byme-A親、privacy policy、95記事（90 insights + 5 drawings）のstatic routeは存在する。style-guideと1627は廃止方針を維持。RC6GS query案内/保存済みPDFと、未実装のRC6GS tag archiveは別対象である。

## QAと境界

- 実Pages HTML 272 route: 200、main buildとのcanonical差分0。canonical aliasの意図した重複を新規conflictとは数えない。rootのcanonicalはまだPages originであり、public origin/baseの切替gateは別途未完了。
- 現行Pages内のnavigation/runtime HTTP failure 0。旧origin向けリンクには現在既に404の2 URLと、切替後404になる34 URLがある。「全first-partyリンク問題0」とは主張しない。
- 配信CSS 3件の `url()` はdata URIのみ。local出力HTML/JSにCMS hostname/WordPress REST runtime依存は見つからない。任意のJS動的ネットワークの全経路・外部被リンクは未網羅。
- 現行main static build/alias/finalize成功、unit 77件、lint、repository formatを検証。fresh main workflowのcheck/buildは成功。audit-onlyなのでlocal live-syncを含む `npm run validate` 全体の再実行は行っていない。
- Collectorは `CUTOVER_RUN_ID` が同じorigin/main SHAのdeploy成功を示すこと、fresh distの `.audit-baseline` stampを検証する。historical evidenceファイルは上書きせず、source/rendering/download pipelineは変更しない。
- 旧sourceの初回5 timeoutもJSONに残し、再GET結果を `source_rechecks` に追記した。manual alias 4件は再確認で旧source/Pages実到達先とも200、管理入口も旧source200だった。実測404のmanual 2 URLは変わらない。

今回の観測範囲を超えるorphan/backlink全調査、互換実装、DNS/CNAME/custom domain/Actions変更、Analytics/AdSense導入は行わない。

独立read-only reviewで、deploy evidence・参照集合・分類・query semantics・download identity・集計を確認した。query permalinkをrootの200だけで解決扱いにするP2を修正し、再reviewで残P0/P1/対象内P2なし。Ponytail方針で既存HTTP/reference helpersを再利用し、audit instrumentation以外の実装は追加していない。
