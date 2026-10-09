# Domain Cutover Readiness Gate

2026-10-09追加判断：[Radiolink hub / static downloads](radiolink-static-downloads.md)では、旧landing再現不要というowner承認に基づき `/radiolink` を新しい正本の総合入口に変更した。B12のquery-to-binary互換はowner承認により不要となり、静的案内と直接downloadへ置換する。UNKNOWN 4件、RC6GS archive、root/cutover設定などは未解決。以下は過去のdeployment観測であり、このbranchのローカルQAとは区別する。Domain Cutover = NOT READY。

2026-10-09追記：B04（記事1627）は記事全体の廃止・旧URLの404をownerが承認したため解決。他の15 blocker groupは未解決、Domain CutoverはNOT READY。以下のHTTP/countは当時の実deployment観測であり、[1627の現行判断](article-1627-owner-retirement.md)と区別する。

## 判定と対象

**Domain Cutover = NOT READY**。これはDNS切替の実施・承認ではない。

基準main：`a108992da93274f96d5f3087df56fd2b30a1a654`（PR #32 merge）。Phase 6は92/97記事移行、残5記事は明示BLOCKED。公開データは97記事・固定ページ22・FAQ 5・カテゴリ11のままである。

今回の変更は監査script、検証、公開可能な測定結果、報告のみ。UI、記事、migration、taxonomy、Publication Contract、DNS、CNAME、custom domain、Actions、Search Console、Analytics、AdSenseは変更しない。

## 実deploymentの根拠

