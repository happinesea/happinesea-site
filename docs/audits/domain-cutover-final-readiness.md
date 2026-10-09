# Domain Cutover Readiness Gate — fresh main audit

## Decision

**READY_WITH_OWNER_ACTIONS**. REAL_BLOCKER = **0**; HOSTING/DNS_REQUIRED = **0**.
Remaining action groups: **3 OWNER_ACTION_REQUIRED + 3 POST_DEPLOY_VERIFICATION**.
These are not six missing legacy routes. Only explicit deployment approval is required
to publish the latest code; Google services may remain independently disabled.

Audit performed 2026-10-09 UTC against main `3de2fafd797b9e47a868d969aa1fb7d6242470cb`
(PR #45 merged, including the PR #46 source-origin fix). No deployment, DNS, Pages,
custom-domain, Google account, or feature-flag settings were changed.

## Evidence boundaries

- Latest-main production artifact: 303 HTML documents; local production-origin verifier passed.
- Actual Pages production: successful [run 37890777930](https://github.com/happinesea/happinesea-site/actions/runs/37890777930),
  revision `1791b01d80eb836e9399592d3caa6476147736e4`, deployment success at
  `2026-10-09T10:07:11Z`. Its downloaded artifact was compared with actual HTTPS responses.
  This proves the currently deployed artifact, not deployment of latest main.
- Both verifier executions: 302 canonical and 302 OpenGraph checks, 830 first-party
  HTTP references, 43 download URL/hash checks, 23 manual aliases and 90 article aliases.
  Broken references, canonical conflicts, CMS runtime references, staging-origin
  residue and staging-prefix residue: **all 0**.
- Actual production verification timestamp: `2026-10-09T13:56:36.332Z`.
- `npm run validate`: passed; 92 unit tests, Astro check, lint, format, live CMS sync,
  staging build and 27 build-output tests.
- Latest-main production build passed. Staging rebuild passed. No Google feature
  flags were supplied; default fail-closed behavior was retained.
- Article regression: 90 insight outputs plus five drawing articles = **95**;
  unexpected differences **0** against the retained production control. Comparison
  normalizes only Google bootstrap and generated CSS bundle filenames; it does not
  normalize article content, images, routes or canonical values.
- Actual production desktop/mobile Playwright: **22 passed**. Latest-main local
  production: **96 passed**, two retirement-page presentation checks cannot pass on
  the simple file server, which returns its own generic 404 rather than Pages' custom
  404 document. HTTP 404/no redirect passed locally; the complete retirement checks
  passed on actual Pages. This is a local hosting limitation, not a waived site error.
- Staging regression for the adjusted URL assertions: **6 passed**.
- Fresh desktop/mobile home, Byme-A and privacy captures were inspected. No visual
  redesign was performed. Browser checks cover overflow, images, first-party errors
  and CMS requests on representative pages; the HTTP verifier covers all generated
  first-party references. This is not a claim that every page received visual review.

## Blocker ledger

| Surface                                     | Classification           | Fresh result / remaining action                                                                                                                                                                                       |
| ------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CMS REST/source asset origins               | RESOLVED                 | Live sync succeeds through CMS source origin; localized public assets remain static. Original source/evidence/hash gates are unchanged.                                                                               |
| Article dispositions                        | RESOLVED                 | 95 published, 1627 withdrawn, 905 deferred; unresolved article owner blockers 0. Inventory drawing review labels are not five unpublished articles: drawings use the legacy publication pipeline.                     |
| 1627                                        | RESOLVED                 | Actual Pages returns 404, no redirect, no canonical, noindex; article is not restored.                                                                                                                                |
| 905                                         | RESOLVED                 | Explicit manual-rebuild disposition and static notice; no guessed manual redirect.                                                                                                                                    |
| Byme-A parent                               | RESOLVED                 | Static six-chapter index without Amazon ads; chapter URLs/content/canonical remain intact. Future manual-system integration is not a cutover prerequisite.                                                            |
| style-guide                                 | RESOLVED                 | Owner-approved withdrawal, no redirect; no obligation to preserve a theme demo.                                                                                                                                       |
| privacy-policy                              | RESOLVED                 | Formal baseline retained with scoped supplements; flag-disabled build does not claim Google services are currently active.                                                                                            |
| Radiolink landing                           | RESOLVED                 | Owner-approved new landing, existing 83-product catalogue and support/manual entrances. Old landing equivalence is no longer required.                                                                                |
| RC6GS query/download archive                | RESOLVED                 | Static notice/list and direct verified file links; query auto-download and WordPress runtime behavior intentionally not reproduced.                                                                                   |
| Downloads/original assets/navigation        | RESOLVED                 | Required generated references return successfully; 43 download URL/hash checks match. Unreferenced owner-excluded four files and orphan/derivative copies are not blockers. No bulk media copy requirement remains.   |
| Exact aliases                               | RESOLVED                 | 90 article aliases, 23 manual aliases, drawing routes and legacy/static download paths verified.                                                                                                                      |
| Production root/canonical/OG/sitemap/robots | RESOLVED                 | Production root mode and actual live origin agree; staging origin/prefix residue 0. Intended legacy canonical paths remain.                                                                                           |
| Runtime boundary                            | RESOLVED                 | Public HTML/JS CMS runtime references 0; browser CMS requests 0. Historical provenance is not a runtime dependency.                                                                                                   |
| Production workflow/environment             | RESOLVED                 | Explicit main-only production dispatch, required reviewer present, guard succeeds read-only; approval precedes build/deploy. No automatic production selection.                                                       |
| Pages/DNS/TLS                               | RESOLVED                 | Pages workflow hosting, custom domain happinesea.com, HTTPS enforced, certificate approved through 2027-01-07. Apex A records match four Pages IPs; CMS has independent A record. Root, robots and sitemap HTTPS 200. |
| Latest-main publication                     | OWNER_ACTION_REQUIRED    | Owner selects production on main and approves environment. Preserve the known-good artifact and follow the existing rollback runbook. Do not bypass approval or remove the staging guard to make push CI green.       |
| GA4 settings/consent                        | OWNER_ACTION_REQUIRED    | Decide applicable consent/account settings and Enhanced Measurement, then explicitly enable Analytics if approved. Current Actions variables are absent; no implicit activation.                                      |
| AdSense settings/CMP                        | OWNER_ACTION_REQUIRED    | Confirm applicable EEA/UK/Switzerland CMP obligations and account settings before enabling AdSense. AdSense can remain off independently of GA4. No CMP behavior is inferred.                                         |
| New deployment HTTP/artifact                | POST_DEPLOY_VERIFICATION | After owner deployment, compare that run's artifact with production root, canonical/OG, robots/sitemap, aliases, downloads and desktop/mobile. Current live success is not evidence for a future run.                 |
| GA4 runtime verification                    | POST_DEPLOY_VERIFICATION | After approved activation, verify Realtime/page views and Enhanced Measurement file_download clicks. Click count is not completed downloads.                                                                          |
| AdSense runtime verification                | POST_DEPLOY_VERIFICATION | After approved activation, verify code recognition, Auto Ads and applicable consent behavior in the owner account.                                                                                                    |

## Actual operation prerequisites

Pages custom domain, DNS and TLS are **already configured**; no repeat DNS cutover is
required by this audit. Preserve CMS hosting at `cms.happinesea.com`.
REST reports home/url `https://happinesea.com`; this audit did not read the WordPress
database siteurl directly. The existing runbook's owner preflight must not change it.

Latest-main push [run 37939246475](https://github.com/happinesea/happinesea-site/actions/runs/37939246475)
fails at the intentional staging guard because a custom domain is attached. This is
expected protection against overwriting production with a staging artifact, not a
source/build blocker. Use explicit production dispatch and environment approval.
A staging rollback requires the coordinated custom-domain procedure already in the
runbook; it must not be triggered as a routine push fix.

This PR contains the ledger and two test-only corrections: existing E2E URL
assertions previously hardcoded the staging prefix. They now select the existing
production root or staging base; assertions and public application code are unchanged.

## Completion boundary

Technical cutover prerequisites pass. Owner-authorized latest-main deployment remains
pending. Overall migration/Google-service operational completion is **not** asserted:
actual post-deploy verification, GA4 Realtime, AdSense recognition and CMP confirmation
remain explicit owner gates. No new real blocker is inferred from an expected staging
guard, an intentionally withdrawn URL, an orphan asset or an unenabled Google flag.
