# 既存日本語マニュアルの公開レビュー

## 判定

**EXISTING_JA_MANUAL_PUBLICATION_COMPLETE_WITH_OPEN_ITEMS**

11ファイル（PDF 5、DOCX 6）を8つの独立した資料に分類しました。3組は同一資料のPDF/DOCXです。6件を公開候補として実装し、2件は適用するメーカー根拠の不足を明示して公開対象から除外しています。根拠不足による除外はOPEN ITEMSであり、未修正の実装不具合とは区別します。このDraft PRは本番公開を実行しません。

出典は `happinesea/RadiolinkManual` のコミット `93539ca634b4138bb1d8e75fd0b081fd24d8fd0a`、`references/radiolink-existing-ja/` です。個別ファイル・本文区画・画像のSHA-256と対応関係は `src/data/manuals/existing-ja.json` に記録しています。ファイル名の日付を発行日に流用しません。

## 全件棚卸し

| 資料                          | 出典（同ディレクトリ配下）                                                                 | 公開候補ルート                       | 状態                           |
| ----------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------ | ------------------------------ |
| RC4GS（世代未記載・4CH）      | `docx/RC4GS.docx`                                                                          | `/manuals/rc4gs-legacy/`             | 安全確認待ち・ルート未生成     |
| RC4GS V3 取扱説明書           | `pdf/RC4GS V3日本語取説_20221017.pdf`                                                      | `/manuals/rc4gs-v3/`                 | 実装済み・Draft                |
| RC6GS V3 取扱説明書           | `pdf/RC6GS RCプロポセット取扱説明書（V3対応）.pdf`                                         | `/manuals/rc6gs-v3/`                 | 安全確認待ち・ルート未生成     |
| RC6GS V3 クイックリファレンス | `docx/RC6GSクイックガイド.docx`                                                            | `/manuals/rc6gs-v3-quick-reference/` | R7FG V1.4照合・訂正済み・Draft |
| RC8X クイックリファレンス     | `pdf/RC8Xクイックリファレンス_20231201.pdf`、`docx/RC8Xクイックリファレンス_20231203.docx` | `/manuals/rc8x-quick-reference/`     | 実装済み・Draft                |
| T8FB 取扱説明書               | `pdf/T8FB取扱説明書 2024.5.23.pdf`、同名DOCX                                               | `/manuals/t8fb/`                     | 実装済み・Draft                |
| Byme-A V2.0 取扱説明書        | `pdf/byme-a取扱説明書_20240109.pdf`、同名DOCX                                              | `/manuals/byme-a-v2/`                | 実装済み・Draft                |
| Byme-D 取扱説明書             | `docx/byme-d取扱説明書_20240116.docx`                                                      | `/manuals/byme-d/`                   | 実装済み・Draft                |

既存 `/manuals/rc4gs-v2/` は維持します。RC4GS V3への置換・redirectはありません。RC8Xの本文マニュアルとクイックリファレンスも独立した入口です。Byme-Aの旧6章・indexも変更しません。Byme-DBへByme-D資料を関連付けません。

## 安全上の保留（全文・PDF配信とも除外）

### RC6GS V3全文（クイック版とは別判定）

メーカー `sources/en/r7fg_manual.pdf`（SHA-256 `bdd1fd570649a2ecccbca3305ccd01f7eb8e5945115e4436312068ea9c688b67`）と照合しました。

- 日本語全文の受信機図はR7FG **V1.2**、メーカー資料は **V1.4**。全文p9の電圧も図4.6–10V／表3–12Vで不整合です。
- 給電、2回押しON/OFF、1回押し前進設定、反転点滅回数、末尾の起動操作をV1.4資料で一括訂正する根拠がありません。V1.2に適用する公式資料／メーカー説明が必要です。
- 保存された `rc6gsv3_manual.pdf` は実際にRC4GS V3であり、RC6GS V3全文の根拠として使用していません。

### RC6GS V3クイック版（公開候補）

原図はR7FG **V1.4**で、同じ版の公式図、RC6GS V3対応説明、4モード表が一致しました。給電禁止、フェーズ切替、校正タイミング、LED色、長押しバインド、送信機再投入確認、4回の素早い短押し、図のCH6/CH7表示を9件の技術訂正記録として適用しました。前進設定や反転点滅回数の記述はこの資料にはなく、全文版の保留理由を転用していません。

原文・after・公式path/hash/物理ページ・適用範囲は[安全証拠マトリクス](existing-ja-manuals-safety-evidence.md)とinventoryに保存しています。未確認ダウンロードQRは理由を表示して追加配信から除外し、未審査全文への代替リンクは生成しません。

### 世代未記載RC4GS資料

メーカー `sources/en/r6fg_manual.pdf`（SHA-256 `8f761d195cc4efc9d9838bd6b5ea7dc499568f78b622de84a7834e09f8b7d340`）の物理1ページは、送信機ONの後に受信機ONと指定しています。日本語の送信機OFFのまま受信機ONという記述と矛盾します。物理2ページにはジャイロ前進設定の受信機版による適用差があるため、世代を特定せずに操作手順を確定できません。

