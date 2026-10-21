# Pages CMSから通常記事を公開する

## 操作

1. Pages CMSで`happinesea/happinesea-site`を開き、**記事編集用の作業ブランチ**を選ぶ。mainを選ばない。
2. 「一般記事」でMarkdown・画像・タグを編集してSaveする。作業中は`draft`を使う。
3. 公開時は`published`にして保存する。公開日時は記事メタデータであり、**予約公開の時刻ではない**。未来の日時でもpublishedなら次のbuildで公開される。
4. 作業ブランチからmainへのPRを作り、差分とCIを確認してレビュー後にmergeする。
5. mainのpushで既存の「Deploy to GitHub Pages」が自動起動する。通常記事だけなら追加のcutover承認を待たず、production build・成果物検証に成功したartifactを公開する。Actionsのdeploy成功と実際の記事・画像を確認する。

**mainへ直接Saveすると、PRレビューを経ずに公開処理が起動する。** 下書き保存でも既存published記事を含むサイト全体を再buildする。公開日時を将来にしても公開を防げない。GitHubのmainは調査時点ではbranch protectionがなく、この変更も保護設定を変更しない。PRを必須にしたい場合はownerが別途branch protection/rulesetを設定する。

Pages CMSのGUI操作は[編集ガイド](pages-cms-articles.md)、本文画像は[画像挿入手順](pages-cms-body-images.md)を参照。

## 変更の種類と実行内容

| 変更                                                                                                          | PRのCI                                                   | main更新後                                                                                              |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/content/articles/*.md`、`src/content/article-tags/*.{yml,yaml}`、`public/images/articles/`の対応画像だけ | 既存production build＋公開状態・Googleサービスの限定検証 | production build＋既存成果物検証→既存github-pages環境へ自動deploy。全Unit／型検査／lint／Playwrightなし |
| コード・記事モデル・`.pages.yml`・workflow・その他データを含む                                                | ローカル整合性検証＋`npm run validate`を維持             | 全ソース検証＋production-cutoverのowner承認＋build／成果物検証／deploy／既存browser-check               |
| 手動workflow_dispatch                                                                                         | 全ソース検証                                             | 従来どおり明示productionはmain＋production-cutover承認。stagingはcustom domainが残っていれば拒否        |

軽量扱いにする画像はPNG/JPG/JPEG/WebP/GIF。MDX、SVG、実行コード、未対応pathは通常の開発変更として扱う。混在・削除・renameもGit全差分で判定する。GitHubのイベントpath filterやAPIの変更ファイル上限には依存しない。差分不明・履歴不足・空差分・最初のpushは開発用へ戻す。

mainの通常公開では、直前pushだけでなく、**成功した正式デプロイのソースSHAからの差分も記事だけか**確認する。先にmainへ入った未公開コードを、後の記事変更でowner承認なしに公開しない。直近20 deploymentから、正式サイトのURLを持つ有効なsuccessを確認する。承認だけのジョブ・staging・失敗・inactiveは公開済みの根拠にしない。根拠なし／Git履歴不足は開発用へ戻し、APIエラーは停止する。build前とdeploy前にも再確認する。

**このworkflow変更の初回mergeはコード変更なので軽量経路にはならない。** 従来のowner承認を通して最初の正式公開を行った後、そのコードのままの記事更新が自動経路を使う。未公開コードやworkflow変更が残っている場合も承認が必要。

## 維持する公開ゲート

- 同じ`deploy.yml`に1つのbuildと1つのdeployを維持する。`concurrency: pages`で手動実行を含むPages公開を直列化し、実行中deployを中断しない。
- main pushはproductionを選ぶ。以前はstagingを選び、正式custom domainにstagingを配置しない既存ゲートで失敗していた。
- 記事だけの場合は**PR mergeを公開承認とする**。既存`github-pages`環境（main許可・required reviewersなし）を再利用する。`production-cutover`のrequired reviewersはコード／手動productionに残し、環境設定自体は変更しない。
- production通常公開はPagesのcustom domainが`happinesea.com`、公開方式がActionsであることも確認する。
- 通常buildはGit保存済みコンテンツだけを使用する。`wordpress:verify`で保存済みWordPressの契約・ID・manifest・canonical・画像を検証する。公式画像hash、legacy alias、download、sitemapの既存検証も維持し、ライブWordPress APIには接続しない。
- build後に既存の公開状態検証を使い、published HTML・画像・sitemapとdraft非生成を確認する。Googleサービスゲートも維持する。
- 既存の`verify-publication-origin.mjs`によるローカルHTTP検証を残す。HTML canonical、画像・CSS・JSを含むリンク、CMS参照、download hash、manual aliasを検査してからartifactをuploadする。
- build／検証／upload失敗ならdeployは起動しない。通常記事でbrowser-checkは実行しない。開発／手動公開では従来のbrowser-checkを維持する。

通常公開で検査を省くのは、全件Unit・型検査・lint・format・公開後Playwright。buildが必要とする検証や既存の公開成果物ゲートは省略しない。通常公開にLighthouseや独立レビューの自動ジョブは追加しない。

## 検証範囲

この変更はDraft PRで検証する。production形式のローカルbuild、一時published／draft原稿と画像、未来の公開日時、失敗する原稿、既存商品・マニュアル・WordPress・設計図・sitemapを検証する。実際のmain merge／GitHub Pages deployはこの作業では行わない。実運用の初回確認はownerがPRを承認・mergeした後に行う。

2026-10-21のローカル検証では、Unit 194件、Astro診断0件、lint／format、actionlint、保存済みWordPressデータからのproductionフロントエンド生成と既存build-output 37件がPASS。限定した公開状態／Googleサービス検証もPASSした。通常sitemapは226件、一時published原稿を含めると227件。draft HTML・専用画像は生成されず、未来日時のpublished原稿は生成された。画像欠落の原稿はbuild失敗となった。既存HTTP成果物検証は1,453参照・28 download hash・23 manual aliasを確認し、リンク／canonical／CMS参照の不整合は0件。

## WordPress同期は明示的なメンテナンス操作

通常のbuild、validate、PR CI、記事公開は旧WordPress APIに依存しない。旧APIの302／404／503／接続不能は通常公開のblockerではない。

再取得が必要な場合だけ、作業ブランチで `npm run wordpress:test:live` と `npm run wordpress:sync` を明示実行する。同期時は従来のsource hash・manifest検証を維持する。JSONと画像の差分をレビューし、通常のコード／データ変更として承認する。通常workflowでは実行しない。
