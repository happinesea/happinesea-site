# Publication import

`happinesea-site` は `RadiolinkManual` をbuild時に直接参照しない。

private側で Publication Contract v0.1 package をローカル生成し、レビュー済みpackageだけを手動importする。

## Import

```powershell
npm run import:publication -- C:\path\to\dist-publication\rc8x
```

importは商品data、asset manifest、manual Markdownだけを取り込む。

## Asset pipeline

通常build/deployは保存済みのローカル資産を検証し、メーカー画像サーバーへ通信しない。

```powershell
npm run assets:verify -- src/data/publication-assets/rc8x.json
```

`public/assets/radiolink/rc8x/` の46ファイルとprocessed manifestをGitへ保存する。manifest fingerprint、元画像SHA-256（provenance）、各出力SHA-256/byte数、寸法、GIFフレーム数、WebP/AVIF両方を検証する。欠落・改変・未処理・manifest不一致はbuild failureであり、通信取得へのfallbackやskipはしない。

新規取得・更新はbuild/deployと独立した、owner-reviewedな同期で行う。

```powershell
npm run assets:sync -- src/data/publication-assets/rc8x.json
```

`source_image_url` が確定したassetを取得し、SHA-256を記録してWebP（quality 82）/AVIF（quality 55）へ変換する。GIF/BMPは元byteを保持する。同期だけに30秒のtimeoutを設定し、失敗を成功扱いしない。保存済みsource hashと不一致なら、ファイル上書き前にその画像を拒否する。

必要画像のURL未確定はエラーになる。新規画像は出典・表示・派生画像・hashをレビューしてからcommitする。更新画像は差分を確認してsource hashを明示的に承認し、再同期後に出力とprocessed manifestをまとめてreview/commitする。旧hashを自動承認するオプションはない。同期が途中で失敗した場合も、verifyがPASSするまでcommit/deployしない。

CMS本文取得・publication review gateは別の既存build依存として維持する。この変更はCMS障害や記事source driftを回避する仕組みではない。

## Review status

`manufacturer_review` の商品・Manualは公開前確認用であり、検索index対象外とする。

メーカー確認後にupstream packageを更新し、再importする。
