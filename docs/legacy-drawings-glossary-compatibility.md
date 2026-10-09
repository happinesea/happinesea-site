# Legacy drawings and glossary compatibility

Historical query behavior below has been superseded by the owner-approved decision in `radiolink-static-downloads.md`: query URLs show static guidance and direct file links, without automatic download/navigation. Exact binary query responses are no longer a cutover requirement. The original static file URLs are retained.

Baseline: `origin/main` `73b30ef0cf6cf0baf2a90288b9a8b4d177f63069` (PR #24 merged).
Publication copies preserve upstream ownership; they are not new canonical masters.
Source receipts, HTTP/MIME/length/SHA-256, final URL and target route are in
`src/data/legacy-compatibility.json`. Image review evidence is in
`src/data/legacy-image-review.json`. HTTP captures and static verification are
separate observations; cached receipts retain their original observation time.
Where older receipts lack an individual capture timestamp, `observed_at` is null
with an explicit historical-capture note. The snapshot timestamp is a reconciliation
time, not evidence of a fresh HTTP observation for every source.

## Implemented scope

- Library: `/drawinglibrary`, source WordPress page 233; all six original package links retained (including F-14).
- Five drawing articles: IDs 1716, 1726, 1734, 1742, 1891, exact `/engineering-drawing/<date><id>.html` files. Original source canonicals retained.
- Seven package pages (two FIGHTER ULTRALIGHT endpoints) retain source body and images. Download Manager's dynamic controls become verified local file links, not guessed files. Plugin UI/count/empty-placeholder chrome is not editorial content and is not copied.
- Known download files: 23 audited, HTTP success recorded; **19 republished**, three spreadsheets and one old operational log BLOCKED for public republication/privacy review. None of those four files' bytes are included in public assets. Their URLs/checksums remain in the inventory. Source files/WordPress are unchanged.
- Package download receipts: seven URLs, six distinct package byte payloads; original file paths retained where the source redirects to `/wp-content/`. In total 23 unique downloadable local paths, 34 unique asset paths, 40 provenance records (including three additional direct URLs discovered through package responses). GIF bytes are unchanged.
- Glossary: `/drone-rc-glossary`, source WordPress page 141; **214 published terms**, nine legacy anchors. The Git upstream glossary source has 285 terms; unpublished additions are not automatically published. No private plugin code or new glossary master is introduced.
- Navigation/home/Insights links now reach these local routes. Homepage layout, typography, sections, carousel and article data are unchanged.

## Refresh and verification

`npm run legacy:sync` captures live approved public sources. `--reuse-assets` rechecks previously captured bytes; `--reuse-reviewed` also reuses captured READY publication copies without pretending to make new HTTP observations. These are explicit local review modes, not an automatic CMS-outage fallback.
`npm run build` still runs the existing fail-closed WordPress article sync. It also verifies every compatibility canonical and asset digest, then converts Astro directory output into exact legacy `.html` files. Missing/changed bytes or canonicals fail the build.
After a successful build, `node scripts/reconcile-legacy-compatibility.mjs` verifies output and recalculates the public surface manifest. Do not rerun the broad discovery audit to erase this compatibility evidence.

## Query download limitation

Known `?wpdmdl=<id>` URLs use a small browser-only handoff to local bytes. The direct local download link works without JavaScript. **The historical query URL itself does not return binary bytes to a non-JavaScript HTTP client on static hosting.** Those seven query URLs remain NEEDS_REVIEW, not READY. No server runtime, automatic redirects, DNS, CNAME or deployment definition is added. A separate explicit compatibility decision is required before domain cutover.

## Phase 6 and cutover

97 source posts: **26 published copies** (21 Insight articles + five legacy drawing articles), **62 NEEDS_REVIEW**, **6 NEEDS_TRANSFORM**, **3 BLOCKED**. The original Insight adapter inventory remains 21 READY because drawing compatibility is a separate bounded publication path; no taxonomy/contract/mapping is rewritten. Cross-path totals deduplicate the five drawing IDs.

Public surface: 1,353 URL records; 68 READY URL records, zero redirects marked required, ten BLOCKED, 1,265 HTTP-unverified, 645 old-domain-only image/download URL candidates, three observed broken source links, zero observed download 404s, zero observed canonical conflicts, 379 potential attachment-page orphans, 1,285 unresolved surfaces. These are incomplete discovery counts, not proof of a complete legacy crawl.

Domain cutover: **NOT READY**. Remaining gates include:

- Three spreadsheets and one operational log need owner/privacy/publication-purpose decisions; not silently removed or republished.
- Seven query-based downloads lack non-JavaScript HTTP compatibility.
- Remaining posts: six transform cases; blocked 2035 (image evidence), 1544/905 (unsupported iframe). Drawing 1716/1891 image evidence was recovered from public HTML and visually reviewed.
- Legacy archives, FAQ, other fixed pages, attachment URLs, original/derivative images and the incomplete media inventory remain unresolved.
- Existing three source 404s and unprobed routes require explicit compatibility decisions; no URL removal is approved.

Domain/DNS/CNAME/Pages destination, Actions, Search Console, Analytics and AdSense remain unchanged. Phase 6 is **PARTIAL**.

## Verification result (2026-10-07)

- `npm run validate`: PASS; 38 unit tests, Astro check (zero errors/warnings), lint, format, live 97-post inventory, live 21-article sync, static build and 23 build-output tests. The existing empty `i18n` collection build warning remains.
- Playwright: **46 PASS** across desktop/mobile (legacy compatibility, homepage editorial layout, hero controls). Legacy pages retain their exact source canonicals; all internal links and decoded local images pass; console errors, horizontal overflow and image 404s are zero on the tested surfaces.
- Every published download was fetched over local HTTP and matched its recorded SHA-256 bytes. All seven known query URLs request their verified local file in the browser. Their non-JavaScript HTTP limitation remains open.
- Actual desktop/mobile captures were inspected for the library, drawing pages, glossary and unchanged homepage. Glossary rows (214) and anchors (1–9) pass browser assertions.
- Independent read-only review: no remaining P0/P1. Source REST titles/body text/image counts/canonicals matched the library, glossary and five drawing publication copies. Filename traversal and operational-log publication findings were corrected.
- Exact extensionless legacy URLs were tested using Python's standard static HTTP server over `dist`; it redirects directory URLs to the index with the query retained. Astro preview intentionally rejects unslashed directory URLs, while Vite's default SPA fallback can incorrectly serve the homepage. Neither preview behavior was treated as evidence of compatibility. GitHub Pages deployment behavior still requires verification after an authorized deployment; this branch is not deployed and no Actions/environment settings were changed.
