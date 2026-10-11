# 日本語取扱説明書の章・トピックナビゲーション監査

## 原因と修正

既存日本語資料の本文は意味上の見出しへ整理済みだったが、Starlight sidebar設定は各文書のindexを「はじめに・本文」1件として登録していた。

レビュー済み`semantic_sections`の深さ2の見出しから、既存RC4GS V2／RC8Xと同じ`chapter-XX`ルートとStarlight sidebarを作る。ルートの連番はルート識別子であり、公開章番号は原資料の見出しにある場合だけ表示する。各見出しより下の節・図・表は次の深さ2の見出しまで同じページに保持する。

## 監査表

| 文書                     | 変更前sidebar項目 | 変更後sidebar項目 | 意味上の入力           | 本文欠落 |
| ------------------------ | ----------------: | ----------------: | ---------------------- | -------: |
| RC4GS V3                 |                 1 |                 3 | レビュー済み2章        |        0 |
| RC6GS V3全文             |                 1 |                 3 | レビュー済み2章        |        0 |
| RC6GS V3 Quick Reference |                 1 |                 7 | レビュー済み6トピック  |        0 |
| RC8X Quick Reference     |                 1 |                 9 | レビュー済み8トピック  |        0 |
| T8FB                     |                 1 |                 9 | レビュー済み8トピック  |        0 |
| Byme-A V2.0              |                 1 |                13 | レビュー済み12トピック |        0 |
| Byme-D                   |                 1 |                 8 | レビュー済み7トピック  |        0 |
| RC4GS V2                 |                 3 |                 3 | 既存実装を維持         |        0 |
| RC8X全文                 |                 3 |                 3 | 既存実装を維持         |        0 |

各対象文書の先頭項目は「はじめに・目次」。その後のラベルは以下のとおり。

- RC4GS V3: I. RC4GS V3 システム紹介／II. RC4GS V3 機能
- RC6GS V3全文: 第1章 RC6GS V3システムの紹介／第2章 RC6GS 機能
- RC6GS V3 Quick Reference: RC6GS V3 送信機の概要／送信機画面表示／機能一覧／R7FG受信機／R7FG受信機動作モード／受信機アンテナ―の扱いについて
- RC8X Quick Reference: ご注意／付属品リスト／スペック情報／RC8X 送信機／ボタンとスイッチの表記等の説明／メニュー／電源を入れる／R8FG 受信機
- T8FB: はじめにお読みください／スペック情報／1．T8FB とR8EF の導入／2．パラメータ設定アプリ／3．アプリの機能設定／4．ファームウェアのアップグレード／5．T8FB ジョイスティックの校正／技術サポートについて
- Byme-A V2.0: 免責事項／警告・注意事項／概要／スペック情報／機体への取り付け／フライトモードの設定／電源ON とジャイロのセルフテスト／校正／ジャイロ位相／送信機の設定／6 種の飛行モード／ジャイロ感度
- Byme-D: 免責事項／概要／スペック情報／機体への取り付け／フライトモードの設定／モーターセフティロック／ジャイロ感度

## 互換性・証跡

- 各index URLは維持。本文・図・表・キャプションは計45章・トピックページへ移動する。
- 旧indexの意味上のID、原資料位置ID、既存の見出しslugは対応章へfragment付きで移動する。JavaScriptを無効化した場合はindexの目次から該当章へ進む。
- 出典ファイル・物理ページ・SHA-256・本文範囲・訂正記録は既存JSONに保持し、変更しない。物理ページ番号はsidebarラベルとして使わない。
- `semanticMarkdown`の既定動作は維持し、章内に含める意味上の節だけを選択できるようにする。
- 既存のsource hash・安全性ゲート、Knowledge状態、配信保留資料の判断は維持する。
- 将来の節追加時には、対応章MDXにも同じ意味上の節を含める必要がある。単体テストはJSONとMDXの欠落・重複・古い本文範囲を検出する。

## 検証方法

単体テストは全節の一度限りの収録、レビュー済み見出し、旧アンカーの行き先、既存の本文・図・表・出典hashを検証する。build-outputテストは実HTMLの見出し・TOC・sidebarリンク・重複ID・安全性・canonicalを検証する。

Playwrightは7文書すべての入口と45章をdesktop/mobileで確認し、sidebar開閉、現在項目、章切替、旧fragment互換、全図版decode、内部リンク、PDF取得、console/CMS通信、overflowを検証する。スクリーンショットは各文書の入口・最初の章・sidebar・最後の章を保存する。

本番公開・merge・DNS・計測・広告・workflow変更はこの作業に含めない。

## 実行結果

- `npm run validate`: PASS。unit 130 PASS / 0 FAIL、Astro check 158 files / 0 errors・warnings・hints、lint・format・資産検証・CMS同期・staging build・build-output 31 PASS / 0 FAIL。
- production: 同じ検証済みCMS snapshotでAstro buildと既存alias/asset/sitemap後処理を実行、build-output 31 PASS / 0 FAIL。
- Playwright: staging 18 PASS / 0 FAIL、production 18 PASS / 0 FAIL。production初回の並列実行はローカルHTTPサーバーの接続拒否等で4 FAIL / 14 PASSとなったが、同じassertionのままworkers=2で全件PASS。
- 最後にstagingを再生成し、RC8X Quickのnative heading fragmentを含むdesktop/mobileを再実行: 2 PASS / 0 FAIL。
- 両モードのpublication-origin HTTP検証: 各1,064 checks、download hash 28 checks、broken links/assets・canonical conflicts・CMS runtime referencesはすべて0。
- RC4GS V3・RC6GS V3全文・RC8X Quick・T8FB・Byme-Aのdesktop/mobile実captureを目視確認。RC8X Quickの代表captureを本ディレクトリ配下に保存。
- 独立read-only review: native heading fragmentのテスト不足(P2)をunit/E2Eで修正し、未解消P0/P1/P2 = 0。
- source/provenance JSON、配信asset/download、RC4GS V2、RC8X全文、Actionsは差分0。
