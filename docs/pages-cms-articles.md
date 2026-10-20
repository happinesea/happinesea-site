# Pages CMS：一般記事の編集

Task T1 baseline: `62531c63db18001c30b63dc9e7d79fe82824e3a9`。mainにあった空の`.pages.yml`を再利用する。Pages CMSから編集するcontentは新設`src/content/articles/*.md`だけ。既存WordPress90記事・商品・マニュアル・設計図・download・legacy台帳は編集項目に出さない。

## データと公開範囲

| 編集項目         | 保存先／Astroでの扱い                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| URL識別子        | `slug`。半角英小文字・数字・ハイフン。ファイル名と一致させる                 |
| タイトル／説明文 | `title`／`description`                                                       |
| 本文             | Markdown frontmatterの下。Pages CMSの`rich-text`を使用                       |
| カテゴリ／タグ   | `topic`／`tags[]`。カテゴリは既存6テーマを再利用                             |
| アイキャッチ     | `hero.src`／`hero.alt`。画像の説明も入力する                                 |
| 本文内画像       | Markdown画像。アイキャッチと同じmedia領域                                    |
| 公開状態         | `content_status: draft`または`published`。初期値はdraft                      |
| 公開日時         | `published_at`。timezone付き日時を明示入力。自動で架空の日付を補わない       |
| 関連製品ID       | `related_products[]`。任意。初期はmetadataとして保存し、自動リンクを作らない |

Astroの独立collection `cmsArticles`が既存記事表示に対応させる。`article_kind`は通常記事、`updated_at`未指定時は初回公開日時と同じ値を使う。手動管理の`updated_at`等はGUIの対象に追加せず、保存時に保持する。WordPress Publication Contractは既存WordPress取り込み用のまま変更せず、新設記事はAstro schemaで検証する。

公開記事は `/insights/<slug>/`、一覧は `/insights/`、ホームも既存の日付順選択へ連携する。公開canonicalはAstroのsite/baseから生成し、CMS URLは使わない。同一slugが既存記事と衝突した場合はbuild failure。ファイル名とslugの不一致も拒否し、既存URLを黙って移動しない。GUIのrename/delete操作は無効。

下書きはHTML・ホーム／記事一覧・sitemap・検索indexへ出さない。新設画像領域では、生成HTMLの`img`から参照されないファイルをbuild出力から除外する。下書き専用／未使用uploadは本番artifactに残さず、Gitの原本は維持する。公開記事と同じ画像を共有する場合は、その公開記事の画像として残る。

画像の保存先は `public/images/articles/`、Markdownに保存するURLは `/images/articles/...`。PNG／JPEG／WebP／GIFに限定し、upload名はrandom。stagingのproject baseはheroと本文の両方へbuild時に付加する。CMS記事の外部画像URL・パストラバーサル・欠落画像は拒否する。画像権利の自動認定ではなく、作者が公開可能な画像を選ぶ。

`settings.content.merge: true`で、編集schema外のfrontmatterを保持する。Astro schemaも未管理キーを保持する。下書きの編集例には`editor_note.preserve_example`を入れてあり、GUI往復時に残ることを確認できる。

## 次にPages CMS画面で行う操作

1. [Pages CMS](https://app.pagescms.org/)へGitHubでサインインし、`happinesea/happinesea-site`を開く。未接続なら、ownerがGitHub Appの対象repositoryを確認して接続する。
2. **本PRのbranch `codex/pages-cms-articles`を選ぶ**。この作業ではmainへ直接保存しない。設定が古い場合はbranchを選び直して画面を更新する。
3. 「一般記事」から「画像付き記事の編集例」を開く。日本語のfieldラベルで内容・画像を確認する。Pages CMS本体の標準メニュー言語を変更する設定は追加していない。
4. タイトル等を変更し、公開状態は「下書き」のまま保存する。GitHub diffでMarkdownと画像の保存先、`editor_note`等の未管理キーが残ることを確認する。
5. 新規作成ではslugを決め、タイトル・説明・カテゴリ・アイキャッチと説明・公開日時・本文を入力する。本文toolbarの画像挿入も「記事画像」を使う。下書き保存でも必須項目を入力する。
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

実際のhosted Pages CMSでのログイン・保存・画像uploadはこのローカル検証では操作していない。上記GUI往復確認をownerが行う。WordPress設定・CMS URL・DNS・Actions workflow・production承認ゲートを変更しない。YouTube連携、IndexNow、WordPress移管、新規投稿自動採用は対象外。
