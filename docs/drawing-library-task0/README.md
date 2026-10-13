# 設計図ライブラリー Task 0

調査日: 2026-10-13 JST。baseline: `b837b83271a53dbb32c316513c47c5086bf627f6`（取得時の最新origin/main）。
対象は `happinesea/happinesea-site` とowner指定のローカル資料。private sibling repositoryは参照していない。
新規drawingのProduction SoTはhappinesea-siteとする。WordPressはlegacy公開資料の照合元とし、新規登録しない。
このPRは公開可能なファイル名・容量・checksum・公開URL・計画のみを含む。元binary、資料本文、非公開製造情報は含まない。
ローカル絶対パスは台帳に公開せず、`DRAWING_SOURCE`をrootにした原文のrelative pathで保持する。

## 結果

| 指標                                | 実測・候補                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| sourceファイル                      | 71                                                                                |
| source容量                          | 230,404,265 bytes（219.73 MiB）                                                   |
| SHA-256 unique binary               | 71（sourceファイル間の完全重複groupは0）                                          |
| 既存downloadとファイル全体がSHA一致 | 1（F-14 ZIP、6,212,559 bytes）                                                    |
| EXACT_DUPLICATE判定                 | 20ファイル: 上記1、既存F-14 ZIP memberと一致する17、別source ZIPに内包されるRAR 2 |
| PROBABLE_DUPLICATE判定              | 9ファイル: 既存5、source内部分重複4                                               |
| EXISTING_PAGE_NEEDS_REFRESH判定     | 1ファイル: F14AをF-14のvariant候補として保留                                      |
| NEW_CONTENT判定                     | 39ファイル（公開許諾を意味しない）                                                |
| archive確認保留                     | 2ファイル（分割RARの2volume）                                                     |
| 既存record照合                      | 24 sourceファイル、5機体record                                                    |
| source record候補                   | 42（variantをまとめた暫定数）                                                     |
| 新規ページ候補                      | 37（権利・適用範囲・機体同定の確認前）                                            |
| library全体のrecord見込み           | 43 = source 42 + source未一致の既存FIGHTER 1                                      |
| source公開権                        | 全71ファイルREVIEW_REQUIRED                                                       |

EXACT_DUPLICATEの20は**同じファイルがsourceに20組あるという意味ではない**。containerとmemberの一致を含む。
source SHA重複0、archive内のmember SHA一致、CRC一致、機種名によるgroupingを別のevidenceとして記録している。
既存5件のprobableはPitts、Draken、F-14 RAR、F4D、C-17。完全manifestのCRC・容量multiset一致は強い候補だが、CRCはSHAの代わりにならない。
同じ機種の異なる設計・版・倍率は削除せずvariantとして保留する。42/43件は確定公開ページ数ではない。

## 成果物

- [inventory.json](inventory.json): 全71ファイル、原文path/name、extension、bytes、SHA、parent、type、archive一覧。
- [inventory-summary.json](inventory-summary.json): 総容量、extension容量、top20、7 directories、SHA/filename重複group。
- [duplicate-ledger.json](duplicate-ledger.json): 判定、実測evidence、source peer、既存record、公開権、refresh候補。
- [title-candidate-ledger.json](title-candidate-ledger.json): 全71ファイルの原題、日本語候補、confidence、notes。
- [directory-title-candidates.json](directory-title-candidates.json): 7 directoryの原題・表示名候補。型式と倍率を保持。
- [title-decisions.json](title-decisions.json): 原文53個のroot archive名からの明示的な翻訳・grouping判断。
- [record-candidates.json](record-candidates.json): 42暫定record。Astro contentとしてはロードしない。
- [existing-downloads.json](existing-downloads.json): 既存6binaryの実測SHA・archive一覧・legacy alias・package ID。
- [existing-drawing-images.json](existing-drawing-images.json): 関連公開画像のSHA照合元。
- [existing-page-maintenance.json](existing-page-maintenance.json): library、5記事、7package、4tagの維持リスト。
- [live-observations.json](live-observations.json): WordPress/publicへの41 GET、観測時刻・HTTP・SHA・title・link。
- [planning-summary.json](planning-summary.json): 判定数、暫定ページ数、容量見積り。
- [taxonomy.md](taxonomy.md)、[storage.md](storage.md)、[content-model.md](content-model.md)、[implementation-plan.md](implementation-plan.md)。
- [qa.json](qa.json): replay・determinism・tests・diff checkの実行結果。
- [provenance.json](provenance.json): baselineと入力・生成ツールchecksum。

