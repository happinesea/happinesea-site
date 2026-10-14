# 設計図ライブラリー production公開準備

Baseline: `00615eb7ffb5c05df8cac59fa069fff0c80ec917`（PR #63 merge後）。2026-10-14のowner明示指示により、採用39 recordと配布ファイル・previewの公開を承認。承認は技術的同一性や互換性の認定ではない。除外4件は維持する。

## 公開対象

| 項目                         |                        結果 |
| ---------------------------- | --------------------------: |
| production record／一覧card  |                          39 |
| 既存／新規record             |                       6／33 |
| production download          |         47（ZIP 46、PDF 1） |
| ZIP総容量                    |           207,809,515 bytes |
| 新規binary asset             |   41 ZIP、197,285,371 bytes |
| featured image               | 39（新規preview 33、既存6） |
| 公開filter tag               |                          17 |
| 新規detail／sitemap追加      |                      33／33 |
| 除外record                   |                           4 |
| rights promotion             |      39 record／47 download |
| 画像なし／download SHA不一致 |                        0／0 |

`production.json`を公開用selectionとし、過去のRAR解析・原題・grouping証跡は従来のledgerに保持する。既存6件の公開URLと既存downloadを維持し、新規33件は `/drawinglibrary/<slug>/` とする。canonicalは `https://happinesea.com/`、新規detailはindexable。Downloadは通常のanchorでありGA4設定を変更していない。公開UI・タグの表示方針も変更していない。

除外: `drawing-f4u`、`drawing-p51`、`drawing-model-beginner-materials`、`drawing-paper-aircraft`。同一payloadのZIP重複0、RAR直配布0。FD3/64とFD3/67の同一設計・互換性は承認していない。

## QA

- production `npm run validate`: unit 171、build-output 35 PASS、Astro error 0、lint／format／build PASS。
- Python tests: 19 PASS。
- Drawing 39件 × desktop/mobile = 78確認 PASS。47 downloadのHTTP bytes／SHA-256、画像decode、17タグfilter、新規sitemap 33件 PASS。console error・overflow・hash mismatch各0。
- production origin verifier: HTML 398、canonical 397、first-party link/asset 1,449確認。broken link/asset・canonical conflict・CMS runtime・staging残留各0。HTTP serverはCI同様にdirectory redirectを扱う静的serverを使用。
- publication-origin Playwright: desktop/mobile 全20件 PASS。
- RC8X／RC8P専用smoke: desktop/mobile 全20 route確認 PASS。
- 46 ZIPのCRC・member identity・安全なpath確認 PASS。
- 元source 71／RAR 44のbytes・mtime・SHA不変確認 PASS。43 RAR変換ZIPと1 normalized source ZIPの再検証 PASS。
- 独立read-onlyレビュー: unresolved P0／P1／P2 0。

## RC8X browser-check

Chapter 02は156画像を逐次scroll／decodeした後のfull-page screenshotで30秒budgetを超過することを再現した。同じ対象画像をeager化して並列decodeするtest helperへ変更。画像破損、console error、CMS runtime、overflowのassertionと30秒timeoutは維持する。

Chapter 01のcompute-pressure console errorは再現せず、原因未確定。YouTube由来は仮説に留め、console suppressionは追加していない。詳細と元CI trace欠落の制約は [調査報告](./rc8x-browser-investigation.md) に記録した。

Draft PRでreview可能な公開準備まで。merge・production deployは実施しない。元CI artifact不足により過去のChapter 01原因は未確定、外部video playbackは今回の画像検証対象外。
