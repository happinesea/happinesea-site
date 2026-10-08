# Article 1627 owner-approved retirement

2026-10-09。PR #34 merge後の最新main `ebaaf78` へrebaseしたbounded resolution。mainのCMS endpoint `https://cms.happinesea.com/wp-json/wp/v2/posts` を保持し、1627の廃止のみ再適用する。

Ownerは1627を未完成・不要として記事全体の廃止を承認した。本文の保存・欠落画像の復元・新サイトへの移行は行わない。manifestの明示withdrawalとPhase 6 decisionに記録し、inventoryの本文解析・hash reviewより前に公開対象から除外する。旧review hashと過去のfixtureは変更しない。その他の記事のsource hash gateも変更しない。

旧URL `https://happinesea.com/experience/202107081627.html` は **HTTP_404_NO_REDIRECT**。既存404ページを使用し、記事・retirement用200ページ・推測redirect・代替canonicalを生成しない。GitHub Pagesに410 response制御は追加しない。現行WordPress側の記事やhome/siteurlは変更しないため、切替前の旧originの200と切替後の承認済み404を区別する。

1627配下のattachment/mediaまで廃止する承認ではない。他記事からの参照や互換性は既存audit対象のまま残す。

既存の静的archive（experience category／blog page 3）に残る1627への歴史的リンクは、このscopeでは原文のpublication copyを変更せず保持する。その到達先404は明示承認済みの廃止であり、別記事へ推測誘導しない。現行WordPressの一覧変更も行わない。

## Phase 6とcutover

- source公開記事97、publication scope96、owner-approved withdrawal1。
- 移行済み92（Insight87＋drawing5）は不変。
- 未解決記事4：1998、1895、1857、905。未判定NEEDS_REVIEW／NEEDS_TRANSFORMは0（別経路で公開済みのdrawingの生集計とは区別）。
- Phase 6はCOMPLETE_WITH_EXPLICIT_BLOCKERS、Domain CutoverはNOT READY。
- 既存cutover報告B04（1627 owner decision）のみ解決。他の15 blocker group、attachment/media、固定ページ・hosting・canonical等の判断は継続する。

過去のPhase 6 completion／cutover HTTP記録は当時の測定値として保存し、このowner decisionを現在の1627の扱いとする。DNS/CNAME/custom domain/Actionsに変更なし。

## 検証

- rebase後の`npm run validate`成功：unit67、Astro check（errors/warnings/hints各0）、lint、repository format、CMSからの実WordPress sync、static build、build-output26。CMS live APIテスト2/2成功。公開home/url・87記事のslug/canonicalは不変。
- 既存92記事のlegacy HTMLは最新main baselineとbyte一致。公開データ、他記事decision/inventory、他legacy entries、assetsは不変。
- rebase後のPlaywright desktop/mobile 4/4成功。旧URLの404、redirectなし、noindex、canonicalなし、overflow0、およびhome／一覧／記事／aliasのruntime CMS request0を確認。公開HTML/JSにもCMS endpointなし。廃止ページの両captureは初回に実際に確認した。
- legacy summaryを再計算し一致、canonical conflict0。独立read-only reviewは未解消P0/P1/P2なし。
- branch/local検証であり、新しいmain deploymentの確認ではない。merge・DNS切替は行わない。
