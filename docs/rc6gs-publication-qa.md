# RC6GS V3 publication QA — 2026-10-11

Baseline: main `db6fe9da85805d55c56f73217ea2f423888da887` (PR #54). This is build/local HTTP evidence, not production deployment evidence.

## Content and evidence

- Full: 46 source reading segments, 49 semantic headings, 62 original figure crops, three tables; all source ranges remain covered.
- Full and Quick are independent routes with reciprocal links. Public titles and receiver labels use R7FG without receiver revision suffixes. Original image pixels are not edited to remove revisions.
- Source file/revision/SHA-256/physical page/section and exact before/after correction records are retained. Source pages are evidence locators, not public headings.
- [Consistency matrix and correction evidence](./rc6gs-full-quick-consistency.md): 27 topics; MATCH 20, EDITORIAL_DIFFERENCE 3, NOT_PRESENT_IN_QUICK 2, NOT_PRESENT_IN_FULL 1, NOT_ESTABLISHED 1; TECHNICAL_CONTRADICTION 0.
- Full has 35 source-backed correction records. Quick retains its nine previous technical corrections and adds four publication adjustments, including applicability/binding-confirmation safety context.
- Knowledge remains NOT_VALIDATED. RC4GS generation-unspecified remains blocked; all six unsafe historical downloads remain withheld.

## Final verification

| Check                                                                | PASS | FAIL |
| -------------------------------------------------------------------- | ---: | ---: |
| Unit suite (each final validate run)                                 |  127 |    0 |
| Staging build-output                                                 |   31 |    0 |
| Production build-output (Google gates enabled)                       |   31 |    0 |
| Staging desktop/mobile Playwright                                    |   38 |    0 |
| Production desktop/mobile Playwright                                 |   38 |    0 |
| Final UTC artifact: Full/Quick desktop/mobile recheck                |    4 |    0 |
| Existing article HTML byte comparison against main deployed artifact |   95 |    0 |
| Existing `/downloads/` file SHA-256 comparison against main artifact |   13 |    0 |
| HTTP download/hash checks per publication mode                       |   28 |    0 |
| First-party HTTP link/asset checks per publication mode              | 1019 |    0 |

`npm run validate` passed in staging and production. Astro check: zero errors/warnings; lint and format checks passed. Builds generate 313 HTML files; 312 canonical/OpenGraph values checked, canonical conflicts 0, CMS runtime references 0. Production staging-origin/prefix residuals 0. Exact article aliases 90 and manual aliases 23 remain valid. All tested manual figures decode; console errors and document horizontal overflow are 0. `git diff --check` passed.

The final production comparison uses `TZ=UTC`, matching hosted CI, with the existing Analytics/AdSense gates enabled. A first local JST comparison differed only in 12 existing date labels; no article content or date-generation code was changed. The hosted main baseline artifact is from successful run `38096054932`. Existing download bytes/URLs are unchanged.

Windows produced an intermittent Astro temporary-file rename EPERM during one repeated build. After stopping this worktree's preview process, the complete production validation was rerun successfully; no validation gate was bypassed. Final HTTP verification used the standard Python static server with the staging base-prefix mapping and normal directory redirects. Astro preview alone returned 404 for existing slashless directory aliases; their built files and static-server compatibility were verified rather than changing unrelated routes.

The CMS-sanitization build-output assertion distinguishes the already approved Google head bootstrap from legacy CMS scripts. Its exception is confined to the marked bootstrap inside `head`; body markup and all other HTML retain the forbidden-script/object/embed/URL assertion. Separate per-page Google bootstrap count checks remain intact. Google implementation/configuration is unchanged.

## Independent review and visual inspection

Separate read-only evidence/code review: unresolved P0/P1/P2 = 0. Original figure crops were compared to source renders: 62 matches, zero pixel mismatches. Exact original/reviewed snapshot replay and evidence hashes were checked for all Full segments/corrections and Quick corrections.

Actual browser captures for Full/Quick desktop/mobile were inspected, including top, table and original figures. A separate reviewer inspected 12 captures: no confirmed P0/P1/P2. Mobile tables deliberately scroll within their container; the document itself does not overflow. The browser tests check every semantic/source anchor and every figure, and exercise first/middle/last TOC navigation. One immediate-after-scroll capture showed a transient Quick TOC highlight; no persistent destination error was established.

## Remaining limits / owner actions

- Phase confirmation blink count is not established as universal across the official sources. Both documents use the source-supported fixed-model compensating wheel-direction check instead; no universal blink count is published.
- Hardware operation has not been independently exercised. Check actual device rating and terminal specification before powering or using the output-mode instructions.
- Review/merge and production deployment remain owner operations. Neither was performed. Publication readiness does not validate Knowledge or restore unsafe original downloads.
