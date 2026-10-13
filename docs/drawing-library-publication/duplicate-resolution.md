# Duplicate resolution

Exact 20件はoriginal ledgerのSHA/file/member証拠を保持し、active downloadへ再配置しません。既存6 assetsまたは同groupのarchiveをreuseします。

Probable 9件は以下の個別結果です。全document memberのbytes/SHA-256 multisetが一致する場合のみDUPLICATE_CONFIRMED。CRC単独やfilename類似で除外しません。Thumbs.dbと空directoryはdocument identityから除外し、container自体を同byteとは扱いません。

| Source            | Decision            | Evidence                                                                                                                                                                                                                                                  |
| ----------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3d双翼机.rar      | DUPLICATE_CONFIRMED | All nonempty document member sizes and SHA-256 multiset equal; directory prefixes/Thumbs.db excluded.; Source 139f073fca606752f3cf5b80f0b20dd67c261a38ee520bab228aba222d5280b8; Existing 7df1982881d623a2a4bd9e6e91d8fba9439c29b96204f263f00f8b881f667e50 |
| F-14.rar          | REVIEW_REQUIRED     | CRC/size/name evidence remains insufficient for SHA identity.; Member encoding/reader unsupported                                                                                                                                                         |
| Draken.zip        | DUPLICATE_CONFIRMED | All nonempty document member sizes and SHA-256 multiset equal; directory prefixes/Thumbs.db excluded.; Source df6272e1492b3df5ce8ea87250ed0c280ab4c615fdfb14f3a6938bbcaacff30f; Existing b9ad56c9eecfcd28aa31f2f10d7a07be4d8b35680e3e9da94c79ba0ae111542e |
| 简单的f22.rar     | REVIEW_REQUIRED     | Same model identifier; design/version relation not sufficiently established. Retain both packages.                                                                                                                                                        |
| 歼10.rar          | REVIEW_REQUIRED     | Same model identifier; design/version relation not sufficiently established. Retain both packages.                                                                                                                                                        |
| J10.rar           | REVIEW_REQUIRED     | Same model identifier; design/version relation not sufficiently established. Retain both packages.                                                                                                                                                        |
| c-17运输机.zip    | DUPLICATE_CONFIRMED | All nonempty document member sizes and SHA-256 multiset equal; directory prefixes/Thumbs.db excluded.; Source 56936609460b12edd34489675d5905338adf8cbd123338bfdbd35a4e114f8717; Existing e5b98e6c78a24d3d081b561aed3bb25fb209f82a9848b902ab3c1891c75c4997 |
| 简单的F22图纸.rar | REVIEW_REQUIRED     | Same model identifier; design/version relation not sufficiently established. Retain both packages.                                                                                                                                                        |
| F4D.rar           | DUPLICATE_CONFIRMED | All nonempty document member sizes and SHA-256 multiset equal; directory prefixes/Thumbs.db excluded.; Source 5e3ec67f3470f7d0432d728f96823877196fe53d3c5c80bb79986857a1503202; Existing bb86cd50d911781cd2e0bbb3ea6c3a7a3c6027e6988cc5d81a1be2aefd563b79 |

最終: confirmed4、review5。未確定5件を削除しません。J10/F22の異なるinventoriesだけではdesign/versionの差を確定せず、shared PDF SHAが読めない場合はREVIEW_REQUIREDを維持します。