[main Pages run](https://github.com/happinesea/happinesea-site/actions/runs/37717122177)：check／build／deploy成功。GitHub Pages APIは`built`、`cname: null`、配信先は`https://happinesea.github.io/happinesea-site/`。実Pages URLをHTTPおよびdesktop/mobileで確認した。ローカルbuildだけを配信確認の根拠にはしていない。

既存workflowのbrowser-checkはhomeの非表示carousel画像に対するscroll待ちで2件失敗。新しい独立観測では可視画像と実networkを検証した。Actionsや既存visual testを変更して成功扱いにしない。

## 観測結果

HTTP集計は`audits/domain-cutover-http.json`、公開RESTとBLOCKED本文hashは`audits/domain-cutover-source-checks.json`、GIF bytesは`audits/domain-cutover-gif.json`に記録する。browserの最終観測・初回503・再確認は別記録とする。

| 検証項目                                | 実測                                                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| legacy URL inventory                    | 1,376 URLをprobe。HTTP status確定1,303、timeout等で未確認73                                                                                 |
| legacy同一path/queryのPages counterpart | HTTP 200は257、未成立1,119。200だけで内容同等とは判定しない                                                                                 |
| 実Pages HTML                            | 262経路すべてGET 200。canonical欠落0、同じmainのbuild outputとのcanonical差異0                                                              |
| 移行済み記事                            | 92件のlegacy経路/canonical保持。87件はmodern経路と実GET SHA-256一致、設計図5件はlegacy経路でGET/canonical一致                               |
| desktop/mobile                          | 166経路×2＝332最終観測：first-party console/page error、overflow、可視画像decode failure、旧origin runtime requestは各0                     |
| 内部リンク                              | 実配信HTMLから抽出した同じPages base配下のtarget：最終HTTP失敗0                                                                             |
| 旧origin navigation                     | 131 unique target中、Pages同一path/queryに到達しない39。切替前から壊れた2件やCMS login入口も含むため、すべて新たなcontent欠落とはみなさない |
| downloads                               | 24 unique local files＝PDF 9／ZIP 7／DOCX 8：全件GET 200・記録SHA-256一致、failure 0。30 source receiptsと区別する                          |
| query download                          | 8 asset receiptのHTTP-only responseはファイルbytesではなくHTML。browserでは9 endpointの既知query handoffをdesktop/mobileで確認、4 tests成功 |
| GIF                                     | 2件GET/hash/decode成功。RC4GSは元bytesと同じ32フレーム、FIGHTERは元から1フレーム                                                            |
| WordPress runtime                       | 実Pages HTML属性・browser networkで0。build-time CMS取得は別の依存として残る                                                                |

旧sourceのHTTP>=400は6件：404が5、`xmlrpc.php`の405が1。405はmissing contentの件数に加えない。既知4 broken URLは再現し、さらに`/r6dsm-manual`も404。`2020_4-1024x547.png`の旧source404は、移行本文では既に検証済み別attachment原画像で修復されており、新サイトの画像欠落とは異なる。

73件のsource未確認はcategory 5／download endpoint 6／drawing library 1／drawing 4／attachment 12／post 13／page 25／FAQ 1／image 6。今回のsource HTTP棚卸しを全件確認済みとは報告しない。source200かつPages counterpart未成立で、image/download/attachmentを除くものは85 URL（実responseはHTML 84＋RSD XML 1）。CMS metadata endpointをそのまま公開content欠落とみなさない。

### old-origin asset候補621件

| 分類                 | 件数 | 判断の範囲                                                                                    |
| -------------------- | ---- | --------------------------------------------------------------------------------------------- |
| REQUIRED_FOR_CUTOVER | 267  | 実Pagesまたは取得できた旧本文/公開HTMLで参照を観測。元URLのPages counterpartは267件とも未保存 |
| BLOCKED              | 4    | log TXT 1／XLSX 3。既存の公開意図・内容確認gateを維持し、勝手にcopyしない                     |
| ORPHAN               | 171  | 観測HTML内で参照なし。未取得73 sourceや外部backlinkまで否定しない                             |
| DERIVATIVE           | 89   | filenameの画像サイズ表記による派生候補。現在参照が見つかるものはREQUIREDを優先                |
| OPTIONAL_ARCHIVE     | 90   | その他未参照候補。削除・消失の承認ではない                                                    |

REQUIRED 267件は266 source bytes取得成功、1件は既知source404。取得できた画像にdecode failureはない。これは新サイトのruntime画像が267件壊れているという意味ではない：新HTMLは既存localizationを使うが、元asset URLの互換は別gateである。分類は観測できたHTML scopeに依存し、未取得sourceの再確認で昇格し得る。621件を一括copyしていない。

### QA履歴

Playwright初回336 testsは335成功／1失敗（catalogue画像`bds200.webp`の503）。同じ配信mainで該当desktop/mobile再確認2/2成功し、上表の332最終観測はすべて正常。原因は断定しない。20 fresh full-page capturesを取得し、代表的な上部領域を4枚のcontact sheetで実際に確認した。長い全ページを全高で目視確認したとの主張はしない。

監査collector初回の非ASCII Location手動解釈は二重エンコードしたURLに対して11 internal404を記録した。実サイトの不具合と決めつけず、native fetchで元URLを再確認して0件へ訂正。27 original/recheck receiptsを保存し、raw Locationを再現するlocal HTTP serverとfetch分岐の回帰テストも通した。非ASCII redirectのnative-follow部分にある全中間hopは列挙していない。

`npm run validate`は最初の実行成功。最終再実行の一度はunit/check/lint/format成功後、CMS timeoutでbuildがfail-closed停止した。続く再試行は成功。最終監査ファイルを含む検証結果と独立レビューは末尾に記載する。

## 切替前の必須blocker

件数はblocker台帳の項目数であり、重複しないURL数や独立した解決作業数ではない。複数分類にまたがるものは主分類と関連分類を併記する。B01とB07は同じAmazonリンク確認に依存し、B14/B15/B16の横断互換課題は前の項目と対象URLが重なる。これらを別々のURLとして加算しない。

| ID  | 主分類                                | 対象／未解消事項                                                              | 必要な解決・判断                                                                       | 時期        |
| --- | ------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------- |
| B01 | owner decision                        | 記事1998：Amazon-only manual広告の通常リンク未確認                            | 正しいリンク／等価表現または明示的広告扱いの承認。ASINから生成しない                   | cutover必須 |
| B02 | owner decision                        | 記事1895：旧Amazon DF-17広告script                                            | 通常リンク／静的表現または明示的扱いを確定                                             | cutover必須 |
| B03 | owner decision                        | 記事1857：Amazon iframe 5件                                                   | 同等リンクを確認。商品名から同一性を推測しない                                         | cutover必須 |
| B04 | owner decision                        | 記事1627：本文画像のsrc・attachment同一性欠落                                 | 原画像復元または明示的扱いを確定                                                       | cutover必須 |
| B05 | owner decision                        | 記事905：原文移転先`/minipix-manual-multicopter`が404                         | 同等移転先をowner確認。類似名manualを自動代用しない                                    | cutover必須 |
| B06 | legacy compatibility / owner decision | 旧`/radiolink`とGit catalogueが非同等、route ownership競合                    | catalogueを上書きせず旧V2内容への同等アクセス方針を承認                                | cutover必須 |
| B07 | owner decision                        | Byme-A親index：6章は公開済みだがAmazon部分未確認                              | 親の広告扱い・等価表現を確認。6章だけを理由に削除しない                                | cutover必須 |
| B08 | owner decision / legacy compatibility | `/style-guide`：旧テーマdemo、galleryのattachment pathsが`.html`配下に競合    | 保存方法または明示的削除判断。公開価値をAIが断定しない                                 | cutover必須 |
| B09 | owner decision                        | `/privacy-policy`：WP login/comment/cookie等の現frontend適用が未確定          | ownerが適用条項・連絡先を承認。AIの法律文言書換えをしない                              | cutover必須 |
| B10 | technical                             | root／site／base／canonicalの現在値はgithub.io project向け                    | 承認されたPhase 7手順でorigin/baseを変更しrootとlegacy canonicalを再検証               | cutover必須 |
| B11 | technical / owner decision            | build-time CMS endpointが切替対象`happinesea.com/wp-json/…`を使用             | 編集CMSの独立取得先とsource media取得継続を確定。runtime依存へ戻さない                 | cutover必須 |
| B12 | hosting limitation                    | query-downloadはbrowser handoff。非JS HTTPではHTMLでありPDF/ZIP bytesではない | 既存利用者の互換要件と承認済み配信方式を確定。別名ファイルを代用しない                 | cutover必須 |
| B13 | legacy compatibility                  | RC6GS download-tag archive等の未保存入口                                      | archiveとして同等到達先・互換方針を確定                                                | cutover必須 |
| B14 | legacy compatibility                  | 配信済みHTMLの旧originへの導線でPages counterpartが未成立                     | 対象URLごとに同等到達先を保存または明示判断。上記個別owner gateとリンク修復は区別      | cutover必須 |
| B15 | legacy compatibility                  | 実参照old-origin assetの元URL互換、およびBLOCKED download                     | 必要なURL/bytes/公開意図を解決。621候補の一括copyは禁止                                | cutover必須 |
| B16 | legacy compatibility                  | その他公開200 surface・attachment/archive等の未保存URLと未確認HTTP            | 重要度と保存／等価redirect／承認された扱いを確定。unapproved disappearanceを許可しない | cutover必須 |

切替前必須の台帳は16項目（主分類：owner decision 8／technical 2／hosting limitation 1／legacy compatibility 5、対象・依存重複あり）。具体的な39 old-origin navigation target、1,119 counterpart未成立URL、267参照assetおよび4 BLOCKED assetはHTTP記録から追跡できる。必須URL数を16と数えるものではない。

## 切替後でもよい事項

- 全sitemap／robots／canonicalのSEO完成はCharterのPhase 8。Phase 7のroot/base切替確認を省略する意味ではない。現在sitemapは175 URLで、未公開状態のavailability route `aircraft-engine-stop`も含むため、除外／indexabilityをPhase 8で整理する。今回本文や公開状態を変更しない。
- ORPHAN／DERIVATIVEの一括収集・再最適化は不要。分類は測定scopeにおける未参照候補またはfilename由来の派生候補で、削除承認ではない。外部backlinkや未観測attachment本文を否定しない。必要な互換判断がないまま消失させることはB16で止める。
- 既存visual CIのhidden-image scroll待ちのmaintenance。今回の実配信検証結果とは区別する。
- 既知source broken URLのうち、新サイトの公開導線に出ないもののcleanup。公開導線／critical downloadに影響するものはB14/B15で先に解決する。

## 検証の限界と再実行

`npm run validate`で生成した、同じmainの`dist`を入力にする。`CUTOVER_RUN_ID`に対象mainの成功deploy runを指定し、`node scripts/audit-domain-cutover.mjs`を実行する。これは監査collectorであり、DNSやSEOを変更するrelease toolではない。選択run SHA、ローカルorigin/main、fresh build、GitHub上のmain SHAを照合してから実行した。

HEADの200はreachabilityに限る。87記事の旧`.html`はmodern routeとの実GET bytes/canonical一致で別途確認し、downloadsも実GET hashで確認する。旧`/radiolink`の200を内容同等とはみなさない。

静的reference抽出はHTML属性を対象とし、CSS `url()`、iframe `srcdoc`、動的JSの全挙動を網羅しない。実ブラウザの観測requestと組み合わせ、WordPress runtime resource依存と旧origin navigation／canonicalを区別する。YouTube実再生・全外部サービス・全外部backlinkは未確認。

## 最終検証・独立レビュー

最終treeの`npm run validate`成功：unit 64/64、Astro check、lint、repository-level Prettier、WordPress sync、static build、build-output 24/24。前述のCMS timeoutと初回browser503を隠さず、最後の成功と区別した。fresh source syncにより97公開記事／87 insight＋5 drawingの移行状態は変わっていない。

独立read-only reviewerは4 collector unit testsを実行し、87 alias pairs／5 drawing／24 downloadの記録hash・canonical、27 redirect訂正、621分類、集計と報告を別に再計算した。指摘されたblocker件数の重複表現とHTML/RSD XMLの混同を訂正し、未解消P0/P1/P2なし。bulk HTTPや全browser suiteの独立再実行、owner/legal判断、DNS/CNAME、将来のhosting/canonical、外部backlink網羅、全動的操作・動画再生・全高visual reviewの承認ではない。

変更は公開可能な監査成果物とテストだけ。Publication Charter／Publication Production SkillのFlow Freezeを維持し、mergeしない。Domain Cutoverはowner判断と互換実装・再検証が済むまでNOT READYのままとする。
