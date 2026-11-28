# AGENTS.md

## Repository purpose

このリポジトリは happinesea.com のPUBLIC frontend sourceである。

## Public boundary

このリポジトリへ入るものは、すべて公開可能でなければならない。

## Scope

このリポジトリが所有するもの:

- Astro frontend
- public product pages
- public manuals
- public support content
- public insights
- public structured data
- public deployable assets
- GitHub Pages build/deployment

## Out of scope

以下を置かない:

- private business information
- subsidy strategy
- private operational notes
- secrets
- credentials
- unpublished manufacturer information
- internal AI prompts
- private knowledge
- internal monitoring settings

## Cross-repository rule

Codexは明示指示がない限り、private sibling repoを読まない。

SEO関連作業に限り、happinesea/site-management の `docs/seo/happinesea-seo-policy-v0.1-2026-12-01.md` を正本として参照する。この例外は当該ファイルの読み取りに限る。正本の全文や非公開情報は本リポジトリに転記しない。取得できない場合は未確認として記録し、制作と初版公開準備は継続する。

特に以下をデフォルトでロードしない:

- happinesea/site-management
- happinesea/RadiolinkManual
- happinesea/ManualTranslationSkills

必要なpublic artifactだけを取り込む。

## Source of truth

公開site内のmanual/product contentはpublication copyであり、canonical translation/source recordそのものではない。

upstream canonical contentの意味をsite側で勝手に変更しない。
