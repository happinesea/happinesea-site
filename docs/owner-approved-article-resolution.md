# Owner-approved article resolution

## Scope and disposition (2026-10-09)

Baseline: `e3a45df08fe06f827ceecd67c5f15f50516fda58` (latest merged main).

| ID   | Decision                | Publication                                                                                                                                                                                               |
| ---- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1998 | TRANSFORM_AND_MIGRATE   | Remove exactly 3 Amazon advertising iframes; preserve prose, image, slug, canonical and categories.                                                                                                       |
| 1895 | TRANSFORM_AND_MIGRATE   | Remove exactly 2 Amazon search advertising scripts; preserve prose, images, slug, canonical and categories.                                                                                               |
| 1857 | TRANSFORM_AND_MIGRATE   | Remove exactly 5 Amazon advertising iframes; preserve prose, image, slug, canonical and categories.                                                                                                       |
| 905  | DEFER_TO_MANUAL_REBUILD | Unfinished Mini Pix manual concept, not a finished manual. Exact legacy path serves a static noindex notice; no inferred manual redirect. Future formal Mini Pix manual rebuild requires a separate task. |
| 1627 | Previously retired      | Unchanged; publication exclusion and exact legacy HTTP 404/no redirect retained.                                                                                                                          |

The owner explicitly approved advertising removal, not inferred product links or edits to historical article claims. Empty advertising wrappers are left in place: only the approved iframe/script literals are removed.

`src/data/wordpress-owner-resolutions.json` records each removed literal and SHA-256, whole-source SHA-256, source URL and approval date. The manifest uses the existing exactly-once literal replacement and source hash gates. Source or literal drift fails closed. Images use the existing build-time localization; all six source images were viewed and their hashes matched the existing immutable image reviews. Existing reviewed alt strings are retained.

905 is excluded from the article manifest and article counts, but remains hash-checked during inventory. Its canonical and exact path are `https://happinesea.com/radiolink-support/minipix-manual/20200511905.html`. The notice says that no formal manual text is published here and uses `noindex,follow`. Legacy refresh retains this independently reviewed notice.

## Completion accounting

- Migrated articles: **95/97** (90 Insight articles + 5 drawing articles).
- Newly migrated: **3**.
- Withdrawn: **1**, ID 1627, unchanged.
- Deferred: **1**, ID 905, with explicit exact-URL notice.
- Unresolved article owner decisions: **0**; manual rebuild remains deferred work, not a migrated article.

The REST inventory has 96 non-withdrawn candidates: READY 90, NEEDS_REVIEW 3, BLOCKED 2, DEFERRED 1. Those five raw review/blocked entries are the five drawing articles already published through the separate legacy compatibility pipeline; they are not five remaining article blockers. No raw classification gate was weakened to make this accounting green.

## Verification

- Live fetch from `https://cms.happinesea.com/wp-json/wp/v2/posts`; no public endpoint/canonical changes.
- Source tests check exactly-once advertising removal, unchanged prose and image tags, original categories and image hashes, source/literal drift rejection, and explicit 905 deferral.
- Fresh main archive compared with the branch: existing 87 Insight data records unchanged; all **92 existing article legacy HTML files byte-identical**, and all **173 existing localized Insight assets byte-identical**. Existing drawing publication records and 1627 withdrawal are unchanged.
- Desktop/mobile Playwright covers each new article at its modern and exact `.html` path, canonical, decoded images, internal links, overflow, console and CMS runtime requests; also covers the 905 noindex notice and 1627 404. Fresh captures were actually inspected.

`npm run validate` passed (unit, Astro check, lint, formatting, live CMS build and 26 build-output tests). Independent review found one notice-retention issue and one historical-HTTP-observation issue; both were fixed and re-reviewed with no remaining actionable findings. Local build/browser QA is not a claim of branch deployment to production Pages.

## Domain Cutover impact

**NOT READY.** These four article-specific owner dispositions are resolved; the three articles now have exact static aliases, and 905 has an explicit notice rather than an unexplained disappearance. This does not resolve separate fixed-page owner decisions, `/radiolink` ownership/content equivalence, Byme-A parent advertising, `/style-guide`, `/privacy-policy`, root canonical, RC6GS query-download non-JavaScript HTTP compatibility, required original-asset URL compatibility, known broken source links, or Pages deployment/cutover verification. The historical readiness audit remains an observation of its own deployed main, not a fresh audit of this branch.

DNS, CNAME, custom domain, Actions, homepage design, taxonomy and Publication Contract were not changed. WordPress remains build-time-only.
