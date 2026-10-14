# Rights and production gate

> PR62 baseline snapshot. Current RAR/ZIP readiness: [RAR publication summary](rar-publication-summary.md), [QA](rar-qa-summary.md), and src/data/drawing-library/rar-reanalysis.json.

全77 downloadと全43 recordのpublication_rightはREVIEW_REQUIRED。既存6だけは既存公開証拠で現行公開を維持します。新規37はREADY_FOR_OWNER_PUBLICATION_APPROVALであり、公開承認済みではありません。

通常build／productionは既存6だけ。DRAWING_OWNER_PREVIEW=1はproduction／CIでエラーになり、ignored local outputに限って新規37を生成します。新規detailはnoindex,nofollowでsitemap除外。47 source binaryとderived previewはローカルbuildのみ、Gitへcommitしません。公開repoには安全なmetadata、code、汎用SVGだけを入れます。

Owner最終事項: 再配布権の証拠／承認対象、未読5 grouping、5 probable関係、材質・機種未確認情報。承認はUIにwrite APIを作らず、明示的な記録に基づく別promotion changeとして行います。

Promotion checklist: owner evidenceをrecord/download単位で記録→公開対象manifestをreview→SHA検証済み47 assetsのうち承認対象だけpublicへ配置→同時にproduction allowlist/rightsを更新→production全QA／sitemapを再実行。現行gateはrights昇格の誤編集でもエラーにして、確認済みpromotion diffなしに公開できないようにしています。
