# Owner-approved fixed-page resolution

Baseline: merged main `7dedd55cd6e23af98c8f3848d49f8f2e84f5bb2e`. Owner decisions and fresh source captures: 2026-10-09.

## Byme-A

Publish the exact `/radiolink-productions-manual/byme-a-manual` canonical as a six-chapter index. Remove one literal Amazon advertising iframe. Replace the associated Kindle advertising/priority introduction with an index invitation; do not introduce an Amazon substitute or product link. The exact original introduction and iframe, source hash and replacement literals are recorded in `tests/fixtures/owner-fixed-pages-source.json` and `src/data/legacy-fixed-page-resolution.json`. Existing source/literal review gates are reused, not weakened.

The six chapter links, including the original first news-path alias, are retained. Cover bytes are fetched, decoded and visually inspected; SHA-256 is `84b4dc5a8dde375ace2a1b7f3a3a11de3268861f41d225307f144b05d0f9ee77`. The alt describes the actual cover. Chapter content, slugs and canonicals are unchanged.

Future TODO: integrate this Byme-A index and chapters into the site-wide manual system in a separately approved architecture task. This PR does not redesign that system.

## Style Guide

Owner-approved withdrawal: `/style-guide` and its slash variant remain HTTP 404 with no inferred redirect or replacement. Historical source HTTP 200 and source evidence are not rewritten as a new source 404 observation. Theme-demo assets and unrelated attachment URLs are not bulk-deleted or silently withdrawn by this page decision.

## Privacy Policy authoritative baseline and resolved owner gate

The owner superseded the earlier proposed new policy: the existing formal policy is authoritative. Current REST page 3 was fetched from the build-time CMS and its complete HTML, source hash, modified time, headings and source URL captured in the same fixture. No source clause, operator information, postal contact, rights, retention period or sharing statement has been rewritten or deleted.

Structured sections: site identity; collection purposes; comments/Gravatar; image EXIF; contact form; Cookie; external embeds; analytics; sharing; retention; individual rights; spam-service transmission; postal contact. The contact-form, analytics and sharing headings have no source paragraphs. Empty sections do not authorize invented commitments.

The formal source includes WordPress comments and Gravatar disclosure, Cookie periods of one year/two days/two weeks/one day, indefinite comment retention, profile storage/editing and rights requests. On 2026-10-09 the owner approved retaining every formal clause and adding a narrow applicability explanation for functions not offered to visitors on the current static frontend. No existing clause is reframed, replaced or deleted. Existing-data retention and rights are expressly unaffected. The original sanitized baseline precedes every supplement at the exact legacy route `/privacy-policy`, canonical `https://happinesea.com/privacy-policy`.

### New/old legal difference at this gate

- Retained: full authoritative baseline and every existing clause/contact detail, now published as well as captured in source evidence. All original headings, paragraphs and their order are unchanged.
- Expression/headings reorganized: none; only sanitizer markup normalization, not legal prose edits.
- Added: five supplementary sections after the original contact information: conditional function applicability; static hosting/build-time CMS; future analytics/advertising review; external links/embeds; postal inquiries and publication of revisions.
- Deleted: none.
- Meaning-changed: **0**. No collection fields, retention periods, disclosure recipients or contractors are invented. Hosting access-log details are not asserted without verified provider evidence.
- Analytics/AdSense introduction will require a separate review of actual activation, collected data, Cookie/consent behavior, vendor policies, sharing, operator obligations and revised notice. They are not currently activated by this task.

## Cutover boundary

Byme-A parent, theme-demo withdrawal and privacy decisions are resolved. Domain Cutover remains **NOT READY** while separate `/radiolink`, root canonical, RC6GS non-JavaScript query-download semantics, original-asset URL compatibility, known broken source URLs and actual Pages verification remain open. Historical readiness-audit counts are not presented as fresh live-deployment results.

Article migration state and build-time CMS endpoint are unchanged. No homepage/UI redesign, taxonomy, product/manual architecture, Publication Contract, DNS, CNAME, custom domain, WordPress settings or Actions changes.

