# Production Google services

## Publication gates

Default remains staging. Only a static build with `PUBLICATION_MODE=production`
and the exact individual flag value `true` emits the selected service:

```powershell
$env:PUBLICATION_MODE = 'production'
$env:ANALYTICS_ENABLED = 'true'
$env:ADSENSE_ENABLED = 'true'
npm run build
```

Missing flags, `false`, `1`, or other values disable the service. Independently
stop either service by disabling its flag and rebuilding/redeploying. Flags
are build-time switches, not immediate runtime kill switches. Development
server output is disabled even with these environment values.

The existing owner-controlled production workflow passes repository Actions
variables `ANALYTICS_ENABLED` and `ADSENSE_ENABLED` to the build. No variables,
environments, domain, DNS or deployment were configured by this change. The
existing production approval gate and staging rollback remain unchanged.

`GoogleServices.astro` is included once by `BaseLayout.astro` and once by the
Starlight Head override (which retains the default Head). It emits a guarded
inline bootstrap, not an unconditional network-loading script. Only actual
browser origin `https://happinesea.com` creates the asynchronous Google tag or
the owner-supplied asynchronous/crossorigin AdSense Auto Ads loader. Localhost,
HTTP, www, staging and other origins do not initialize GA or request either
loader, even when previewing a production artifact. Loader IDs prevent a second
bootstrap from injecting duplicates. IDs are public, not credentials.

This boundary concerns the newly injected GA4/AdSense services. Existing YouTube
frames can make independent Google/advertising requests; they are not rewritten
in this scope. Browser gate tests stub those external frames to isolate the head
and avoid third-party advertising traffic. This is not a claim that every existing
third-party embed is Google-network-free.

GA4: stream `3351858265`, measurement ID `G-R5SC3Z7WHL`.
AdSense: publisher `ca-pub-9916217226323909`. No manual ad slots, custom events,
CMP, SSR or CMS runtime dependency are introduced. No CSP was found in the
repository; this change neither adds nor relaxes one.

## Privacy difference

The authoritative privacy baseline and all five previous supplementary section
headings remain intact. The published privacy renderer replaces only the exact
previous future-service paragraph, rejecting a changed/missing/duplicate literal.
The stored source snapshot and source hash gate are not changed.

- Retained: every formal source clause, original order, contact/postal details,
  conditional WordPress-function applicability, retention and rights.
- Added/updated: the access-analysis/advertising supplement now states GA4 use
  for usage analysis/site improvement and AdSense use for advertising **when the
  corresponding build gate is enabled**. Disabled builds explicitly state that
  the service is not used. Cookie/third-party technology, Google policy/service
  settings and privacy/advertising control links are explained in three paragraphs
  replacing one supplemental paragraph.
- Deleted formal clauses: **0**.
- Meaning-changed formal clauses: **0**. Activation of the previously future
  supplement is the intentional owner-requested change, not an assertion that
  the whole policy has no difference. No storage periods, collection fields,
  recipients or unverified consent/CMP behavior are invented.

