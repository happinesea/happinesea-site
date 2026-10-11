# 取扱説明書一覧の表示改善

## 範囲

`/manuals/` の表示だけを変更する。本文、翻訳、公開判定、CMS取得、商品情報、URL、Actions、計測・広告設定は変更しない。

機種単位で6カードに集約し、日本語の内部リンク9件と公式英語版リンク6件を表示する。RC4GSはV2/V3、RC6GSは全文版/クイックリファレンスを同じ機種カード内に置く。RC8X全文版の現行掲載範囲（概要、第1章、第2章）は引き続き明示する。

カテゴリは既存商品データと対応する送信機4機種、フライトコントローラー2機種のみ。既存CategoryFilterを再利用し、商品一覧の既定カテゴリは保持する。画像は既存の商品画像を使用し、画像に示される製品世代・BT表記をキャプションに残す。

公開を保留している取扱説明書・ダウンロードは追加しない。説明書一覧では「取扱説明書」に統一し、補助資料は「クイックリファレンス」とする。他ページの本文用語は今回変更しない。

## 英語版リンク

2026-10-11に以下6件を実HTTP取得し、すべて200 / text/html、最終URLが同じHTTPS URLであることを確認した。日本語資料とは別ボタンにし、公式サイト・対象世代を表示する。新しいタブで開き、`noopener noreferrer` を付ける。

- https://www.radiolink.com/rc4gsv3_manual
- https://www.radiolink.com/rc6gsv3_manual
- https://www.radiolink.com/rc8x_manual
- https://www.radiolink.com/t8fb_bt_manual
- https://www.radiolink.com/bymea_manual
- https://www.radiolink.com/bymed_manual

## 検証

最終の `npm run validate` はPASS。unit 128/128、Astro check 0 errors / warnings、lint、format、staging build、build-output 31/31が成功した。途中のCMS取得タイムアウトは条件を変更せず再試行し、最終実行で成功した。

staging buildのpreviewに対してPlaywrightを実行し、desktop/mobile計8/8 PASS。一覧の機種集約・全カテゴリ切替・件数、日本語リンク9件、画像6件のHTTP 200/decode、外部リンク属性、既存商品83件の画像とナビゲーションを確認した。一覧のconsole error、CMS runtime request、横overflow、内部リンク切れ、画像404はすべて0。

実ブラウザと保存captureでdesktop 3列、mobile 1列、RC4GSの版別ボタン、絞り込みを目視確認した。既存white/slate/teal、カテゴリチップ、商品画像を再利用する一方、説明書を選びやすい縦積みボタンにしている。取扱説明書本文・翻訳・公開状態は変更していない。

独立read-onlyレビューの未解消P0/P1/P2は0。既存RC8X掲載範囲の説明文を保持し、既存build-output検証との整合を維持した。

- [desktop一覧](audits/manual-directory/desktop.png)
- [mobile一覧](audits/manual-directory/mobile.png)
- [絞り込み](audits/manual-directory/filtered-desktop.png)
- [RC4GS mobileカード](audits/manual-directory/rc4gs-mobile.png)

## stagingの扱い

既存Pagesは本番公開に使用されているため、今回stagingをそこへデプロイしない。既定staging-modeのビルドをローカルpreviewで配信し、`http://127.0.0.1:4352/happinesea-site/manuals/` で検証する。リモートstagingへのデプロイは未実施。merge・本番デプロイは行わない。
