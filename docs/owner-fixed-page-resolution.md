# Owner-approved fixed-page resolution

Baseline: merged main `7dedd55cd6e23af98c8f3848d49f8f2e84f5bb2e`. Owner decisions and fresh source captures: 2026-10-09.

## Byme-A

Publish the exact `/radiolink-productions-manual/byme-a-manual` canonical as a six-chapter index. Remove one literal Amazon advertising iframe. Replace the associated Kindle advertising/priority introduction with an index invitation; do not introduce an Amazon substitute or product link. The exact original introduction and iframe, source hash and replacement literals are recorded in `tests/fixtures/owner-fixed-pages-source.json` and `src/data/legacy-fixed-page-resolution.json`. Existing source/literal review gates are reused, not weakened.

The six chapter links, including the original first news-path alias, are retained. Cover bytes are fetched, decoded and visually inspected; SHA-256 is `84b4dc5a8dde375ace2a1b7f3a3a11de3268861f41d225307f144b05d0f9ee77`. The alt describes the actual cover. Chapter content, slugs and canonicals are unchanged.

Future TODO: integrate this Byme-A index and chapters into the site-wide manual system in a separately approved architecture task. This PR does not redesign that system.

## Style Guide

Owner-approved withdrawal: `/style-guide` and its slash variant remain HTTP 404 with no inferred redirect or replacement. Historical source HTTP 200 and source evidence are not rewritten as a new source 404 observation. Theme-demo assets and unrelated attachment URLs are not bulk-deleted or silently withdrawn by this page decision.

## Privacy Policy authoritative baseline and owner gate

The owner superseded the earlier proposed new policy: the existing formal policy is authoritative. Current REST page 3 was fetched from the build-time CMS and its complete HTML, source hash, modified time, headings and source URL captured in the same fixture. No source clause, operator information, postal contact, rights, retention period or sharing statement has been rewritten or deleted.

Structured sections: site identity; collection purposes; comments/Gravatar; image EXIF; contact form; Cookie; external embeds; analytics; sharing; retention; individual rights; spam-service transmission; postal contact. The contact-form, analytics and sharing headings have no source paragraphs. Empty sections do not authorize invented commitments.

The formal source includes WordPress comments and Gravatar disclosure, Cookie periods of one year/two days/two weeks/one day, indefinite comment retention, profile storage/editing and rights requests. The public Astro site has no corresponding comment/account/upload UI. Reframing these legal clauses as historical/CMS-conditional clauses is a meaning/applicability decision, not an automatic migration edit. **Privacy publication remains BLOCKED pending the explicitly requested owner decision.** The asynchronous question asks whether to keep all source clauses and add a narrowly scoped explanation of the currently available frontend features.

### New/old legal difference at this gate

- Retained: full authoritative baseline and every existing clause/contact detail, in source evidence.
- Expression/headings reorganized: none.
- Added to the published policy: none; no replacement policy is published.
- Deleted: none.
- Proposed supplements, awaiting the applicability decision: static hosting/build-time CMS explanation; conditional future analytics/advertising; external services/links; rights inquiry and amendment procedure. No collection fields, retention periods, disclosure recipients or contractors are invented.
- Analytics/AdSense introduction will require a separate review of actual activation, collected data, Cookie/consent behavior, vendor policies, sharing, operator obligations and revised notice. They are not currently activated by this task.

## Cutover boundary

Byme-A parent and theme-demo withdrawal decisions are resolved independently of the policy gate. Domain Cutover remains **NOT READY** while privacy applicability and separate `/radiolink`, root canonical, RC6GS non-JavaScript query-download semantics, original-asset URL compatibility, known broken source URLs and actual Pages verification remain open. Historical readiness-audit counts are not presented as fresh live-deployment results.

Article migration state and build-time CMS endpoint are unchanged. No homepage/UI redesign, taxonomy, product/manual architecture, Publication Contract, DNS, CNAME, custom domain, WordPress settings or Actions changes.

## Verification

- Full `npm run validate`: exit 0; 72 unit tests and 26 build-output tests passed. CMS inventory/live fetch, Astro check, lint, format and static build completed.
- Targeted Playwright: 6/6 passed on desktop/mobile, including all six chapter links, decoded cover, canonical, no advertising iframe/script, no overflow/console errors/CMS runtime requests, and both withdrawn style-guide path variants returning 404 without redirects. Fresh desktop/mobile captures were visually inspected.
- Fresh main build byte comparison: all 95 existing article HTML outputs and all six Byme-A chapter outputs unchanged; article data, migration decisions and existing compatibility-page outputs unchanged. No new canonical conflict.
- Public privacy source: HTTP 200, canonical `https://happinesea.com/privacy-policy`; extracted public text exactly matches the captured CMS baseline. This is source verification, not verification of a new privacy implementation.
- Independent read-only review: no remaining P0/P1/P2 in this bounded diff. An initially stale cutover disposition was corrected before approval.
- An initial Windows build attempt failed with an Astro temporary-file rename `EPERM`; a serial build and subsequent full validate succeeded. The precise transient locking cause was not established.

These are local build/browser checks, not a claim of new main Pages deployment or Domain Cutover readiness. Privacy publication remains owner-gated.
