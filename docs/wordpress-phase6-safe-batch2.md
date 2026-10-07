# Phase 6 — safe article batch 2

Baseline: `origin/main` `2ba40a05161ff55e62c00b6e62f96e5d2784539c` (PR #25 merged).

## Scope and source review

This is a bounded publication batch, not a redesign or a domain cutover.
Public WordPress REST source was reviewed for IDs **2005, 1779, 1774, 1635, 1546, 160, 1**.
The requested 10–20 article quantity is **not met**: seven were accepted, rather than weakening image or content-preservation gates to meet a count.

`tests/fixtures/wordpress-phase6-review-batch2.json` records public source provenance, exact source body hashes/text/links, category names/order, video IDs and visual image decisions.
The existing normalizer, sanitizer, schema, fetcher and image pipeline are unchanged.
No source article body, slug, canonical or category was rewritten. Historical announcements and firmware references retain their original dates and wording; this migration is not a new statement of current availability.

- Six existing featured images are downloaded and optimized by the existing pipeline. No body images occur in the seven accepted sources.
- ID 1635 has no featured image; none is invented.
- ID 1 retains its existing `Radiolinkロゴ` alt. No alt is generated or edited.
- Title/video previews, the manual cover and the supplemental promotional illustration were visually reviewed as nonessential previews, not instructional diagrams.
- ID 1546's purchase QR points to the same Amazon product identified in the source body.
- Only the existing YouTube embed allowlist is used. No unsupported iframe, script or shortcode is accepted.

### Deferred candidates

| ID   | Reason                                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2051 | Download widget behavior requires preservation; its empty-alt image conveys information about use in water.                                      |
| 107  | An existing HTTP source link would lose its href under the unchanged sanitizer. Do not silently remove it or guess a replacement.                |
| 1673 | The empty-alt featured image contains wiring and control information, not decoration.                                                            |
| 375  | The actual `experience` category is not registered in the existing presentation maps. No display/taxonomy work is included here.                 |
| 1548 | Independent visual review found manual-information QR codes absent from the body. Do not classify them as decoration merely to accept empty alt. |

## Legacy compatibility

All seven original `.html` paths remain exact static content aliases, not redirects; their source canonical and Insight route are retained.
The existing five drawings remain on the separate legacy-compatibility path, not duplicated into Insights.

Two source links in ID 160 still point to legacy firmware download pages. Their hrefs are preserved; this article migration does **not** claim those download endpoints are ready for domain cutover.
Fixed pages, FAQ and category archives receive inventory/HTTP evidence only. No compatibility routes for them are created by this batch.

## Verification and remaining work

The homepage, taxonomy schema, Publication Contract, WordPress migration logic, DNS, CNAME and Actions definitions are unchanged.

### Proposed branch totals (not yet merged)

| State                                      | Merged baseline | This branch |
| ------------------------------------------ | --------------: | ----------: |
| Published source posts                     |              97 |          97 |
| Migrated, across Insight and drawing paths |              26 |          33 |
| NEEDS_REVIEW, excluding migrated drawings  |              62 |          55 |
| NEEDS_TRANSFORM                            |               6 |           6 |
| BLOCKED, excluding migrated drawings       |               3 |           3 |
| Exact legacy article `.html` routes        |              26 |          33 |

The Insight adapter alone reports READY 28 / NEEDS_REVIEW 58 / NEEDS_TRANSFORM 6 / BLOCKED 5. Five drawings are already published through the independent compatibility path (three formerly NEEDS_REVIEW, two formerly BLOCKED); do not count them twice or move their canonical ownership.

### Bounded fixed-page / FAQ / archive inventory

`src/data/legacy-editorial-surface-review.json` records public REST provenance, source-body hashes, observed HTTP status/content-type/final URL, HTML hashes/canonicals and source dependencies.

- REST: fixed pages **22**, published FAQ posts **5**, category archives **11**. All advertised records were received.
- These 38 routes: **36 HTTP 200**, **2 UNVERIFIED** due to timeouts (`/radiolink-productions-manual`, `/sample-page`). A timeout is not evidence of removal or a 404.
- Fixed pages: **2 already READY** (drawing library/glossary), **20 MIGRATE**. Existing readiness is retained, not promoted by HTTP success.
- Five supplemental FAQ URLs (archive and percent-escape variants): **4 HTTP 200**, **1 UNVERIFIED** (`/ufaq`). The full existing 11-row FAQ URL surface is covered by these probes plus REST/page probes; these are not eleven FAQ articles.
- All 11 category archives return HTTP 200 but remain **MIGRATE**. No archive routes are implemented here.
- Combined: **43 URL observations**, **40 HTTP 200**, **3 UNVERIFIED**; no observed 4xx/5xx in these probes. Known canonical-conflict count remains zero, not a claim that the entire legacy surface is proven conflict-free.

### QA

- `npm run validate`: passed (40 unit tests, Astro check 0 errors/warnings/hints, lint, format check, build, 23 build-output tests).
- Regression test was first observed failing for missing newly reviewed articles, then passing after generation.
- Initial full validation exposed an old test assumption that every approved article had a video, decorative image and empty alt. The test now explicitly checks the three reviewed non-video articles, the one image-free source and the existing logo alt. Other 25 articles retain their YouTube requirement. No production rendering behavior was changed to satisfy the test.
- Migrated-article Playwright: **14/14** (seven articles × desktop/mobile), including exact `.html` HTTP 200, canonical, local decoded images, local links, zero horizontal overflow and console checks.
- Existing home/editorial/carousel/card Playwright: **16/16**. Desktop/mobile screenshots were actually captured and inspected; no homepage visual changes were made.
- On tested routes: first-party console errors **0**, broken internal links **0**, image 404/decode failures **0**, unexpected remote images **0**, legacy route/canonical drift **0**.
- YouTube iframe source IDs and allowlisted DOM are preserved. Third-party video playback itself is **not verified**: some captures show an empty iframe area. Do not equate first-party console QA with proof of external player availability.
- Independent read-only review: P0/P1 none. The reasonable P2 concerning ID 1548's QR information was addressed by deferral.

### Domain Cutover: NOT READY

Legacy inventory: **1,353 URLs**, **75 preserved routes**, **1,239 HTTP-unverified**, **1,278 unresolved surfaces**, **10 blocked surfaces**, **645 old-domain-only asset URLs**, **3 known broken source links**. Known canonical conflicts: **0**; observed missing downloads: **0**, not an exhaustive download guarantee.

Compared with baseline, HTTP-unverified drops from 1,265 to 1,239. Readiness does not follow from source HTTP success.
Fixed-page/FAQ/archive compatibility, the remaining articles, unresolved old asset URLs, four existing excluded download files and non-JavaScript query-download compatibility remain cutover blockers.
No staging deployment or domain change is performed by this PR; local static-build/browser QA is distinct from live production or branch-staging verification. Phase 6 remains **PARTIAL**.
