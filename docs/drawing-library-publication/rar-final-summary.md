# RAR再解析後の最終サマリ

集計日：2026-10-14。再解析台帳は43recordの証拠を保持し、owner除外4件を反映した現在の公開準備は39record（既存6／新規33）、47 downloadです。公開UI・タグ方針は変更していません。

## 最終結果

| 項目                                       | 結果                                                                                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| RAR対象数                                  | 44ファイル。うち4ファイルはownerが一旦退避へ移動済み                                                                                         |
| ZIP変換成功数                              | 43完全archive。分割RARは2volumeを1 ZIPへ統合し、part2単独では変換しない                                                                      |
| 追加のZIP再梱包                            | 内部RARを含むsource ZIP 1件。内部もZIP化                                                                                                     |
| RAR再解析でpreview/imageを回収できたrecord | 28件。直接RARまたは同じRARを含むZIP内memberに由来し、member SHAで出典を保持                                                                  |
| 以前画像なし→今回画像あり                  | 12件（上記28件の内数）                                                                                                                       |
| 現在のactive recordで画像なし              | 0件。新規33件にsource preview、既存6件に既存公開画像がある                                                                                   |
| 再解析時点で画像を回収できなかったrecord   | 4件。全件owner除外済み。下表参照                                                                                                             |
| RAR由来の名称解決・表示名改善              | 6件。FOXIE、FD3/67・FD3/64、Furia、Hornet、Model Jet Engines、セスナ182図面資料。機体同一性の全面確定を意味しない                            |
| grouping確認待ち                           | 0件。従来5件の入れ子・分割package関係を整理                                                                                                  |
| probable確認待ち                           | 0件。9件はEXACT_MEMBER_DUPLICATE 5件／SAME_MODEL_DIFFERENT_VERSION 4件                                                                       |
| 別途残る設計関係確認                       | 1件：drawing-microjet-engine。資料内FD3/64とFD3/67の設計関係はREVIEW_REQUIRED                                                                |
| RAR由来のderived ZIP総容量                 | 43 ZIP／194,558,469 bytes（約185.55 MiB）。除外・再利用候補も含む解析成果物全量                                                              |
| 外側配布用derived ZIP成果物全量            | 44 ZIP／204,682,887 bytes（約195.20 MiB）。RAR由来43＋source ZIP再梱包1。親ZIPに含まれる内部ZIP cacheは二重集計しない                        |
| 現在配布候補のderived ZIP容量              | 35 ZIP／183,685,364 bytes（約175.18 MiB）。source ZIPの再梱包1件を含む                                                                       |
| 最大ZIP                                    | 55,919,107 bytes（53.33 MiB）                                                                                                                |
| source RAR unchanged                       | 全44件のbytes・mtime・SHA再照合成功。source71件も再照合成功。ownerによるpath移動は明示対応表に従い、エージェントによる移動・変更・削除はない |
| production rights gate                     | 維持。active39件はREVIEW_REQUIRED、新規33件は通常／production build・sitemap対象外。通常公開対象は既存6件のみ                                |

「回収28件」は再解析でsourceからpreviewを生成・選定できた件数、「新規復旧12件」は以前fallbackだったrecordの改善件数です。同じ件数として扱いません。現在activeにgeneric fallbackのrecordはありません。

## 画像不足だった4件（現在は全件除外済み）

| record id                        | title                              | source archive          | standalone画像／PDF                 | fallback                     |
| -------------------------------- | ---------------------------------- | ----------------------- | ----------------------------------- | ---------------------------- |
| drawing-f4u                      | 第二次世界大戦期 F4U模型機の設計図 | 二战F4U模型飞机图纸.rar | 画像なし／PDFなし。内部RARにDWG 1件 | 除外前はあり。現在ページなし |
| drawing-p51                      | P51 設計図                         | P51图纸.rar             | 画像なし／PDFなし。DXF 3件          | 除外前はあり。現在ページなし |
| drawing-model-beginner-materials | 模型関連の付属資料                 | 航模赠品.rar            | 画像なし／PDFなし。DOC 3件          | 除外前はあり。現在ページなし |
| drawing-paper-aircraft           | 紙飛行機の資料                     | 纸飞机.rar              | 画像なし／PDFなし。DOC 1件、PPT 1件 | 除外前はあり。現在ページなし |

CAD・旧Officeの埋め込み画像は対応toolingで未確認です。「standalone画像／PDFなし」を「埋め込み画像も絶対に存在しない」とは判定していません。元資料はrar-zip_変換/一旦退避に保持され、公開準備への復帰はowner判断を必要とします。

## QAとCI

- unit167、Astro check0 errors、lint／対象format check、owner buildが成功。
- desktop/mobileの39record計78画面、全表示タグのfilter件数、47 downloadのHTTP・bytes・SHAが成功。除外4詳細URLは404。
- RAR44／source71のSHA・bytes・mtime replay、ZIP43と再梱包ZIP1のreopen／CRC／recursive member SHA replayが成功。配布ZIP内RAR0、重複payload0。
- コードHEAD023be85b0f71d35b8f751ad711929807a0e68e2aの[CMS endpoint check / verify](https://github.com/happinesea/happinesea-site/actions/runs/38495363384/job/115629791944)はCOMPLETED／SUCCESS。完了2026-10-14 10:27:43 JST。
- このサマリ追加commitのCI結果はPR #63のchecksと最終報告で確認する。上記コードHEADの結果と混同しない。

merge・production deploy・権利承認・binary公開は実施していません。source・原題・判断根拠は台帳に保持し、UIではowner指定の表示方針を維持しています。

参照：src/data/drawing-library/rar-reanalysis.json、owner-exclusions.json、rar-qa-report.json、[owner除外](owner-exclusions.md)。