## Verification

- Full `npm run validate`: exit 0; 72 unit tests and 26 build-output tests passed. CMS inventory/live fetch, Astro check, lint, format and static build completed.
- Targeted Playwright: 6/6 passed on desktop/mobile, including all six chapter links, decoded cover, canonical, no advertising iframe/script, no overflow/console errors/CMS runtime requests, and both withdrawn style-guide path variants returning 404 without redirects. Fresh desktop/mobile captures were visually inspected.
- Fresh main build byte comparison: all 95 existing article HTML outputs and all six Byme-A chapter outputs unchanged; article data, migration decisions and existing compatibility-page outputs unchanged. No new canonical conflict.
- Public privacy source: HTTP 200, canonical `https://happinesea.com/privacy-policy`; extracted public text exactly matches the captured CMS baseline. This is source verification, not verification of a new privacy implementation.
- Independent read-only review: no remaining P0/P1/P2 in this bounded diff. An initially stale cutover disposition was corrected before approval.
- An initial Windows build attempt failed with an Astro temporary-file rename `EPERM`; a serial build and subsequent full validate succeeded. The precise transient locking cause was not established.

The above verification records the earlier Byme-A/style-guide delivery. These are local checks, not a claim of new main Pages deployment or Domain Cutover readiness. Privacy-specific verification follows after the approved supplement implementation.

## Privacy approval follow-up

PR #37 was merged before this follow-up. This bounded privacy implementation starts from main `34e8abe054cdcda7c9ff4505bbd086cb0bf5293f` on a separate branch. Byme-A, style-guide and article state are not changed again.

The current live CMS body still matches the authoritative SHA-256 `d2be68ae99f6c5b49327ffcd50cc85244c54a0fcad2af72b1e641ba53a31b3e3`; the public WordPress policy text also matches this baseline. The 13 original headings and 15 original paragraphs remain in order. Supplementary headings are appended, not inserted into or substituted for formal clauses.

| Classification  | Difference                                                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| retained        | All 13 original sections, including comments/Gravatar, EXIF, Cookie periods, embeds, indefinite comment retention, profiles, rights, spam transmission and postal address                        |
| added           | Five sections: function applicability; Astro/GitHub Pages and build-time CMS; future analytics/advertising policy review; external links/embeds; postal requests and policy revision publication |
| deleted         | 0                                                                                                                                                                                                |
| meaning-changed | 0 changes to existing clauses; this does not claim the entire policy has no additive explanations                                                                                                |

The owner-approved applicability explanation expressly leaves existing-data retention and rights unaffected. No new technical access-log collection, retention duration or service recipient is asserted. The existing postal address remains the inquiry method; no new email/form address is invented.

Future Analytics/AdSense TODO: verify actual activation and provider terms, actual data and Cookie behavior, any consent/notice requirements, actual recipients and retention; update the policy to match implemented services before introduction. The existing environment-triggered AdSense capability is not enabled by this change. Current deployed main HTML was HTTP 200 with zero Google Analytics/AdSense external scripts. This is an observed activation state, not a claim that integration code does not exist.

Independent read-only legal/source review confirms no remaining P0/P1/P2, all formal prose retained and the five supplements within owner authorization. This is source/meaning review, not legal certification or verification of the postal address in the real world.

Privacy QA: full `npm run validate` exit 0 (73 unit tests, 26 build-output tests); targeted desktop/mobile Playwright 8/8 passed. Actual new privacy captures were inspected. Browser DOM comparison confirms every original heading and paragraph retained in order. Privacy canonical is exact, internal links return success, horizontal overflow/console errors/runtime CMS requests/unexpected public CMS links are zero. No Google Analytics/AdSense external script is emitted. All 95 existing article HTML outputs and six Byme-A chapters remain byte-identical. After the test JSON loader correction, Astro check/lint/format were rerun; no production implementation changed. New privacy route verification is local, not a claim that the unmerged branch has been deployed to main Pages.
