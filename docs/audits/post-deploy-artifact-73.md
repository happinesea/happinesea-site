# Run #73: artifact verification investigation

## Decision and evidence limit

**No retry added.** The failed response was transient, but its underlying cause
cannot yet be conclusively attributed to Pages/CDN propagation. Owner instruction
permits retry only after that attribution; the comparison must therefore still fail
immediately. This PR preserves diagnostic evidence needed to resolve the next event.

Baseline: main `0fde8454d02f5b5805877bd41c792f4d05f4c4a6` (PR #48 merged).
[Run 37975244168](https://github.com/happinesea/happinesea-site/actions/runs/37975244168)
reported deployment success at `2026-10-09T18:49:48.714Z` and failed comparison at
`18:53:49.247Z` for `/radiolink-support/byme-a-manual/202109281675.html`.

| Evidence                                  | SHA-256                                                          |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Failed CI response (hash only)            | 27927b33ebee49d7f096737f4a7dab00e26a6e03c5490c66377bcaf383a247a4 |
| Exact run #73 artifact / current response | f1d5a3ff29af4ef1c9385c81f5999e7d3f3f9df35b50e429fbc005be5a3a2bd1 |
| Previous run 37972165710 artifact         | 65f54b1a2f64bb274a3e4690701e2cc62d0c87becf12b731fd9126e50f7fd3c0 |
| Earlier run 37947229654 artifact          | f5705691b329b3f2ccbe6e75046c5d82c38f7a4a4d18485f1ad77c07e57bddff |

The failed job recorded only hashes, not response bytes or headers. Its exact
historical HTML diff is **unavailable**, and must not be reconstructed by guessing.
Searching all 303 HTML files in each of these three artifacts found no match for
the failed-response hash. Thus a specific old/new-artifact mixture is not established.

## Exact comparisons and convergence

- Three curl captures at approximately 19:03:35, 19:03:56 and 19:06 UTC matched the
  run #73 artifact byte-for-byte. Three subsequent Node fetches also matched, including
  gzip-decoded responses. Current exact HTML diff: **0 bytes**.
- Previous run vs #73 differs by exactly this 44-character head insertion:
  `start('ca-pub-9916217226323909', 'adsense');`
  Both bodies hash to `bd573ff5924812398b404fee5c8941f32d44e1c70d04d256a223190b360bd0a1`.
  This is the known existing feature-selection difference, **not proof of the failed
  response's contents**. No GA4/AdSense setting was changed during this investigation.
- Current headers: HTTP 200, Content-Length 11375, Last-Modified
  `Fri, 09 Oct 2026 18:49:47 GMT`, ETag `"6ac9374b-2c6f"`,
  Cache-Control `max-age=600`. First curl response: Age 0 / X-Cache MISS;
  second: Age 21 / X-Cache HIT. GitHub/Fastly caching is observed, but the failed
  runner's edge, Age, ETag and response are unknown.

## Classification

| Candidate                         | Finding                                                                                                                                                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pages/CDN propagation or cache    | Plausible; historical mismatching hash converged to expected bytes without a new deployment. Specific cache/edge cause remains unconfirmed.                                                                                              |
| Old/new artifact mixture          | Not established: failed hash does not match available preceding artifact HTML.                                                                                                                                                           |
| Canonical/head / Google bootstrap | Current bytes match; known prior artifact head difference documented above. Historical response diff unavailable.                                                                                                                        |
| Content difference                | No current target-body difference; historical response content unknown.                                                                                                                                                                  |
| Build nondeterminism              | UTC/JST date presentation affects 12 other insight pages. With CI's UTC environment, all 95 article outputs exactly match run #73. This pre-existing timezone dependence is separate from the static Byme-A failure and was not changed. |
| Other pages                       | Same HTTP comparison boundary can fail elsewhere. A separate image returned 503 during the first full live check and subsequently 200; that HTTP failure correctly remained fatal. It was not automatically retried.                     |

## Diagnostic-only change

On HTTP-200 HTML hash mismatch, save expected bytes, received bytes, URL, observation
time, hashes and selected cache headers to `test-results/artifact-mismatches/`.
The browser-check uploads this directory on failure. No cookies, authorization
headers or credentials are captured. Expected public artifact HTML is already public.

The original SHA comparison remains exact and fatal. HTML 404/500 now fails explicitly
before hash comparison. Canonical, CMS, download, alias and runtime checks remain.
No retry, wait, cache bypass, stale-success rule, workflow retry or assertion waiver
is introduced. The upload is evidence preservation only, not build/deploy selection.

## QA and remaining investigation

- Full `npm run validate` plus unit/Check/lint/format verification.
- Production build with existing true/true flags under UTC; **95/95 article bytes
  match run #73**, including static drawing articles.
- Staging build with default mode; no feature setting changed.
- Actual-production desktop/mobile publication suite: **20 passed**; Google traffic
  is intercepted by the existing test harness, not sent to measurement/advertising.
- Full live verifier manual re-execution at `2026-10-09T19:11:34.343Z`: 303 HTML,
  302 canonical/OG checks, 830 references, 43 download hashes, 23 manual aliases,
  90 article aliases; canonical conflicts, CMS runtime references and broken
  references **0**. The first execution's unrelated 503 remains recorded above.
- Negative tests exercise the verifier process over real local HTTP: exact mismatch
  evidence + fatal mismatch, 404, 500, bad download bytes, wrong canonical.
- Retry recovery/three-attempt tests are not applicable: retries were deliberately
  not introduced without confirmed CDN causation.
- Independent read-only review: no P0/P1/P2 findings; reviewer also ran all five
  new negative tests successfully. Hosted artifact upload itself remains unexecuted.

Next occurrence should supply the uploaded exact response and cache headers; compare
those bytes to preceding artifacts and sample the same URL over time. Only then
consider a bounded HTML-only retry. Production, DNS/Pages, canonical, content,
Analytics/AdSense account settings and feature flags remain unchanged. This PR does
not declare the underlying historical cause solved or trigger a deployment.
