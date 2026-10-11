# 取扱説明書一覧の表示改善

## 範囲

`/manuals/` の表示だけを変更する。本文、翻訳、公開判定、CMS取得、商品情報、URL、Actions、計測・広告設定は変更しない。

機種単位で79カードに集約し、日本語の内部リンク9件と公式英語版リンク81件を表示する。RC4GSはV2/V3、RC6GSは全文版/クイックリファレンスを同じ機種カード内に置く。RC8Xのボタンは「取扱説明書」に簡略化し、現行掲載範囲（概要、第1章、第2章）は説明文で引き続き明示する。

カテゴリは既存商品データに従う7カテゴリ（送信機10、受信機20、フライトコントローラー13、GPS・RTK・センサー7、機体16、電源・ESC5、モジュール・アクセサリー8）。既存CategoryFilterを再利用し、商品一覧の既定カテゴリは保持する。画像は既存の商品画像を使用し、画像に示される製品世代・BT表記をキャプションに残す。

公開を保留している取扱説明書・ダウンロードは追加しない。説明書一覧では「取扱説明書」に統一し、補助資料は「クイックリファレンス」とする。他ページの本文用語は今回変更しない。

## 英語版リンク

2026-10-11に公式[User Manuals一覧](https://www.radiolink.com/online_manuals)および各商品のManual導線から81件を実HTTP取得し、すべて200 / text/html / en-US、最終URLが同じHTTPS URLであることを確認した。URLと根拠ページは [official-links.json](../src/data/manuals/official-links.json) に保存し、build/runtimeでのメーカーサイト取得は追加しない。

F722・RC4GS V2の既定リンク先は中国語だったため、ページに実在するEnglish言語選択リンクを使用した。A560は原資料に合わせ「英語版組立説明書」と表示する。RC4GS/RC6GSの公式V2/V3は同一機種カードの版別ボタンに集約する。

I2C Expansion Board、I2C Transfer Board、ANT-M7は確認した公式導線から英語説明書URLを確定できなかった。CM210は公式Manual導線のhrefが不正なため保留。これら4機種は一覧に推測リンクを追加していない。商品一覧83件は変更しない。

日本語資料とは別ボタンにし、公式サイト・対象世代を表示する。新しいタブで開き、`noopener noreferrer` を付ける。

## 検証

最終の `npm run validate` はPASS。unit 128/128、Astro check 0 errors / warnings、lint、format、staging build、build-output 31/31が成功した。途中のCMS取得タイムアウトは条件を変更せず再試行し、最終実行で成功した。

staging buildのpreviewに対してPlaywrightを実行し、desktop/mobile計8/8 PASS。一覧の機種集約・カテゴリ切替・件数、日本語リンク9件、画像79件のHTTP 200/decode、外部リンク属性、既存商品83件の画像とナビゲーションを確認した。一覧のconsole error、CMS runtime request、横overflow、内部リンク切れ、画像404はすべて0。

実ブラウザと保存captureでdesktop 3列、mobile 1列、RC4GSの版別ボタン、絞り込みを目視確認した。既存white/slate/teal、カテゴリチップ、商品画像を再利用する一方、説明書を選びやすい縦積みボタンにしている。取扱説明書本文・翻訳・公開状態は変更していない。

独立read-onlyレビューの未解消P0/P1/P2は0。既存RC8X掲載範囲の説明文を保持し、既存build-output検証との整合を維持した。

- [desktop一覧](audits/manual-directory/desktop.png)
- [mobile一覧](audits/manual-directory/mobile.png)
- [絞り込み](audits/manual-directory/filtered-desktop.png)
- [RC4GS mobileカード](audits/manual-directory/rc4gs-mobile.png)
- [RC8X mobileカード](audits/manual-directory/rc8x-mobile.png)

## stagingの扱い

既存Pagesは本番公開に使用されているため、今回stagingをそこへデプロイしない。既定staging-modeのビルドをローカルpreviewで配信し、`http://127.0.0.1:4352/happinesea-site/manuals/` で検証する。リモートstagingへのデプロイは未実施。merge・本番デプロイは行わない。
