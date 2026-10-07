# Phase 6 — RC4GS linked manual batch

Baseline: `7f92e88a52d356eca679e7ab5c9c2538e338fd02` (PR #30 merged). Public source/image/link review: 2026-10-08 JST.

## Forty-article clustering

Literal public WordPress categories and body links are recorded for all forty in `tests/fixtures/wordpress-phase6-review-batch4.json`. Clustering is review planning, not taxonomy modification or approval of deferred content.

| Cluster                          | IDs                                                                         | Dependency / gate                                                                                                                                                                                     |
| -------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RC4GS manual and ATL support: 15 | 188, 47, 1058, 1075, 1082, 1086, 1054, 1050, 85, 92, 30, 129, 191, 196, 199 | This batch. 1058 links to already migrated 160 plus 1075/1082/1086; 188 links to the manual archive shortcut. Chapters also share the existing manual index. 196 has a real Yahoo! R6FG product link. |
| Byme-A manual series: 6          | 1691, 1687, 1682, 1679, 1675, 1673                                          | Review as one series alongside the existing manual index; body image review still required. Do not equate downloads/manuals by name.                                                                  |
| Mini Pix manual: 1               | 911                                                                         | Featured content-image review; retain actual category.                                                                                                                                                |
| News only: 13                    | 2086, 2051, 2012, 1947, 1758, 1559, 1413, 1350, 1118, 1090, 977, 943, 107   | Dependency subgroups: 1947 → 943; 1758 → 1413. 2051 has a real manual download/widget dependency to review separately. Other image/external-link gates remain.                                        |
| Multiple categories: 2           | 1500, 375                                                                   | Preserve both literal categories; do not collapse news/product or news/experience. Image review remains where present.                                                                                |
| Experience: 2                    | 1382, 114                                                                   | Image review; 1382 external PSE link requires destination review.                                                                                                                                     |
| Radiolink video: 1               | 1548                                                                        | Existing YouTube allowlist host, not an unsupported iframe. Image/embed review deferred; no allowlist expansion.                                                                                      |

No unsupported embed/script/widget is transformed in this batch. Inventory classification alone is not permission to publish any of the remaining twenty-five.

## Publication and image review

Fifteen articles are newly approved. Original body text, titles, links, slug, canonical and actual category are preserved, including historical wording and inconsistent explanations; this batch does not correct manual claims or replace upstream source ownership. Article 47 remains `radiolink-support`, not relabelled as `rc4gs-manual`.

All 33 distinct candidate images were fetched, decoded and visually inspected. Reviewed alternative text is bound to exact source URL and SHA-256. Twenty-six empty-alt body image placements and eight empty-alt featured placements receive visible-image descriptions; two images are used in both roles. The existing nonempty featured alt on 196 (`RC4GS送信機`) is retained. No image is guessed to be decorative.

The only loader change passes explicit reviewed body alts through the existing localization/sanitizer. An empty/unreviewed alt, changed source URL, missing downloaded hash or hash mismatch fails closed. Existing source alt takes precedence. Fetch, schema, sanitizer allowlist, image download/optimization, GIF byte preservation, outage handling and legacy article alias architecture are reused. No Publication Contract or taxonomy schema change.

## Linked legacy compatibility

All fifteen source canonicals and five distinct linked destinations were fetched successfully (HTTP 200). The Yahoo! destination title/canonical confirms the actual R6FG item; it is not substituted with a similarly named product.

Three evidence-bound compatibility copies use the existing legacy renderer:

| Legacy path               | Canonical / equivalent destination                  |
| ------------------------- | --------------------------------------------------- |
| `/news/202006281075.html` | `/radiolink-support/rc4gs-manual/202006281075.html` |
| `/news/202006281086.html` | `/radiolink-support/rc4gs-manual/202006281086.html` |
| `/rc4gs-manual`           | `/category/radiolink-support/rc4gs-manual`          |

The old news URLs were observed resolving to the canonical chapters. Their static compatibility copies preserve the same sanitized body and localized images, without rewriting article hrefs. The shortcut's ten actual archive URL/title entries match the already preserved canonical archive. Its compatibility copy retains canonical archive pagination destinations; it is not mapped to a different-version manual or a download. No redirect is generated. This does not claim all archive variants or downloads are cleared for cutover.

The existing 43 published records and mappings remain baseline-identical. All fifteen new canonical `.html` paths are exact static copies of their Insight pages. Three additional linked compatibility paths are separately published; they are not counted as additional migrated articles.

## Counts / cutover

| State                                                     | Merged baseline | This branch |
| --------------------------------------------------------- | --------------: | ----------: |
| Public WordPress posts                                    |              97 |          97 |
| Migrated including five drawings                          |              48 |          63 |
| NEEDS_REVIEW excluding migrated drawings                  |              40 |          25 |
| NEEDS_TRANSFORM                                           |               6 |           6 |
| BLOCKED excluding migrated drawings                       |               3 |           3 |
| Canonical exact article `.html` routes including drawings |              48 |          63 |

Adapter-only: 58 READY / 28 NEEDS_REVIEW / 6 NEEDS_TRANSFORM / 5 BLOCKED. Do not double-count five drawings (three formerly REVIEW, two formerly BLOCKED).

Reconciliation verifies actual static output, not planned routes: 1,376 inventoried URLs, 192 preserved routes, 1,184 unresolved surfaces, 1,187 HTTP-unverified URLs, 14 blocked surfaces, 621 old-domain-only asset URLs and three known source broken links. Zero recorded canonical conflicts/missing downloads is not exhaustive clearance.

**Phase 6: PARTIAL. Domain Cutover: NOT READY.** Remaining articles; legacy Radiolink/Byme-A/style-guide/privacy-policy decisions; RC6GS HTTP-only query/download-tag compatibility; old media/attachment/download paths; and the prior homepage origin/canonical gate remain open. Owner privacy applicability and style-guide retention decisions are not made here. No homepage visual, DNS, CNAME, custom domain, Actions, Analytics, AdSense or merge changes.

## Verification

`npm run validate` passed: 50 unit tests, Astro check (zero errors/warnings), lint, format, fresh WordPress inventory/sync, static build and 24 build-output tests. The existing empty `i18n` collection warning remains. A new build-output regression verifies the Pages base for every localized article body image in Insight routes, exact aliases and the two news variants.

Playwright passed 42 desktop/mobile cases: fifteen new articles and their canonical `.html` aliases (30), three linked compatibility paths (6), homepage/support smoke (4), and the full article index (2). Checked pages had zero console errors, horizontal overflow, failed image decode/404, broken same-origin links or unexpected remote images. Original first-party body links were additionally requested against the local cutover-compatible paths, with canonical checks. All 36 article/compatibility full-page captures were created; representative desktop/mobile article, shortcut and homepage captures were actually inspected.

Astro preview enforces `trailingSlash: always` with a local 404 for nonslash directory paths. Live existing GitHub Pages category/manual directory URLs were observed returning 301 to slash form. Final browser QA therefore serves the unchanged static `dist` with ordinary directory redirects; it does not change Astro, Pages or Actions configuration. Exact `.html` aliases return 200 without redirect. The new shortcut directory and its index are verified locally; no new branch staging deployment is claimed.

Independent review inspected all 33 originals, verified source fields, all 35 generated image outputs and unchanged baseline records, reran three focused tests and inspected six fresh screenshots. P1 missing Pages base on body images was fixed at the two renderers; P2 whitespace-only source alt fallback was fixed without overwriting nonblank source alt. Both have failing-before/passing-after regressions and are closed. No remaining actionable P0/P1/P2 findings. The full validate/browser runs are coordinator verification, not reviewer reruns of the entire suite.

Local QA is not branch staging deployment or domain cutover approval. The recommended next review cluster is the six Byme-A chapters with their existing manual index, followed by image-only candidates such as Mini Pix 911; this is not advance approval to publish them.
