# Legacy public surface / cutover readiness

## Scope and evidence

This is a discovery snapshot, not approval to switch domains, delete URLs, or
generate redirects. Reconciled baseline: `origin/main` commit
`fd0eb42507a45901c1378b3c8e136b70e223a552` (PR #23 merged). The homepage design
is unchanged. The machine-readable inventory is
`src/data/legacy-public-surface.json`; rerun with
`node scripts/audit-legacy-public-surface.mjs`.
After a fresh build, run `node scripts/reconcile-legacy-public-surface.mjs`
to verify article aliases and refresh migration counts without repeating source
HTTP probes. `observed_at` remains the original HTTP discovery timestamp;
`reconciled_at` records the newer static-output verification. Source HTTP status
is not replaced with an inferred 200 merely because local output exists.

Sources: unauthenticated published WordPress REST posts/pages/categories/media,
public `ufaq` records, Yoast sitemap index/children, links in public article/page
HTML, and existing frontend source links. Each entry retains provenance,
canonical where available, dependencies, and explicit unresolved status.

Public REST returned 97 posts, 22 pages, 11 categories, 5 FAQ records, and 385
media records. Media pagination advertises 397: the missing 12 are not inferred,
accessed with privileged credentials, or considered removed.

Snapshot: **1,340 URL records**: 97 posts (including five drawing posts), 22 REST
pages, 11 category archives, one drawing library, one glossary, 11 FAQ-like URLs
(including the five REST FAQ records), 27 download endpoints/archives, 23 file
URLs, 649 image URLs and 385 attachment pages. These overlapping source counts
are not additive; the exact disjoint classification is in `summary.by_type`.
There are 1,282 HTTP-unverified records, eight blocked surfaces, 672 original
asset URL compatibility candidates and 379 possible attachment-page orphans.
There are 21 verified exact legacy article outputs, zero article redirects
required and 1,319 unresolved surfaces. Only 40 HTML routes and 30 original assets were probed;
14 attempts remained unverified. Two supplemental GET probes returned HTML with
HTTP 200 for the drawing library and glossary; their content publication remains
unreviewed. These two observations are recorded separately in discovery metadata.

Three observed 404s: `/minipix-manual-multicopter`, its `/embed` child, and
`/news/_wp_link_placeholder` (the unresolved article 2079 link). No file download
404 was observed in the bounded probes; download completeness/integrity remains
unverified. Canonical conflicts observed: zero after ignoring percent-escape
case in comparison only; stored source URLs are never rewritten.

HTTP probes are deliberately bounded (two concurrent requests, short deadlines,
40 rendered routes and 30 original assets). Checkpoints preserve discovery before
probes. Unprobed/timeout routes remain `UNVERIFIED`, not 404. An observed HTTP
error does not authorize removal. The snapshot is explicitly incomplete; zero
observed errors is not proof of zero legacy errors.

Exact URLs, including query strings, case and percent encoding, are retained.
Counts are URL records, not necessarily unique articles/files: attachment pages,
image variants, download endpoints and taxonomy archives are separate surfaces.
`orphan_page_candidates` means REST attachment pages with no other discovered
inbound provenance, not confirmed orphan pages. External asset hosting is outside
the same-origin route inventory and must still be reviewed per migration batch.

## Critical compatibility work

- `/drawinglibrary`: one library page, five drawing-category posts, and download
  endpoints/assets are inventoried. The three homepage drawing links alone are
  not completion evidence. Download byte integrity, actual destination, rights,
  dependencies and exact-path publication remain review gates. Download endpoints
  also include download taxonomy/tag archives; they are not counts of CAD files.
- `/drone-rc-glossary`: retain the existing URL. Existing WordPress repository
  `loveapple/wordpress` at `d768497ac62d2426c61cdbafdcbabdb2cd1050de` contains the
  `drone-rc-glossary` plugin and its `data/glossary.json` source; plugin code reads
  that file. Do not create another canonical glossary or copy private operational
  code into this public repository. Public content extraction, internal anchors,
  metadata and compatibility output still require a separate bounded change.
- `/radiolink`, `/radiolink-productions-manual`, `/radiolink-q-and-a` and its
  wheeler FAQ child: legacy routes remain in scope even when newer product/support
  routes exist. No redirect is assumed approved.
- Category archives, fixed pages, attachment URLs and original
  `/wp-content/uploads/` asset URLs need compatibility decisions. Local article
  asset localization does not preserve those original URL paths by itself.
- Existing frontend links to the old domain are inventoried from source. They
  will point to the new frontend after domain cutover, so a currently working
  WordPress link does not satisfy the cutover gate.

## Article migration relationship

PR #23 is merged; this audit branch incorporates that main baseline. All 21
published article copies and exact legacy `.html` outputs are verified against
the merged manifest. Each alias must be byte-identical to its generated Insight
article and retain the exact canonical before promotion to `READY`.
`target_route` is the exact legacy path; `publication_route` is the corresponding
`/insights/<slug>/` route. Missing/mismatched output or canonical drift fails
reconciliation before inventory mutation. No redirects are required for these
21 paths. Source HTTP observations, original asset compatibility and all
unmapped surfaces retain their existing evidence/status. Phase 6 article counts:
97 total, 21 migrated, 65 NEEDS_REVIEW, 6 NEEDS_TRANSFORM, 5 BLOCKED.

Remaining transformation/blocker investigations are not bypassed:

- 2079: unresolved link; require verified destination, not guessed replacement.
- 1998, 1895, 1857, 1627, 1577: legacy advertising/script; separate article-level
  review must distinguish advertising from meaningful prose before removal or
  conversion. No script is admitted to the sanitizer in this batch.
- 2035, 1891, 1716: missing image evidence; remain blocked pending source recovery
  and meaningful alt review. Drawing post 1891 is therefore not safe to publish
  merely because its old route exists.
- 1544, 905: unsupported iframe; retain blocked status. No new host allowlist or
  automatic static substitute is introduced.

## Domain cutover gate

**NOT READY. Phase 6 remains PARTIAL.** Required before user-approved cutover:

1. Reconcile every legacy route with preserved output, explicit redirect,
   approved external hosting or an approved withdrawal. No unapproved deletion.
2. Resolve discovery gaps (including media pagination and deferred attachment
   pages), HTTP unknowns, canonical conflicts and orphan candidates.
3. Verify critical drawing downloads and glossary/FAQ compatibility, including
   original asset URL handling. Zero unexplained 404 is not yet established.
4. Continue small article batches; do not force blocked content through gates.
5. Verify static output and current staging after authorized deployment. Existing
   build-time WordPress fetch is not a public runtime dependency; CMS outage must
   fail the next build while preserving the already-deployed static site.

No DNS, custom domain, CNAME, Pages architecture, Actions, Search Console,
Analytics or AdSense change is included. Domain cutover remains a user decision.

## Verification

- `npm run validate`: passed (unit, Astro check, lint, format, live WordPress
  inventory/sync, static build and 23 build-output tests). The reconciled baseline
  passed 35 unit tests, including eight audit/reconciliation tests. All 21 exact
  legacy aliases were copied during the fresh build and verified again afterward.
- Local static preview: all 21 articles/exact aliases plus homepage/support and
  carousel desktop/mobile Playwright, 56 passed. First-party console errors,
  overflow, broken internal links and image failures: zero in tested routes;
  legacy aliases returned HTTP 200 without redirects. Existing narrowly matched
  YouTube player permissions-policy diagnostics remain separately annotated,
  not a claim of zero messages from every third-party frame. No homepage
  markup/CSS changes are part of this reconciliation.
- Independent read-only review: no P0/P1/P2 findings. Snapshot is not a claim that
  all legacy routes, downloads or canonicals have passed QA.
- Branch deployment/CI is not claimed. Main run
  [37237900687](https://github.com/happinesea/happinesea-site/actions/runs/37237900687)
  for `fd0eb425` passed check but failed build with TimeoutError after WordPress
  inventory; deploy/browser-check were skipped. This observation does not establish
  a server root cause. The successful local live sync/build is separate evidence,
  not proof of a successful Pages deployment. No workflow, protection or deployment
  settings are changed.
