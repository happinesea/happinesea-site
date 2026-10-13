# Storage assessment

**判定A: 現在の`public/downloads/drawings/`方式を継続可能。** 技術的な容量判断であり、全量公開の許可ではない。

| 指標                                                |       bytes |    MiB |
| --------------------------------------------------- | ----------: | -----: |
| source総量・71 unique source binary                 | 230,404,265 | 219.73 |
| 既存6 drawing download                              |  11,412,849 |  10.88 |
| 既存ファイル全体とのSHA一致を除いた70 source binary | 224,191,706 | 213.81 |
| 最大source file                                     |  50,332,469 |  48.00 |
| baseline tracked file payload                       | 118,427,305 | 112.94 |
| baseline public assets                              |  98,584,428 |  94.02 |
| conservative projected tracked payload              | 342,619,011 | 326.75 |
| conservative projected public assets                | 322,776,134 | 307.82 |

既存download総量の正確な値は`inventory-summary.json`を参照する。単位はbytes/2^20。
追加量はSHAが異なるcontainerを全て追加する保守的上限。member重複・probable重複・不要資料・権利保留を除けば減る。
17個のF-14展開済み資料、ZIPに内包された2RARを別downloadとして増やす必要はない。
ただしCRC候補を自動削除した削減量は見積りに織り込まない。

2026-10-13確認のGitHub公式制約: regular Gitは100 MiB超を拒否し、50 MiB超でwarning。Pages公開siteの上限は1 GB、source repositoryの推奨上限も1 GB。
今回最大fileは50 MiB未満であり、保守的public assets見込みは約308 MiB。HTML・最適化画像・新規preview等は別増分としてPhase 6で実際のdistを測る。
tracked payloadはGit履歴のpack容量ではない。圧縮済みZIP/RARの改版は履歴を増やしやすく、pack growthを現在値から正確に予言できない。
SHAは同一内容再追加の抑止に用い、版更新は別downloadのchecksumを保持する。

推奨: 権利確認・重複整理・配布bundle選択後にAを継続。多量のbinary改版、1GBに近いdist、bandwidth増加が見えたらB（外部object storage/CDN等）をownerと再評価する。
実測trafficと将来の資料増加は今回不明。public linkに拡張子を保持し、外部storageを選んでも既存download URLの互換性を先に設計する。
LFS、外部bucket、Releaseへの移設、既存URL変更は今回行わない。

Sources:

- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [About large files on GitHub](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)
