# Radiolink hub and static downloads

## Owner-approved publication decision

The Git-owned `/radiolink` is the authoritative information hub, not a copy of the old WordPress landing. Its canonical is `https://happinesea.com/radiolink`. No redirect or official Japanese agency claim is introduced. It links to the unchanged 83-product catalogue on the same page, manuals, support/FAQ, manufacturer updates, articles and downloads. No unprovided AI support is displayed. Homepage, taxonomy and article source content are unchanged.

## Download inventory

`src/data/static-downloads.json` groups 30 existing download receipts by verified SHA-256: 18 distinct payloads. Six drawing files use `/downloads/drawings/`; twelve Radiolink files use `/downloads/radiolink/`. Original filenames plus a hash suffix prevent collision; the two different RC6GS DOCX payloads remain separate. No file is substituted based on a similar name. Source URLs, content type, byte length, SHA-256 and legacy static routes remain recorded. All original static files are retained.

Disposition is counted per distinct payload, not per historical receipt: **KEEP 0 / REPLACE 18 / RETIRE 0 / UNKNOWN 4**, total 22. REPLACE means a new permanent primary URL, not deletion of the old URL. The four log/spreadsheet candidates are `OWNER_DECISION_REQUIRED`, are not published, and remain unresolved. No orphan asset bulk copy or silent retirement is performed.

Legacy drawing/fixed-page/download links are rendered as normal `<a href>` links to permanent files. The 90 insight article HTML outputs remain unchanged; drawing pages are in scope only for download href replacement. Nine legacy query endpoint pages provide the same static guidance and direct links with or without query parameters. Automatic download/navigation has been removed. Arbitrary query IDs are not interpreted as new download requests. A mismatched query cannot select another file. GitHub Pages folder slash redirects are ordinary hosting behavior, not a query-to-binary response implementation.

## Cutover disposition

The old landing equivalence blocker is resolved by owner approval of the new authoritative landing. **B12 query-to-binary compatibility is resolved by the approved static-download replacement**, not by recreating WordPress/PHP semantics. RC6GS V1/V2 Kindle and V3 PDF remain distinct. The RC6GS download-tag archive and historical external source availability remain separate items; the fixed-page ledger therefore still retains RC6GS and root canonical/cutover configuration gates (2). Historical HTTP measurements in the general cutover report are not relabelled as new observations.

Domain Cutover remains **NOT READY**. Outstanding work includes root/base/public-origin configuration under the separate cutover approval, archive/other unresolved legacy surfaces and links, actually required old-origin asset compatibility, the four owner-decision files, and verification of the resulting merged main Pages deployment. This branch does not change DNS, CNAME, custom domain, Actions, CMS endpoint, or WordPress home/siteurl. Local tests do not establish production cutover readiness.

## Analytics follow-up

Ordinary file anchors retain recognizable file extensions and consistent download paths. `download` and `data-download-sha256` identify local downloads. Future analytics can attach file_download measurement to these anchors; no tracking script, network request, counter or runtime CMS dependency is added. Review analytics configuration and privacy policy separately before enabling measurement.

## Verification

The download unit test checks exact permanent and legacy file bytes, distinct paths and absence of the four unpublished files. Browser tests check desktop/mobile hub entrances, catalogue count, canonical, overflow and runtime CMS requests; GET checks validate permanent and legacy download hashes. Existing drawing/download browser tests cover images, internal links and canonical. Browser testing uses a plain static server over `dist`, because Astro preview rejects slashless legacy folder paths with `trailingSlash: always`; this is not a production host modification.

`npm run validate` passed: 74 unit tests, Astro check (0 errors/0 warnings), lint, repository-level format, live build-time CMS sync/static build and 26 build-output tests. Final unit and format checks were repeated after disposition documentation updates. Four new hub/download desktop/mobile tests and 36 existing drawing/download compatibility tests passed. Eighteen permanent files and 24 legacy static paths return HTTP 200 with exact SHA-256. Ninety insight alias HTML outputs match their pre-change build hashes; the five drawing pages only change in-scope download links. Catalogue data is unchanged. Tested internal links, image errors, overflow and runtime CMS requests have zero failures; emitted HTML/JS contains no CMS hostname or automatic download handoff. Fresh desktop/mobile screenshots were inspected.

Independent read-only review checked file identity, scope, unpublished files, query behavior, final disposition counts and fresh screenshots. All identified test/metadata issues were corrected; no remaining P0/P1/P2. Main deployment of this change has not occurred because this is a Draft PR, not a cutover release. Existing package audit reports 18 advisories (11 moderate/7 high); dependency upgrades are out of scope. Build retains the existing empty `i18n` collection warning.
