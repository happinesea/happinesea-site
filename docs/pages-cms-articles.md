# Pages CMS：一般記事の編集

Task T1 baseline: `62531c63db18001c30b63dc9e7d79fe82824e3a9`。mainにあった空の`.pages.yml`を再利用する。Pages CMSから編集するcontentは新設`src/content/articles/*.md`と、その記事用タグ`src/content/article-tags/*.yml`だけ。既存WordPress90記事・商品・マニュアル・設計図・download・legacy台帳は編集項目に出さない。

## データと公開範囲

| 編集項目         | 保存先／Astroでの扱い                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| URL識別子        | `slug`。半角英小文字・数字・ハイフン。ファイル名と一致させる                                          |
| タイトル／説明文 | `title`／`description`。説明文は任意。空欄なら本文から最大160文字の概要（本文も空ならタイトル）を表示 |
| 本文             | Markdown frontmatterの下。Pages CMSの`rich-text`を使用                                                |
| カテゴリ／タグ   | `topic`／`tags[]`。カテゴリは既存6テーマを再利用                                                      |
| アイキャッチ     | `hero.src`／`hero.alt`。画像の説明も入力する                                                          |
| 本文内画像       | Markdown画像。任意位置へ挿入。アイキャッチと同じmedia領域                                             |
| 追加画像         | `gallery[]`の`src`／`alt`。項目の追加・削除・並べ替え。本文の後に順序どおり表示                       |
| 公開状態         | `content_status: draft`または`published`。初期値はdraft                                               |
| 公開日時         | `published_at`。timezone付き日時を明示入力。自動で架空の日付を補わない                                |
| 関連製品ID       | `related_products[]`。任意。既存83商品から検索・複数選択。ID配列で保存し、公開記事に関連商品を表示    |

Astroの独立collection `cmsArticles`が既存記事表示に対応させる。`article_kind`は通常記事、`updated_at`未指定時は初回公開日時と同じ値を使う。手動管理の`updated_at`等はGUIの対象に追加せず、保存時に保持する。WordPress Publication Contractは既存WordPress取り込み用のまま変更せず、新設記事はAstro schemaで検証する。

公開記事は `/insights/<slug>/`、一覧は `/insights/`、ホームも既存の日付順選択へ連携する。公開canonicalはAstroのsite/baseから生成し、CMS URLは使わない。同一slugが既存記事と衝突した場合はbuild failure。ファイル名とslugの不一致も拒否し、既存URLを黙って移動しない。GUIのrename/delete操作は無効。

下書きはHTML・ホーム／記事一覧・sitemap・検索indexへ出さない。新設画像領域では、生成HTMLの`img`から参照されないファイルをbuild出力から除外する。下書き専用／未使用uploadは本番artifactに残さず、Gitの原本は維持する。公開記事と同じ画像を共有する場合は、その公開記事の画像として残る。

画像の保存先は `public/images/articles/`、Markdownに保存するURLは `/images/articles/...`。PNG／JPEG／WebP／GIFに限定し、upload名はrandom。stagingのproject baseはheroと本文の両方へbuild時に付加する。CMS記事の外部画像URL・パストラバーサル・欠落画像は拒否する。画像権利の自動認定ではなく、作者が公開可能な画像を選ぶ。

`settings.content.merge: true`で、編集schema外のfrontmatterを保持する。Astro schemaも未管理キーを保持する。既存の下書きには`editor_note.preserve_example`を入れてあり、GUI往復時に残ることを確認できる。

## 次にPages CMS画面で行う操作