必要な証拠は、RC4GS世代識別、R6FG版・製造時期と適用電圧／前進設定、および全文版のR7FG V1.2に適用する公式資料です。2件は `PUBLICATION_BLOCKED_BY_UNRESOLVED_AUTHORITATIVE_EVIDENCE`。注意表示だけで危険な本文を公開しません。資料別の全指示の照合は[安全証拠マトリクス](existing-ja-manuals-safety-evidence.md)を参照してください。

## 表示と原資料の保持

- 既存Starlight docs collectionとナビゲーションを再利用します。別の公開・翻訳システムを作りません。
- PDFの95ページを本文と表に構造化し、同じページのローカル図版で複合図・矢印・図中文字・元配置も保持します。図版は原寸で開けます。原PDF 4件も同一byteで保存しています。
- Byme-Dの21個の埋め込み画像は元byteを保持します。削除履歴・コメント・AlternateContentの重複fallbackは公開しません。
- PDF表の結合セルは原資料の座標から復元し、同一注意が複数モードに適用される関係を維持します。元のリンク注釈も保存します。
- 既存5候補の本文・表・図・値は変更しません。新規クイック版の6画像は原byte、受信機図のみメーカー根拠に従う2ラベル訂正SVGです。推測のaltや生成画像は使用しません。画像altは資料名・出典区画を示します。
- 日本語表記整理は「ご確認してください→確認してください」「サブストリム→サブトリム」等、記録済みの限定置換です。各置換のbefore/afterと原文をinventoryに保持します。全件の日本語QA完了とは判定していません。
- DOCX-only資料の原文・元画像の確認は実施していますが、元Word組版の再レンダリングは未実施です。Word組版の完全再現は確認済みとは扱いません。

## Knowledge登録

**未実施**。今回の指定どおり全件 `NOT_VALIDATED`を維持し、VERIFIED・Agent-readyへの昇格は行いません。上流のsource inventory、Knowledge validation ledger、corpusには変更を加えていません。Knowledge P1はpublication closeout後の別作業です。

## QA

最終検証結果は以下のとおりです。実本番への公開・deployは実施していません。

- `npm run validate`: PASS。unit 119件、build-output 29件、Astro check・lint・format・live CMS sync・buildを通過しました。
- staging / production build: 両方PASS。
- Playwright: production 184件PASS。stagingは182件PASS後、古いdownload fixtureの対応先参照を修正して残る2件を再実行しPASS（計184項目、未解消FAIL 0）。6候補のdesktop/mobile、RC4GS V2、legacy alias、download案内、publication代表ページを含みます。
- publication-origin verifier: 両モードでHTML 312件、canonical / OpenGraph各311件、first-party HTTP 956件を確認。broken link/asset、canonical conflict、CMS runtime参照はすべて0です。productionのstaging origin / prefix残存も0です。
- 配信継続download 28経路のHTTP取得・hash一致、停止15経路の404を確認。新規4 PDFも出典SHA-256と一致します。
- 6候補は104読み取り区画、104下位見出し、123画像（95 PDFページ図版・21 Byme-D DOCX画像・7クイック版図）、4 PDF、15構造化表です。全文hash、全asset byte/hash、図の登録、目次anchor、危険HTML不在、保留2資料の非生成をunitで確認しました。
- ブラウザで本文画像decode、console、CMS通信、横overflowを確認。長大ページはviewport captureを保存。既存5候補の28枚に加え、クイック版desktop/mobileのtop・訂正図を実captureで目視確認しました。
- 独立read-only safety reviewでreceiver版、source/page/hash、訂正、保留2route、停止15ファイル、両rendererを確認。未解消P0/P1/P2は0です。公開根拠不足の2資料はOPEN ITEMSとして残します。
- 追加のproduction build-output検証で旧staging固定期待値を検出したため、公開コードを変更せず、選択modeの正確なpathとcanonical/OGを確認するテストに修正しました。productionのbuild-output 29件もPASS。旧RC4GS alias canonicalとquery自動downloadの古いe2e期待値も、変更のない現行mapping・通常リンク＋hash検証に整合させました。

既存WordPress Insights 90件の入力・localized asset、RC4GS V2・既存RC8X本文、既存5候補のinventory / 本文 / assetに差分がないことを確認しました。取得済みdownloadの全receipt / hashは保持し、6資料だけ配信停止状態へ変更しています。Insights 2035とそのaliasのunsafe PDFリンクは公開rendererで停止案内へ修正しましたが、source本文・hash・canonicalは保持します。既存記事のHTML全byte比較は実施していません。DOCX原組版の再レンダリングも未実施です。

上記の安全な配信停止・リンク案内以外の既存記事、RC4GS V2、他製品本文は変更しません。DNS、計測／広告設定、公開workflow、production deployは変更しません。
