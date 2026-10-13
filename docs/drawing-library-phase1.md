# Drawing Library Phase 1

Baseline: `589bc9bffc3447a6cb2926ec6c8915d909223ec7`（Task 0 PR #59 merge後のlatest main）。
対象はcanonical record model、dry-run importer、重複・review gateだけ。
UI、route、Astro collection loader、binary、WordPress、sitemap、GA4、deployは変更しない。

## Modelと保存場所

`src/data/contracts/drawing-library-v0.1.schema.json`がrecord/downloadのJSON Schema。
既存のAjv 2020をruntime validatorに再利用し、未定義field・不正SHA・不正bytes・enum違反を拒否する。
`src/data/drawing-library/`の8 JSONは再生成可能な**review proposal**であり、公開content loaderに接続しない。
既存legacy metadataとdownload registryが既存公開コンテンツの照合元であり、proposalを別の編集masterとして運用しない。

recordは固定id/slug、原題・日本語候補、category、短いsummary（今回はnull）、各status、任意featured image、downloads、legacy、provenanceを持つ。
downloadは原文relative source path、原filename、public filename候補、format/type、bytes、SHA、archive/member metadata、公開権、重複relationを保持する。
legacyにはWordPress/package/article ID、既存URL・download alias・canonicalを保持する。複数IDに対応するため`wordpress_id`に加えて`wordpress_ids[]`を使う。
既存binaryはsource_path=null、provenanceはTask 0のexisting download receipt由来。source packageはTask 0 file ID・原文path・SHA・bytesへ結び付ける。

各enumは依頼された値をschemaに保持する。今回のproposal gateは、schemaが将来許す状態より厳しく、
全recordをpublication_status/publication_right/grouping_status=REVIEW_REQUIRED、全downloadをpublication_right=REVIEW_REQUIREDに固定する。
READY/PUBLISHED、OWNER_APPROVED、CONFIRMED_SINGLEへの自動昇格はない。既存公開ページの現在の状態は変更しない。

## Importer

```powershell
# $drawingSourceはowner指定のローカルsource directory。
# --outputを付けないdefaultはstdoutのみ。apply/publish modeは実装していない。
node scripts/import-drawing-library.mjs --source $drawingSource

# 検証後のreview JSON保存だけを行う。
node scripts/import-drawing-library.mjs --source $drawingSource --output src/data/drawing-library
```

sourceの全path集合・bytes・SHAをTask 0 inventoryと照合する。余分なfile、欠落、変化、symlink/reparse点、root外へのescapeは失敗する。
既存6binaryと関連公開画像も登録SHAと照合する。入力metadataとproposalをvalidateしてからreview JSONを書き込む。
sourceの内容・size・mtimeを変更せず、archiveを展開・新規解析しない。member照合はTask 0のheader/ZIP-stream receiptsを使用する。
source binaryや既存公開assetのSHAが変わった場合、過去のmember evidenceを再利用しない。

出力は`src/data/drawing-library/`または`.superpowers/drawing-library-phase1/`配下のreview directoryに限定する。
public、src/pages、sourceとの重なり、destination symlinkを拒否する。
fileは独立temp fileからrenameで置換し、既存destinationがhardlinkでもsource/public binaryをtruncateしない。
stdout/default dry-runはfileを書かない。source・publicへのcopy APIはない。

JSONのkey/row順・LFを固定する。timestamp・絶対source pathを出力に含めず、同じ入力ならbyte-identicalになる。
生成JSONはPrettierで再整形せずimporterのserializerとschemaで検証する。

## 重複とgrouping

- file全体SHA、既存ZIP member SHA、source ZIP member SHAを区別した`duplicate_of[]` relationとして保持する。
- archiveの一部memberが既存binaryに一致しても、container全体をEXACT_DUPLICATEとは扱わない。
- ledgerのEXACT_DUPLICATEに対応するSHA evidenceが見つからなければfail closed。
- legacy ID/URLの衝突は既存record refresh proposalへ送る。source downloadを既存recordへ無審査で追加しない。
- 同slug/ID/legacy identityで異なるSHA集合はFAIL＋REVIEW_REQUIRED。同じSHA集合はduplicate relationとして検出する。
- PROBABLE_DUPLICATE、case-insensitive filename衝突はholdする。filenameはidentity証明にしない。
- Task 0の同機種候補、nested/split/unsafe/encrypted/一覧不完全archiveはreview queueへ送る。split候補のsuggested_relationは決定ではない。
- 原題と中国語filenameを保持する。medium/low title confidenceはreview queueへ送る。本文や機体名を新たに生成しない。

Task 0の42候補groupをcanonical recordへ自動確定しない。
33 record proposalは既存6件と、他のfileと自動groupingしない単独package候補27件からなる。
複数設計・nested・split等の20 source fileは新規record化を保留し、既存照合24 source fileはrefresh proposalへ送る。
全42 source候補groupはgrouping未確定として保持する。これによりTask 0の37新規ページ見込みと今回の27新規record proposalは一致しない。

## 出力結果

| 指標                                        |                            件数 |
| ------------------------------------------- | ------------------------------: |
| record proposal                             |     33（既存6、新規単独候補27） |
| download mapping                            | 77（source71、既存公開binary6） |
| source EXACT_DUPLICATE                      |                              20 |
| source PROBABLE_DUPLICATE                   |                               9 |
| source EXISTING_PAGE_NEEDS_REFRESH          |                               1 |
| source REVIEW_REQUIRED（archive）           |                               6 |
| source UNIQUE（検出済みexact/probableなし） |                              35 |
| grouping unresolved                         |                              42 |
| title review                                |            26（medium21、low5） |
| publication-right review                    |          77 download、33 record |
| existing refresh proposals                  |                  24 source file |

UNIQUEは検出済み照合における状態であり、設計同一性・未調査nested資料の唯一性・公開許諾を証明しない。
既存6downloadは現在公開されているという事実とrights approvalを分離する。

## Existing protection

既存5設計図article、7package（FIGHTER 1712/1717を含む）、6download、alias、canonicalを変更しない。
FIGHTERは1 record内に両legacy ID/URLを保持し、`1号轻型飞机`とは結合しない。
F-14 package 2168のF4Dを含む旧slugを保持し、rename・redirect・canonical変更を行わない。
Phase 1 proposalから公開pageやsitemapを生成しない。

## 検証と次のPhase

保護テストは`tests/unit/drawing-library.test.mjs`。Task 0のPython testsも維持する。
QAの実行結果と独立review結果は[phase1 QA](drawing-library-phase1-qa.json)に記録する。

Phase 2のindex実装へ進める。ただしreview proposalを公開dataとして直接読み込まず、既存6件のURLを保ったindexから始める。
大量importや公開への昇格には、再配布許諾、同一機種の異なる設計/版のgrouping、不明名称、RC適用範囲、nested/split資料の扱いについてowner判断が必要。
このPhaseのDraft PRはmerge/deployの許可を含まない。
