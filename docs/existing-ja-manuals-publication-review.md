# 既存日本語マニュアルの公開レビュー

## 判定

**EXISTING_JA_MANUAL_PUBLICATION_REVISION_REQUIRED**

11ファイル（PDF 5、DOCX 6）を8つの独立した資料に分類しました。3組は同一資料のPDF/DOCXです。全件公開は完了していません。5件を公開候補として実装し、3件を安全上の原資料確認待ちとしています。このDraft PRは本番公開を実行しません。

出典は `happinesea/RadiolinkManual` のコミット `93539ca634b4138bb1d8e75fd0b081fd24d8fd0a`、`references/radiolink-existing-ja/` です。個別ファイル・本文区画・画像のSHA-256と対応関係は `src/data/manuals/existing-ja.json` に記録しています。ファイル名の日付を発行日に流用しません。

## 全件棚卸し

| 資料                          | 出典（同ディレクトリ配下）                                                                 | 公開候補ルート                       | 状態                       |
| ----------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------ | -------------------------- |
| RC4GS（世代未記載・4CH）      | `docx/RC4GS.docx`                                                                          | `/manuals/rc4gs-legacy/`             | 安全確認待ち・ルート未生成 |
| RC4GS V3 取扱説明書           | `pdf/RC4GS V3日本語取説_20221017.pdf`                                                      | `/manuals/rc4gs-v3/`                 | 実装済み・Draft            |
| RC6GS V3 取扱説明書           | `pdf/RC6GS RCプロポセット取扱説明書（V3対応）.pdf`                                         | `/manuals/rc6gs-v3/`                 | 安全確認待ち・ルート未生成 |
| RC6GS V3 クイックリファレンス | `docx/RC6GSクイックガイド.docx`                                                            | `/manuals/rc6gs-v3-quick-reference/` | 安全確認待ち・ルート未生成 |
| RC8X クイックリファレンス     | `pdf/RC8Xクイックリファレンス_20231201.pdf`、`docx/RC8Xクイックリファレンス_20231203.docx` | `/manuals/rc8x-quick-reference/`     | 実装済み・Draft            |
| T8FB 取扱説明書               | `pdf/T8FB取扱説明書 2024.5.23.pdf`、同名DOCX                                               | `/manuals/t8fb/`                     | 実装済み・Draft            |
| Byme-A V2.0 取扱説明書        | `pdf/byme-a取扱説明書_20240109.pdf`、同名DOCX                                              | `/manuals/byme-a-v2/`                | 実装済み・Draft            |
| Byme-D 取扱説明書             | `docx/byme-d取扱説明書_20240116.docx`                                                      | `/manuals/byme-d/`                   | 実装済み・Draft            |

既存 `/manuals/rc4gs-v2/` は維持します。RC4GS V3への置換・redirectはありません。RC8Xの本文マニュアルとクイックリファレンスも独立した入口です。Byme-Aの旧6章・indexも変更しません。Byme-DBへByme-D資料を関連付けません。

## 安全上の保留（全文・PDF配信とも除外）

### RC6GS V3の2資料

メーカー `sources/en/r7fg_manual.pdf`（SHA-256 `bdd1fd570649a2ecccbca3305ccd01f7eb8e5945115e4436312068ea9c688b67`）と照合しました。

- 物理7ページはテレメトリーポートからの給電を禁止しています。日本語表の給電指示は逆です。
- 同ページの2回押しはジャイロフェーズ変更であり、日本語表のON/OFFではありません。明確な訂正候補を差分として記録していますが、資料全体の公開承認ではありません。
- 日本語全文の「ジャイロの前進」の1回押し手順、フェーズ反転後の点滅回数、末尾の送信機OFF／受信機ON指示には、適用版・受信機世代の確認が必要です。推測による訂正・削除は行いません。

### 世代未記載RC4GS資料

メーカー `sources/en/r6fg_manual.pdf`（SHA-256 `8f761d195cc4efc9d9838bd6b5ea7dc499568f78b622de84a7834e09f8b7d340`）の物理1ページは、送信機ONの後に受信機ONと指定しています。日本語の送信機OFFのまま受信機ONという記述と矛盾します。物理2ページにはジャイロ前進設定の受信機版による適用差があるため、世代を特定せずに操作手順を確定できません。

必要な次の判断は、受信機の適用版・正しい安全手順を確認する原資料レビューです。注意表示だけで危険な本文を公開可能とは判定しません。

## 表示と原資料の保持

- 既存Starlight docs collectionとナビゲーションを再利用します。別の公開・翻訳システムを作りません。
- PDFの95ページを本文と表に構造化し、同じページのローカル図版で複合図・矢印・図中文字・元配置も保持します。図版は原寸で開けます。原PDF 4件も同一byteで保存しています。
- Byme-Dの21個の埋め込み画像は元byteを保持します。削除履歴・コメント・AlternateContentの重複fallbackは公開しません。
- PDF表の結合セルは原資料の座標から復元し、同一注意が複数モードに適用される関係を維持します。元のリンク注釈も保存します。
- 本文・表・図の順序、設定値、画面英語表記を変更しません。推測のaltや画像内文字の描き直しは行いません。画像altは資料名・出典区画を示します。
- 日本語表記整理は「ご確認してください→確認してください」「サブストリム→サブトリム」等、記録済みの限定置換です。各置換のbefore/afterと原文をinventoryに保持します。全件の日本語QA完了とは判定していません。
- DOCX-only資料の原文・元画像の確認は実施していますが、元Word組版の再レンダリングは未実施です。Word組版の完全再現は確認済みとは扱いません。

## Knowledge登録

**未実施**。P0全件公開・QAに安全上の保留があるため、指定されたP1開始条件を満たしていません。`NOT_VALIDATED`を維持し、VERIFIED・Agent-readyへの昇格は行いません。上流のsource inventory、Knowledge validation ledger、corpusには変更を加えていません。

## QA

最終検証結果は以下のとおりです。実本番への公開・deployは実施していません。

- `npm run validate`: PASS。unit 116件、build-output 28件、Astro check・lint・format・buildを通過しました。
- staging / production build: 両方PASS。
- Playwright: 両モードで各40件PASS。新規5資料のdesktop/mobile、既存RC4GS V2、既存publication代表ページを含みます。
- publication-origin verifier: 両モードでHTML 311件、canonical 310件、first-party HTTP 955件を確認。broken link/asset、canonical conflict、CMS runtime参照はすべて0です。
- 既存download 43件のHTTP取得・hash一致を確認。新規4 PDFも出典SHA-256と一致します。
- 新規候補は103読み取り区画、98下位見出し、116画像（95 PDFページ図版・21 DOCX画像）、4 PDF、13構造化表です。全文hash、全asset byte/hash、図の登録、目次anchor、危険HTML不在、保留3資料の非生成をunitで確認しました。
- ブラウザで本文画像decode、console、CMS通信、横overflowを確認。長大ページはviewport captureを保存し、desktop/mobileの28枚を目視確認しました。
- 独立read-only reviewで指摘されたPDFリンク注釈、表の結合セル・見出しscope、欠落assetテストを修正し、再レビューの実装上の未解消指摘は0です。原資料の安全保留3件は未解消のままです。

既存公開Insights 90件の入力、RC4GS V2・既存RC8X本文、既存download manifestに差分がないことを確認しました。既存記事のHTML全byte比較は実施していません。DOCX原組版の再レンダリングも未実施です。

既存記事・download・RC4GS V2・他製品本文の変更は対象外です。DNS、計測／広告設定、公開workflow、production deployは変更しません。
