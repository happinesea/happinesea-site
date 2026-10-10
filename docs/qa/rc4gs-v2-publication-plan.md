# RC4GS V2日本語マニュアル移行計画

目的: 旧日本語目次と章節を既存Starlightへ収録し、原意・数値・UI・図版を保持する。Translator Modeの日本語校正と公開作業は分離する。

- [ ] 総覧921、旧総覧188、カテゴリ20、目次に含まれる30記事をlive CMSと既存publication copyで照合。画像は既存ローカル資産を再利用しSHA-256を記録。
- [ ] 第1章5節＋受信機の下位3節、第2章22節＋PMIX下位3節を既存Starlightへ実装。元文の技術的疑義は原文を保持し、該当節で明示する。
- [ ] 日本語の助詞・操作文・用語のみ校正。数値・UI literal・安全条件・図版・captionの保全をテスト。
- [ ] 元URL（表記違い含む）と新章節URLの対応表。対象旧表示のcanonicalを新章ページへ向け、sitemapの旧URL掲載を除外。本文snapshot/95記事のmigration gateは変更しない。
- [x] 現行manual-hubは未有効のため、独立したdefault-off MU-pluginに301機構を実装。公開確認後のみ廃止metaと実移行日をownerが設定。REST/admin/previewを転送しない。
- [ ] validate、production build、desktop/mobile、全節/画像/link、既存他製品・非対象記事の不変性を確認。自己レビューと独立レビュー後に各所有repoへ連携するDraft PR。

制約: GitHub PagesはHTTP 301を生成できない。CMS側301はpublic Pagesへのアクセスを捕捉しない。meta refreshを301と呼ばず、public originのHTTP 301は別hosting/edge owner判断まで未有効化と記録する。本番操作・DNS変更・merge・deployは行わない。

出典: ManualTranslationSkills radiolink-manual-translation v0.3、RadiolinkManual translation standard/QA checklist/standard terms。MODE_CONVERSION=DISABLED。V3原本はV2の仕様根拠に使わない。

実装・対象QA・独立レビューは完了。全体validateは既存article2086のlive source driftで停止し、保留事項とした。公開・301有効化は未実施。詳細は公開準備・QAレポートを参照。
