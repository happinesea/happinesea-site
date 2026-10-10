# 日本語マニュアルの意味構造監査

比較基準: `0b4a8d2b9ab8f76bba37f8c2a34420e546c2d8ed`（PR #53 merge後）。本監査は文書構造の修正であり、技術仕様の再翻訳・安全判定の変更ではない。技術的正本はメーカー公式英語マニュアルである。

## 原因と修正

旧publication copyは、PDFの各物理ページを `sections` として格納し、その先頭見出しに「（Nページ）」を付けたラベル、または「原資料（Nページ）」をMDXのH2・目次へ出力していた。さらにその内部の原文見出しも表示され、ページ区切りと文書階層が混在していた。

原文の読取区間 `sections` は変更せず、別の `semantic_sections` に実際の章・節・操作手順を記録した。既存の明示見出しと、保存済み原資料で太字の節名と確認できるラベルを使用する。ページが変わっただけの場合は前の意味区間を継続する。物理ページ番号から章番号を生成しない。

共通rendererは意味区間を表示する。カバー・原資料内の印刷目次など、ナビゲーション項目ではないラベルは本文として保持する。図表・スクリーンショットは原文の順序を保ち、ページ由来の偽の見出しを付けない。意味のある原キャプションは保持する。ページ位置だけを説明していた図版ラベルは「図版」とし、変更前のラベル・altは原文記録に残す。

出版ゲートは、ページ由来の見出し、未対応原文範囲、重複・重なり・順序変更、不正な出典対応を拒否する。六資料のStarlight目次は第4階層まで掲載する。Markdownの自動引用符置換は、この六資料の意味見出しに限って原文表記へ戻す。他のMarkdownページには適用しない。

## 全対象監査

| Manual                   | Page-derived headings before | Removed |      Semantic sections after | Content loss |
| ------------------------ | ---------------------------: | ------: | ---------------------------: | -----------: |
| RC4GS V3                 |                           28 |      28 |                           41 |            0 |
| RC8X Quick Reference     |                           14 |      14 |                           26 |            0 |
| T8FB                     |                           34 |      34 |                           49 |            0 |
| Byme-A V2.0              |                           19 |      19 |                           23 |            0 |
| Byme-D                   |                            0 |       0 |                           15 |            0 |
| RC6GS V3 Quick Reference |                            0 |       0 |                            6 |            0 |
| RC4GS V2                 |                            0 |       0 |  35（既存3ルート、変更なし） |            0 |
| RC8X full manual         |                            0 |       0 | 137（既存3ルート、変更なし） |            0 |

六publication copyの数値は原資料に対応した見出し数（共通の「目次」などの補助見出しは除く）。V2/fullの数値は既存3ルートの本文H2〜H6数。Byme-Dの重複ラベルとRC6GS Quickの不要な区間ラベルも整理した。RC4GS V3の「関連マニュアル」は維持する。

RC8X Quickは送信機の説明・操作、R8FG受信機、その実際の設定・手順へ分類する。物理ページ9〜14の内容も該当する受信機の節に継続し、「原資料（9ページ）」等は見出し・目次へ出力しない。T8FB、RC4GS V3は原資料の章・節番号を使用し、Byme-A/Byme-D/RC6GS Quickは原資料の実際の話題名を使用する。

## 出典・互換性・Knowledge

`sections.content_html`、原文ハッシュ、`source_locator`、`sources`、画像対応、訂正記録は基準commitと同一。意味区間の `heading` / `blocks` は原文のUTF-16文字範囲を指定する。全範囲が一度だけ元の順序で含まれることを検証する。PDF物理ページ、DOCXの読取区間など、既存の正確なlocatorを保持し、不明なページ番号は作らない。

将来のKnowledge抽出は `manual -> semantic_sections -> heading/blocks -> source_section -> source_locator + source SHA-256` を使用する。旧 `sections` は不変の証拠区間であり公開階層ではない。この修正でKnowledgeの承認状態を変更しない。

既存の明示IDに加え、旧ページ見出し95個と不要な「はじめに」2個の自動アンカーを非見出しのspanとして残す。ページラベルをTOCへ復活させない。元のMarkdown見出しIDはfixtureに固定し、build outputでも全件の存在を確認する。

六資料の123図版・15表を保持し、原資料・画像・download bytesは変更しない。RC4GS世代未指定版・RC6GS V3 fullの非公開、RC6GS V3 Quickの既存承認、15件の安全上留保されたdownloadも変更しない。

## 回帰防止

- unit: ページ由来ラベル拒否、本文中の正当なページ参照許容、意味範囲の欠落拒否、原文・locator・安全状態の基準ハッシュ保持、全図表・本文順序・旧アンカー保持、MDXと意味mapの一致。
- unit: 対象見出しの引用符完全一致、他Markdownへの影響なし。
- build output: 全manualルートのH1〜H6とStarlight目次を検査。ページプレースホルダー0、実意味見出し・旧ID・図版保持。
- browser: 六資料の全意味見出しのTOC掲載、全リンク先ID、実際の先頭/中間/末尾への移動、全図版decode、PDF取得、canonical、console/CMS通信、overflow、desktop/mobile capture。

## 検証結果

2026-10-11 JST、ローカルの実HTTP配信で検証した。本番merge・deployは実施していない。

| Check                                           | PASS | FAIL |
| ----------------------------------------------- | ---: | ---: |
| unit（新規5件を含む）                           |  124 |    0 |
| staging build-output                            |   30 |    0 |
| production build-output                         |   30 |    0 |
| staging Playwright（desktop 23 / mobile 23）    |   46 |    0 |
| production Playwright（desktop 23 / mobile 23） |   46 |    0 |

`npm run validate`、Astro check（errors/warnings/hints各0）、lint、format、両モードbuild、`git diff --check`はPASS。両モードのpublication-origin verifierはHTML312、canonical311、first-party HTTP956、download HTTP/SHA-256 28を確認。broken links/assets・canonical conflict・CMS runtime参照は各0。productionのstaging origin/base残存も0。23 manual aliases、90 article aliasesを維持する。

RC8X Quick mobileの開いたTOCとR8FG付近の実キャプチャを確認し、「原資料（9ページ）」「原資料（10ページ）」等がないことを確認した。T8FBのdesktop表・mobile図版も実キャプチャで確認した。全六資料の図版decode、リンク先、目次項目、overflow/consoleをbrowserで検証した。

基準commitを別の一時ディレクトリでproduction buildして比較した。対象外300 HTMLは、生成された共通CSSのcache hash filenameを除いて完全一致。CSSは新しいgenerator/testの語句をTailwindが走査して生成した未使用の`outline`/`filter` utilityとその変数の追加だけで、既存ルールの削除・改変はない。既存V2/fullのsource、記事source、全public assetはgit差分0。V2/fullの6ルートはbrowserでも確認済み。sitemap/robotsは基準production outputとbyte一致。

独立read-onlyレビューの修正済み事項: 旧自動見出しアンカーの保持、引用符の保持、実Markdown processor接続。コードレビューの未解消P0/P1/P2は0。構造修正による新規Open Itemはない。既存の技術・安全留保を解消したという判断は行わない。
