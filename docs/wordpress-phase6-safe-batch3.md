# Phase 6 — safe article batch 3

Baseline: `1848acf14fde313b9efc8921d6c9ad7575e6a8c7` (PR #29 merged). Public source and visual review: 2026-10-08 JST.

## Publication scope

Fifteen historical WordPress RC4GS manual articles: **863, 854, 850, 39, 10, 169, 62, 77, 70, 54, 100, 185, 121, 234, 175**. No source claim, wording, title, slug, canonical, category or source alt is edited in WordPress. These are legacy publication copies, not newly corrected manuals or a replacement for upstream manual ownership.

The public source fixture records original HTML/text/hash, links, category names, original empty featured alts and inspected-image URL/hash/alternative text. All fifteen have no body images, hrefs, iframes, scripts, shortcodes or downloads. Their instructional screenshots are **content images, not decoration**. All originals were fetched, decoded and actually viewed; new alternatives describe visible menus, selections, values or diagram labels, not inferred operation or recommended settings.

The existing WordPress normalizer gains only an explicit image-bound reviewed-alt input. Existing nonempty source alt takes precedence. Different image URL, malformed/empty review or different downloaded source hash fails the build. This does not auto-generate alt, permit unreviewed content images or weaken the empty-alt gate. The existing fetch, sanitizer, schema, image download/optimization, body localization and byte-preserved GIF behavior remain unchanged; no Publication Contract or taxonomy schema changes.

`RC4GS製品マニュアル` is the actual public WordPress category name. Add this exact display label to the two existing presentation maps without changing category data, layout or homepage ordering. No manual/download equivalence is inferred from names.

## Deferred reviewed candidates

| ID   | Reason                                         | Scope-specific gap                                                                                                                         |
| ---- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 911  | image review needed                            | Mini Pix photograph has pin/connector closeups; contextual alt and its category presentation are outside this fifteen-article RC4GS batch. |
| 188  | external link uncertainty                      | `/rc4gs-manual` shortcut is not proven cutover-compatible. Do not infer manual/download equivalence from the cover.                        |
| 47   | image review needed                            | ATL is an instructional screenshot; no approved image-bound alt in this bounded batch. Not treated as decoration.                          |
| 943  | image review needed; external link uncertainty | Empty-alt body image and external Reuters/Wikipedia links require their own connected review.                                              |
| 1058 | image review needed; external link uncertainty | PMIX screen and dependencies on unmigrated mixing chapters 1075/1082/1086 remain for a connected chapter batch.                            |

These five remain NEEDS_REVIEW; no unsupported embed/script/widget or uncertain download is transformed here. Existing NEEDS_TRANSFORM and BLOCKED articles are untouched. Other remaining articles are not claimed to have been individually re-reviewed by this batch.

## Counts and compatibility

| State                                                  | Merged baseline | This branch |
| ------------------------------------------------------ | --------------: | ----------: |
| Public WordPress posts                                 |              97 |          97 |
| Migrated, including five drawings                      |              33 |          48 |
| NEEDS_REVIEW, excluding migrated drawings              |              55 |          40 |
| NEEDS_TRANSFORM                                        |               6 |           6 |
| BLOCKED, excluding migrated drawings                   |               3 |           3 |
| Exact legacy article `.html` paths, including drawings |              33 |          48 |

Adapter-only totals: 43 READY / 43 NEEDS_REVIEW / 6 NEEDS_TRANSFORM / 5 BLOCKED. Five drawings use the separate existing compatibility path; three formerly NEEDS_REVIEW and two formerly BLOCKED must not be counted again.

All fifteen original `.html` routes are byte-identical static aliases of their Insight pages, not redirects. Source canonical stays exact. The legacy inventory is reconciled against actual build output: 1,376 URLs, 174 preserved routes, 1,187 HTTP-unverified, 1,202 unresolved surfaces, 14 blocked surfaces and 621 old-domain-only asset URLs. Three known source broken links remain; zero recorded canonical conflicts/missing downloads is not exhaustive clearance.

## QA and review

`npm run validate` passed: 47 unit tests, Astro check (zero errors/warnings), lint, format, fresh WordPress inventory/sync, static build and 23 build-output tests. Build retains the existing empty `i18n` collection warning; it is not a new article error.

Playwright passed 36 desktop/mobile cases: the fifteen new articles and their exact legacy aliases (30), homepage/support smoke (4), and the full 43-article index with real category labels, source alts, image HTTP/decode, links and stress wrapping (2). Checked pages had zero console errors, overflow, broken same-origin links, failed image decode or unexpected remote images. All thirty new full-page article captures and both homepage captures were actually inspected. No homepage layout change was made.

Independent review compared all fifteen fresh REST source records and original images with fixtures, generated records and optimized image bytes. Existing 28 published records and mappings remain baseline-identical. One P2 image-alt reading error on ID234 (`V0.0.2` instead of visible `V3.0.2`) was corrected and regenerated; final unit/build/browser tests pass. No unresolved P0/P1/P2 findings. The review did not independently rerun the full suite; the reported runs are coordinator verification. Local build/browser QA does not claim branch staging deployment or production cutover.

## Domain Cutover: NOT READY

Remaining articles; `/radiolink`, Byme-A manual, `/style-guide` and `/privacy-policy`; RC6GS HTTP-only download-query/download-tag archive compatibility; and the prior homepage origin/canonical gate remain unresolved. Old media/attachment/download compatibility and unverified HTTP surfaces also remain. Owner privacy applicability and Style Guide retention decisions remain pending. No DNS, CNAME, custom domain, Actions, Analytics, AdSense or merge changes.