Official references checked during implementation:
[Google Privacy Policy](https://policies.google.com/privacy?hl=ja),
[partner-site information use](https://policies.google.com/technologies/partner-sites?hl=ja),
[Google advertising controls](https://myadcenter.google.com/),
[AdSense privacy disclosures](https://support.google.com/adsense/answer/1348695?hl=ja).

## Download tracking

Keep existing ordinary `<a href>` download links, semantic attributes, URLs and
file bytes/hashes unchanged. GA4 Enhanced Measurement supports PDF, DOC/DOCX,
ZIP and other common extensions. Enable/check **File downloads** on the owner's
GA4 stream; no custom click listener or dataLayer event is needed for these
links. `file_download` measures a **link click**, not completed transfer or
successful file opening. Direct file URL visits are not HTML-tag page views.
Less-common extensions outside Google's allowlist are not claimed to be tracked.
[Official extension list and parameters](https://support.google.com/analytics/answer/9216061?hl=ja).

## Mandatory owner predeployment checks

1. Confirm GA4 stream/measurement ID, Enhanced Measurement/File downloads and
   account data/consent settings. Do not transmit personal information in URLs.
2. Confirm EEA/UK/Switzerland AdSense CMP obligations and applicable consent
   settings **before enabling AdSense or production deployment**. No CMP has
   been installed or verified by this PR. Until resolved, keep `ADSENSE_ENABLED`
   unset/false; GA4 can be selected separately after its own consent review.
   [Google CMP requirements](https://support.google.com/adsense/answer/7670013?hl=ja).
3. Set approved repository flags; review the generated privacy notice matching
   enabled services, then use the existing production approval workflow. Verify
   any hosting-layer CSP separately; no unverified network allowlist is added.
4. After actual production deployment, verify GA4 Realtime/page_view and a
   representative file_download click. Verify AdSense code recognition, Auto Ads
   status, CMP behavior and desktop/mobile usability. Ad blockers and Google
   approval/serving decisions can prevent advertisements despite a loaded tag.
5. Verify DNS/HTTPS/Pages and the existing cutover checklist separately.

Migration state is unchanged (95 published articles, one retired and one deferred
source article). This PR does not clear owner CMP/settings, live deployment,
Realtime, AdSense recognition or domain-cutover verification gates. Overall site
migration is **not COMPLETE** until those operations and checks are complete.

## Verification on the PR #46 merged baseline

- Unit tests: 92 passed; Astro check: zero errors/warnings/hints; lint and format
  passed. Staging build-output tests: 27 passed.
- Full `npm run validate` fetched the live CMS inventory and reviewed image bytes,
  then generated staging output successfully. Production reused that freshly
  validated source set. With both flags true, all 303 HTML files have no IDs/bootstrap
  in staging, and exactly one of each ID and one guarded bootstrap in production.
  Prior implementation checks also verified zero IDs/bootstrap with both flags unset.
- Existing publication-origin verifier passed for each mode: 303 HTML, 302
  canonical/OpenGraph pairs, 830 first-party HTTP checks, 43 download HTTP/hash
  checks, 23 manual aliases and 90 exact article aliases. Broken links/assets,
  canonical conflicts, CMS runtime references and production staging residuals: 0.
- Comparing enabled versus disabled production artifacts: all 303 HTML files are
  byte-identical after removing only the Google bootstrap and the access-analysis/
  advertising supplement; sitemap and robots are byte-identical without removals.
- Desktop/mobile Playwright: 36 passed per mode, including the exact-origin loader
  test with every Google request fulfilled locally, privacy baseline paragraph
  comparison, Byme-A and withdrawn-page behavior. Initial runs exposed an existing
  YouTube frame's independent advertising traffic and concurrent output-directory
  interference; external frames were isolated and final runs used separate output
  directories. Production/home and privacy screenshots were inspected.
- Prior GA4-only / AdSense-disabled production build: all 303 HTML gate assertions
  passed and 14 desktop/mobile browser tests passed; the exact public-origin test
  requested only the intercepted GA loader, not AdSense.
- Original implementation independent read-only review: four findings fixed;
  no remaining P0/P1/P2. Rebase range-diff confirms unchanged implementation.

PR #46 is merged in baseline `5d55bc4`; **source asset blocker = RESOLVED**.
Its exact HTTPS public uploads-to-CMS build-time resolver, pinned SHA-256 checks
and safe asset pruning remain unchanged by this PR. Original source/provenance
URLs remain intact; no old frontend upload fetch is reintroduced. The reported
RC4GS image fetch succeeds with reviewed SHA-256
`399b796be62e30222b870b0d63cc6ae8e48160350a423248a3ff34a11529f30d`.

Revalidation includes two live CMS API tests and 36 desktop/mobile browser tests
per publication mode. Relative to the merged baseline, all 95 article outputs
have zero unexpected differences after excluding the intentional Google head
bootstrap and generated CSS bundle filename. The CSS difference is solely an
unused `.isolate` utility; existing article markup does not use it. Publication
data, localized image bytes and downloads remain unchanged. Privacy changes are
the separately tested formal-baseline-preserving supplements described above.

Remaining blockers are GA4/AdSense owner consent/settings and actual post-deploy
verification. No production deployment, CMP/settings change or real service
measurement was performed. Overall migration is not COMPLETE until those gates
are satisfied.
