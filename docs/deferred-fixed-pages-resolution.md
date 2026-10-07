# Deferred fixed pages: cutover dispositions

Historical PR #28 decision snapshot. Follow-up/current six-page decisions: [fixed-page-safe-transforms.md](fixed-page-safe-transforms.md). Counts below describe that original task, not the current readiness ledger.

Baseline: `85ffe04618498d20527504ae544eac86efc7cdba` (PR #27 merged). Public source observations: 2026-10-07. Scope: precisely the eleven deferred fixed pages, not article migration or a domain switch.

## Final classification

|   ID | Legacy path                                         | Disposition           | Outcome / remaining gate                                                                                                                                                                                                                                  |
| ---: | --------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2122 | `/rc8x_firmewar_upgarde`                            | PRESERVE_STATIC       | Preserve original eleven-step guide image and source sentence; the RC8X manual video is not a replacement.                                                                                                                                                |
| 2108 | `/radiolink-q-and-a/rssi-test`                      | PRESERVE_STATIC       | Preserve complete procedure, conditions and two diagrams; do not substitute an RC8X-only procedure.                                                                                                                                                       |
| 1405 | `/radiolink-productions-manual/pixhawk-user-manual` | PRESERVE_STATIC       | Preserve image, supported models, Japanese availability text and official English link.                                                                                                                                                                   |
|  969 | `/radiolink-productions-manual/r6dsm-manual`        | PRESERVE_STATIC       | Preserve all specifications, binding/mode/antenna instructions and two images.                                                                                                                                                                            |
|   14 | `/`                                                 | MAP_TO_EXISTING_ROUTE | Existing user-approved Git-owned homepage stays unchanged; no duplicate CMS page or redirect. Staging canonical is not the legacy root canonical; domain/canonical transition remains gated.                                                              |
| 1160 | `/radiolink`                                        | TRANSFORM_REQUIRED    | **Not equivalent** to current catalogue: old RC4GS V2/RC6GS V2 banners and manual entrance are absent from it. Do not overwrite the Git-owned route or redirect. A reviewed legacy representation/access decision is still needed.                        |
| 1172 | `/radiolink/rc4gs`                                  | TRANSFORM_REQUIRED    | Source is RC4GS V2, not a newer-version product. Static flow can replace the scroll-pinned header script, but preserve every claim, image and meaningful GIF. Detailed image alternatives/motion review still required.                                   |
| 1664 | `/radiolink-productions-manual/byme-a-manual`       | TRANSFORM_REQUIRED    | Retain cover and six chapter links. Amazon iframe references ASIN B09GYM5NCC; the request failed. Confirm a real ordinary product link before transformation; do not invent it from the ASIN. Chapter dependencies remain unmigrated.                     |
| 1344 | `/radiolink-productions-manual/rc6gs-manual`        | TRANSFORM_REQUIRED    | Preserve V1/V2 Kindle versus V3 PDF distinction. Widget yielded a real PDF; its static download/endpoint contract and full identity review remain. Amazon link returned HTTP 404 to this client and iframe request failed; do not remove either silently. |
|  207 | `/style-guide`                                      | TRANSFORM_REQUIRED    | Legacy theme demonstration, not the new site's design system. Images were inspected; gallery alternatives, attachment destinations and anchor/layout representation still require review. No deletion approval exists.                                    |
|    3 | `/privacy-policy`                                   | BLOCKED               | Source describes WordPress login/comments/cookies. Owner must confirm static-site applicability and current contact details. No legal claims are rewritten.                                                                                               |

PRESERVE_STATIC: four. MAP_TO_EXISTING_ROUTE: one. TRANSFORM_REQUIRED: five. BLOCKED: one. REMOVE_WITH_EXPLICIT_APPROVAL: zero. **Seven page-level cutover gates remain**, including the mapped homepage's origin/canonical gate; six require content/transform/owner decisions. Classification does not mean automatic publication or removal.

## Source and asset fidelity

All eleven legacy page requests returned HTTP 200. Public REST body digests and rendered-page canonicals are recorded separately. Existing homepage/catalogue source files and canonical handling are unchanged. The empty homepage REST body is not treated as proof of an empty rendered site: rendered headings show article, drawing and product entrances. The approved homepage replaces that entry function, not the old theme verbatim.

Thirty-seven distinct content image URLs were downloaded, decoded and visually inspected, including source gallery thumbnails and the first GIF frame. No detailed GIF-motion equivalence is claimed. Six images for the four preserved pages are copied byte-for-byte to their observed `/wp-content/` paths. Their non-empty Japanese alt text describes only visible image content; no unseen model identity or new instruction is inferred. The guide's original steps remain in the original image, not an AI-authored replacement procedure.

The other 31 inspected images remain source evidence only; they are not silently published with guessed alt or copied en masse. No script, Amazon iframe or download widget is removed from a published page: those pages are not published by this task. A safe transform must retain the source item identity, body and access to equivalent information.

## Manual and download equivalence

The current Astro `/manuals/` index contains RC8X overview/chapter 1/chapter 2 only. It does not replace Byme-A, PIXHAWK, R6DSM or RC6GS V1/V2/V3 manuals. The RC8X firmware and RSSI video entrances are not one-to-one copies of the old guide/procedures. No name-based manual mapping is applied.

- PIXHAWK's observed official English URL is retained and was HTTP 200 at capture.
- Byme-A's six chapter URLs were HTTP 200 at source but remain outside this fixed-page publication scope.
- `/rc4gs-manual` returned HTTP 200 at source; compatibility of that short route remains unresolved. No guessed redirect is created.
- RC6GS V3's actual widget query returned `application/pdf`; checksum and received-byte count are recorded. A similarly named existing RC6GS PDF/DOCX is not substituted. The downloaded file is review evidence, not a newly deployed download or an approved non-JavaScript query-compatible endpoint.
- Style Guide's six attachment links returned image data. They are not assumed to be equivalent archive/article routes and are not redirected.

Detailed evidence: `src/data/legacy-fixed-page-resolution.json`. Literal source bodies and reviewed image digests/alternatives for the four preserved pages: `tests/fixtures/deferred-fixed-pages.json`.

## Verification and cutover

`npm run validate` passed: 43 unit tests, Astro check, lint, format, static build and 23 build-output tests. Playwright passed all 136 desktop/mobile tests with four workers: 62 compatibility pages, canonical/legacy paths, image decode and same-origin delivery, internal links, recorded download bytes/query handoffs, and unchanged homepage/catalogue smoke. Checked routes had zero console errors, overflow, internal broken links and image 404s. All eight fresh desktop/mobile captures for the four new pages were visually inspected. The original guide remains an image with small text on mobile; no replacement instructions were invented.

Independent review found no P0/P1 issues. Its P2 finding, loss of a literal empty `#` in a legacy FAQ link, was reproduced in the browser test and fixed in the existing compatibility renderer; the same test now passes. The initial highly parallel run also had three preview-server/image failures; the complete four-worker rerun passed without unrelated production changes. Source-site HTTP success is not proof of static compatibility.

Inventory reconciliation: preserved routes 127 → 137, HTTP unknown 1,235 → 1,187, unresolved surfaces 1,247 → 1,237, old-domain-only assets 645 → 639. Global blocked URL count is 14 (including the privacy policy); this is distinct from the eleven-page disposition count and seven page-level cutover gates. Article migration is unchanged: 33 migrated, 55 NEEDS_REVIEW, six NEEDS_TRANSFORM and three BLOCKED. Known broken source links remain three; zero observed missing downloads/canonical conflicts is not an exhaustive cutover clearance.

Domain Cutover: **NOT READY**. This bounded task does not resolve remaining article migration, old-origin assets, privacy applicability, non-equivalent product/manual content, unsupported embeds/widgets or the domain/canonical release gates. It does not change homepage visual, article migration logic, Publication Contract, taxonomy schema, DNS/CNAME or Actions. No merge or removal is performed.