## 再現手順

Python 3.10以上。ZIPは標準library、RARは`rarfile==4.2`のheader parserだけを使用する。unrar実行やdisk展開はない。
RAR依存はaudit専用ディレクトリに導入し、siteのNode依存やGA4設定を変更しない。

```powershell
# $drawingSourceにowner指定のsource rootを設定する。出力先はsource tree外。
python -m pip install --target $auditDeps rarfile==4.2
$env:PYTHONPATH = $auditDeps
python -B scripts/drawing_audit.py $drawingSource --output docs/drawing-library-task0
python -B scripts/plan_drawing_records.py
python -B scripts/drawing_audit.py $drawingSource --output docs/drawing-library-task0 --replay
python -B -m unittest discover -s tests -p drawing_audit_test.py
git diff --check
```

`drawing_audit.py`がmachine inventoryを生成し、`plan_drawing_records.py`が明示的なtitle/grouping候補を適用する。
online observationを更新する場合だけ`python -B scripts/observe_drawing_sources.py`を別実行する。
timestampを含むonline evidenceと、日時に依存しないinventoryを分離する。
生成JSONと新規調査ファイルの改行はLFに固定し、Windows checkoutによるchecksum変化を避ける。
ZIP memberはサイズ・圧縮率上限内でメモリーstreamからSHA計算し、展開ファイルを作らない。RARは名前・CRC・容量のheader一覧のみ。
入力は変更せず、再実行時に全path・bytes・SHAを照合する。archiveの内部filename encodingを推測で書き換えない。

## 既存WordPress・URL維持

現在の公開libraryとCMS page 233のlinkは同じ6packageを指す。CMSカテゴリ17には5記事があり、公開REST一覧で全件確認した。
RESTのwpdmpro一覧は404であり、WordPress内部の全package一覧を取得したとは主張しない。library、記事link、既存snapshotから見える7packageをHTMLで照合した。
全41 GET中40は200、wpdmpro一覧のみ404。公開6downloadのSHAは全て登録値と一致した。

F-14はpackage 2168だが、旧slugにF4Dが残る。slugによる機体推定は禁止し、このURLを保持して同じrecordをrefreshする。
FIGHTERの1712/1717は同じPDFに達する。両入口を保ちながら1recordとして扱う。
FIGHTERと`1号轻型飞机.zip`は同定できない。後者は画像30件の資料であり、新規候補として保留する。
downloadのqueryは既存方針どおり案内ページ＋通常のfile linkとする。自動downloadや新しいWordPress packageを作らない。

## Owner判断が必要な事項

1. 全新規候補の再配布許諾: 作者、出典、license、許諾対象binary・画像、証拠URL/文書。ローカル提供、既存公開、無料downloadは許諾証拠に代えない。
2. 同一機体record内の異なる設計をvariantとしてまとめる方針。F-22、J10、J-20、MiG-29、SU27、F14Aなどは設計同一を未確認。
3. `彩色330`、`微风2005`、`函道`、未特定セスナ・旅客機・回転翼機の正式名とRC適用範囲。
4. 軽飛行機・ヘリコプター・Piper資料が模型用か実機用か。エンジン製作資料の公開範囲と安全上必要な説明。
5. 分割RAR、nested archive、文字化けした内部名の追加調査・許諾範囲。内包資料を自動的に全公開しない。
6. 現行storage Aを選別後も継続するか。将来容量・traffic・binary改版が増えた時点でBを再評価する。
7. 公開library外のlegacy packageも必要なら、公開可能なWordPress exportを用意して照合範囲を拡張する。

このTaskではmerge、deploy、DNS/CNAME変更、WordPress登録、binary upload、GA4 config変更を実施しない。
