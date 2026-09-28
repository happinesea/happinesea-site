# Publication import

`happinesea-site` は `RadiolinkManual` をbuild時に直接参照しない。

private側で Publication Contract v0.1 package をローカル生成し、レビュー済みpackageだけを手動importする。

## Import

```powershell
npm run import:publication -- C:\path\to\dist-publication\rc8x
```

importは商品data、asset manifest、manual Markdownだけを取り込む。

## Asset pipeline

```powershell
npm run assets:sync -- src/data/publication-assets/rc8x.json
```

`source_image_url` が確定したassetだけを取得し、SHA-256を記録してWebP / AVIFへ変換する。

メーカー確認前でURL未確定のassetはskipする。

## Review status

`manufacturer_review` の商品・Manualは公開前確認用であり、検索index対象外とする。

メーカー確認後にupstream packageを更新し、再importする。
