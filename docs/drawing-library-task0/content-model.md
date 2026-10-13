# Drawing content model proposal

既存`src/content.config.ts`はAstroの`file()` loaderとZodによるJSON collectionを使う。
後続Phase 1で同じ方式の`drawings` collectionと`src/data/drawings.json`を追加する。
Task 0のrecord候補は`docs/`に置き、現時点でbuild/publication対象にしない。

基本は1機体・設計または1製作資料=1record。サイズ・倍率・版・複数設計候補は`downloads[]`で区別する。
同じ機種名だけで設計を同一と確定せず、設計者や異なる作例の確認結果によってgroupingを修正する。
最小collectionは以下。

| field                                                   | 型・条件                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| id / slug                                               | 明示的な固定ID、ASCII slug。filenameの自動slug化だけに依存しない               |
| title_ja / title_original                               | 表示タイトル／原題。未知の固有名・型式は保持                                   |
| category                                                | 初期enum: 機体の設計図、エンジン・製作資料                                     |
| description_ja                                          | 内容・適用範囲を確認した短い概要。確認前はnull                                 |
| featured_image_candidate                                | 既存media構造に合わせsrc・alt・status・source、未確認ならnull                  |
| downloads[]                                             | file ID、label/original filename、href、format、bytes、SHA、版・倍率の任意説明 |
| source_local_path                                       | source rootからの原文relative path。絶対pathはpublic出力へ含めない             |
| legacy_wordpress_ids / legacy_package_ids / legacy_urls | 記事とpackageを区別し、1対多で維持                                             |
| canonical_route                                         | 既存recordは既存package route、新規のみ`/drawinglibrary/<slug>/`候補           |
| content_status                                          | 既存のdraft/publishedに合わせる                                                |
| publication_status                                      | REVIEW_REQUIRED / APPROVED / PUBLISHED。content_statusと許諾状態を分離         |
| publication_rights                                      | status UNKNOWN/CONFIRMED/RESTRICTED、author/license/source_class/evidence      |

`source_local_path`やreview notesはbuild後HTMLへ出さない。publicページには原題・概要・表示metadata・確認済みdownloadだけを出す。
review台帳とruntime collectionは同じ巨大objectにせず、Phase 1 importerが公開可能fieldだけを選ぶ。
既存metadataと意味が異なる状態を`published`一語へ押し込まない。

## 重複・公開gate

1. importerはsource SHAを再計算し、inventoryと異なれば失敗。input/output treeを分離、sourceへwriteしない。
2. SHA→既存download registryとrecord ID→既存page/package registryを先に構築する。
3. SHA一致はdownloadを再利用。normalized filename、CRC、機種名一致はreview queueへ入れる。
4. 既存recordがあれば新規detail routeを生成せずrefresh候補へ。article・package・aliasはすべて同じrecordに接続する。
5. slug collision、同名異bytes、file path escape、unsupported/encrypted/nested/multipart archiveは失敗またはreview hold。
6. publication_rights=CONFIRMEDと承認証拠、表示タイトル、download SHA、RC適用範囲、必要な安全説明が揃ったrecordだけpublish可能。
7. locale/大文字/全角を吸収したname比較は候補検索専用。Unicode原文pathとfile SHAを保持する。

storageは現在のhash付きdownload registryを再利用する。new filenameは固定slug+十分長いhash等から生成し、衝突時はhash長を増やして検査する。
copy前に既存`downloadFilename`/`assetPath`等の境界検証を再利用し、ASCII化が空になる非ASCII名称にも固定IDで対応する。

## UI plan

`/drawinglibrary/`はRadiolink商品一覧と同じcards、filter、件数表示、responsive grid。
既存`CategoryFilter.astro`はlabel/categoriesを渡せるが、script selectorがproduct専用であるため、Phase 2でdrawing用scopeも扱う小さな拡張を検討する。
1列mobile、2列tablet、3列desktopを基本とし、タイトルを省略して同一機体に見せない。画像未確認なら安全なplaceholder。
filterはkeyboard/aria-pressed、件数はaria-live、JSなしでも全publishedカードへ移動できる。

detailはfeatured image、日本語title、任意original title、1〜3文概要、format/size/版等のmetadata、通常のdownload link。
related drawingsは任意で、既存related ID方式を再利用する。長い本文やCMS editorを追加しない。
既存packageは同じURLで新templateを表示し、legacy記事は元URLを保って関連detailに接続する。新たな重複detailは作らない。
`[...legacy].astro`と専用indexが同じrouteを生成しないよう、Phase 2でlibrary entryだけをgeneric path生成から除外する。
Phase 4で既存packageがdrawing templateへ移る場合も、generic path生成の除外registryとalias出力を同時に検査する。

downloadは`<a href="...file.zip">…</a>`等の通常リンク。blob URL、onclickだけのdownload、拡張子なしのAPI linkを基本としない。
GA4 Enhanced Measurementはpdf/zip/rar等のfile拡張子を検知する。DWG/DXF/STEPや画像は公式のfile_download拡張子一覧に含まれないため、CAD配布は権利確認後のZIP bundleを選ぶか計測限界を明示する。
既存GA4 configは変更しない。今回GA4管理画面の設定・実イベント到達は確認していない。Phase 6で既存有効設定の下でクリック計測を確認する。

Source: [Google Analytics Enhanced measurement events](https://support.google.com/analytics/answer/9216061?hl=en)。