1. [Pages CMS](https://app.pagescms.org/)へGitHubでサインインし、`happinesea/happinesea-site`を開く。未接続なら、ownerがGitHub Appの対象repositoryを確認して接続する。
2. **本PRのbranch `codex/pages-cms-articles`を選ぶ**。この作業ではmainへ直接保存しない。設定が古い場合はbranchを選び直して画面を更新する。
3. 「一般記事」から既存の下書き記事を開く。日本語のfieldラベルで内容・画像を確認する。Pages CMS本体の標準メニュー言語を変更する設定は追加していない。
4. タイトル等を変更し、公開状態は「下書き」のまま保存する。GitHub diffでMarkdownと画像の保存先、`editor_note`等の未管理キーが残ることを確認する。
5. 新規作成ではslugを決め、タイトル・カテゴリ・アイキャッチと画像の説明・公開日時を入力する。説明文・本文は空欄でも保存できる。本文toolbarの画像挿入も「記事画像」を使う。下書き保存でも必須項目を入力する。
6. 公開前に画像の権利・本文・日時を確認し、branch上で「公開」へ変更して保存する。CI／PR diffでURL・画像・sitemapを確認する。公開日時は表示metadataであり予約公開機能ではない。

「公開」は次回buildの対象になるという意味で、即時production deployではない。既存のowner承認・review・deployment gateをそのまま使用する。このPRではmerge／production deployを実施しない。Pages CMSのcollection設定はUIの編集範囲であり、GitHub App全体の権限を限定するACLではない。

公開Git repositoryのため、下書きMarkdown・画像もGit履歴／GitHubからは閲覧できる。秘密情報や非公開business情報は保存しない。

## 検証と公式仕様

- 公式[content設定](https://pagescms.org/docs/configuration/content/)、[media](https://pagescms.org/docs/configuration/media/)、[settings merge](https://pagescms.org/docs/configuration/settings/)、[rich-text](https://pagescms.org/docs/configuration/fields/rich-text/)、[date](https://pagescms.org/docs/configuration/fields/date/)を参照。
- 公式Pages CMS `lib/config-schema.ts`、commit `6f4e860a35d934406580287e7042e5e111e207a1`のConfigSchemaで `.pages.yml` を検証。ローカル検証ではTypeScriptを変換し、importを導入済み`zod/v3`と公式builtin field名の集合へ接続した。field-specific optionsも上記公式仕様と照合した。
- YAMLは導入済みversionの`yaml`を明示的なdevDependencyにして構文検証する。GUI境界／merge設定／公開data変換／slug／画像path／実Markdown renderer／draft画像除外／ホームでのcollection分離に回帰テストを追加。
- 一時的な公開Markdown＋画像を作成し、productionではsitemapが225→226となることを検証。公開記事・hero／本文画像・canonical・robots・desktop/mobile表示を確認する。stagingでも両画像にproject baseが付くことを確認する。
- 一時公開fixtureは検証後に削除し、commitには下書きの編集例と自作説明図だけを残す。サンプル図はT1用に作成した図形であり、外部画像の流用ではない。
- 最終の通常production `npm run validate`、sitemap verifier、既存商品／manual／drawing／download／WordPress／legacy回帰、独立read-only reviewの結果はPRに記録する。

hosted Pages CMSでのGUI往復検証結果は本PRに記録する。WordPress設定・CMS URL・DNS・Actions workflow・production承認ゲートを変更しない。YouTube連携、IndexNow、WordPress移管、新規投稿自動採用は対象外。

## 記事制作の操作と互換性

- タグ追加ボタンの原因は、文字列listの`default: []`を1項目の初期値としてappendしていたこと。タグは複数reference、商品は検索可能な複数selectに置き換えた。保存形式は既存の文字列配列を維持し、build時にもtrim／重複除去を行う。未知の商品IDは拒否する。商品候補は`product-catalogue.json`の83件と一致する回帰テストで保つ。商品内容そのものをCMSへ編集対象として公開しない。
- 新しいタグは「記事タグ」でタグ名を作成し、記事のタグ欄で検索して選択する。ファイル名には自動UUIDを使い、日本語名がslug化で欠落・衝突することを避ける。記事への同じタグの重複選択は防ぐ。タグ名の変更・削除で過去記事の文字列を自動書換しない。未使用候補を削除しても過去のタグ表示を保持する。
- 代表画像は一覧・冒頭用の1枚、追加画像は説明付きの順序配列、本文画像はMarkdown内の任意位置。同じファイルを再利用でき、上限2枚は設けていない。追加画像のドラッグ、または並べ替えハンドルでSpace→矢印→Spaceを使って並べ替える。項目削除は記事内の参照削除で、Media原本を自動削除しない。
- 本文は外部Pages CMSのTiptap標準エディタとMarkdownを維持する。文字選択で書式ツールバー（太字・斜体・リンク・段落／見出し等）、空段落の`/`で見出し・箇条書き・番号付きリスト・Imageを挿入する。画像を選択してALTを設定し、必要ならSource画面で画像Markdownを移動する。UndoはCtrl/Cmd+Z、RedoはCtrl/Cmd+Shift+Z（WindowsではCtrl+Yも使用可）。常設ツールバーはhostedサービス側の機能であり、このrepoに追加しない方針をownerが選択した。
- 説明文の自動生成はbuild／表示時の決定的な本文テキスト抽出であり、外部LLMや保存hookを使わない。空欄は原稿で空欄のまま保持される。自動値を手動編集したい場合は説明文へ入力し、以降は常に手入力を優先する。短い本文を架空の文で100文字まで水増ししない。
- CMS本文だけ、既存Markdown parserで変換したHTMLをsanitize-htmlの許可リストで安全化する。script・iframe・イベント属性・javascript URLを公開表示へ通さない。本文画像はGit管理の専用pathとalt必須を保つ。既存WordPress／manualのrender規則は変えない。
- GUI保存が引用符なし日時を出力するため、timezone付き文字列に加え、Astroが読み取った有効なDateも受け付ける。日付だけの文字列を自動補完しない。
- データ移行は不要。新しい任意galleryは未指定なら空配列。既存本文・画像・手入力説明・未管理frontmatterは保持する。rollbackはこの改善commitをrevertすればよく、新規metadataを消す必要はない。

CMS管理MarkdownはGUIのserializerを原本とし、Prettierによる書換を要求しない。schema・Markdown安全化・build-outputテストは従来どおり実行する。

## 本文へ画像を入れる操作

画像挿入は文字選択時のツールバーとは別の入口です。[本文画像の操作手順](pages-cms-body-images.md)の順序で、空段落の半角`/`→**Image**を使用してください。本文のラベルにも入口を表示します。ALTは画像クリック→**ALT**→説明→チェックマーク→記事の**Save**で設定・再編集します。
