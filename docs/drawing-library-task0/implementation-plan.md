# Drawing Library Implementation Plan

**Goal:** 既存公開URLと重複防止を保ち、確認済み資料だけをhappinesea-siteの設計図ライブラリーへ展開する。

**Architecture:** Astroの既存JSON collection・download registry・legacy compatibilityを拡張する。
ローカル資料はread-only importerでreplayし、許諾・identityが不明なrecordをholdする。
既存recordのrefreshと新規record追加を明確に判定する。

**Tech Stack:** 現行Astro / TypeScript / JSON / Zod / Node test runner / Playwright。Task 0 inventoryはPython 3.10+、optional rarfile 4.2。

**Spec:** [content-model.md](content-model.md)、[taxonomy.md](taxonomy.md)、[storage.md](storage.md)。

## 全Phase共通条件

- 新規drawingのProduction SoTはhappinesea-site。WordPressへ登録しない。
- sourceは変更しない。public repositoryへ非公開本文・許諾不明binaryを入れない。
- legacy URL・package identity・download aliasを維持し、既存pageの新規duplicateを作らない。
- draft/review/rights確認/publishedを分離する。titleやCRCの一致は許諾・SHA一致を意味しない。
- 各Phaseは専用branch・Draft PR。今回および後続の実装だけでmerge/deployを許可したとは扱わない。
- GA4 config、DNS/CNAME、production設定はこの計画の変更対象に含めない。

## Phase 1: data model + importer + duplicate protection

- [ ] `src/content.config.ts`へ小さなdrawings schema、`src/data/drawings.json`と既存対応registryを追加する。開始時は公開済みrecordのみ。
- [ ] `scripts/lib/`の既存download安全境界・hash関数を調べ、`scripts/import-drawings.mjs`にdry-runを先に実装する。
- [ ] inventoryのpath/bytes/SHAをreplayし、source root外へのアクセス・sourceへのwrite・output collisionを拒否する。
- [ ] 既存file SHA/package ID/URLのregistryを先に構築。完全一致はreuse、候補一致はhold、既存record matchはrefreshにroutingする。
- [ ] 同名異内容、非ASCII名、全角/大小文字、slug衝突、member traversal、symlink、分割/nested/暗号化archive、rights未確認をtestする。
- [ ] 同じinputのdry-run結果が2回一致し、sourceのSHAが不変であることを確認する。

Deliverable: importerのreview可能なdry-runとschema。新規binary公開0、WordPress mutation0。

## Phase 2: drawing library index redesign

- [ ] `/drawinglibrary/`専用Astro indexを追加し、既存legacy route生成から同じlibrary routeだけを除外する。
- [ ] Radiolinkのカード・filter表示方法を再利用し、2カテゴリ、result count、mobile/desktop gridを実装する。
- [ ] 6既存recordのcardsを表示し、FIGHTERの2packageを1cardへ集約する。公開保留の新規候補は出さない。
- [ ] JSなし、keyboard filter、aria-live、画像placeholder、0件表示をtestする。
- [ ] old index URL/slash variantsが200、6旧detail linkが存続、route二重生成0をbuild outputで確認する。

Deliverable: 既存6件だけの新index。UI QA: mobile 390px、desktop 1440px。

## Phase 3: detail page template

- [ ] `DrawingDetail.astro`を既存BaseLayout、Breadcrumbs、ResponsiveMedia、withBaseで作る。
- [ ] title/original title、短いoverview、metadata、download link、任意related IDを表示する。
- [ ] candidate/private fieldをHTMLへ出さず、未確認画像・rights未確認downloadを表示しない。
- [ ] trusted textをescapeし、本文HTMLを無審査で挿入しない。
- [ ] template fixtureでformat/bytes、リンク拡張子、長い日本語title、複数倍率、画像なしをtestする。

Deliverable: templateとfixture QA。公開routeの新規大量追加0。

## Phase 4: existing drawing migration/maintenance

- [ ] maintenance ledgerのlibrary1、article5、package7、tag4、download6と各aliasをroute tableへ固定する。
- [ ] F-14 2168のF4Dを含む旧slugを保持。F4D 1886と混同しない。
- [ ] FIGHTER 1712/1717は同じrecord/downloadを参照し、両入口を維持する。未一致の1号軽飛行機とは結合しない。
- [ ] 5 source matchは新detailを増やさず既存pageをrefresh。article本文の意味・画像・参照リンク・canonicalを確認する。
- [ ] query URLは既存案内＋通常link、download binaryのSHA・MIME・alias、全旧URL 200をtestする。
- [ ] permission根拠の見直しは既存公開という事実と分離し、未解決事項をownerへ提示する。

Deliverable: 6既存recordを同じURLで維持するmappingと確認結果。新規duplicate detail0。

## Phase 5: new unique drawings bulk import

- [ ] ownerのrights evidence、RC適用範囲、title、groupingを確認し、承認recordだけ対象manifestへ固定する。
- [ ] 37新規候補を一度に自動公開せず、まず代表例をdry-runしてroute・画像・downloadをQAする。
- [ ] 新規binaryのSHAをreplayし、既存file/member・nested archive・variantとの重複を再照合する。
- [ ] 配布bundleを選び、Thumbs.db等を除外する。別bundleを作る場合はderived artifactとしてsource SHA群と新SHAを登録する。
- [ ] 画像の許諾、最適化出力と元資料のprovenance、Japanese title reviewを完了する。
- [ ] 再importがidempotent、slug/file衝突0、保留recordがbuild/sitemapへ漏れないことをtestする。

Deliverable: 承認済みunique recordのみのDraft PR。Task 0の71fileすべてを無条件にコピーしない。

## Phase 6: full QA / sitemap / deploy readiness

- [ ] `npm run validate`と既存build-output tests、drawing単体test、desktop/mobile Playwrightを実行する。
- [ ] source SHA replay、duplicate判定、非ASCIIpath、同名異content、archive traversal拒否を再確認する。
- [ ] 全legacy URLとalias、canonical一意性、sitemap内published record、未承認record不在、404/内部link/画像を確認する。
- [ ] dist総容量と最大binary、Git payload増分、既存GA4設定下のfile_download対象linkを確認する。設定変更はしない。
- [ ] `git diff --check`、意図した変更pathのみ、Draft PRのHEADを確認し、ownerへdeploy readinessを報告する。

Deliverable: QA証拠・deploy readiness。mergeとproduction deployは別の明示指示まで実施しない。

## 特にreviewする点

同じ機種・異設計の誤統合、CRCをSHA証明と誤認、実機資料のRC扱い、旧slugの誤同定、二重route生成、nested archiveの無審査公開。
Phase 1を先に進め、UIと大量importを混ぜない。rollbackは各Phaseのsource/data変更とroute table単位で可能にする。
