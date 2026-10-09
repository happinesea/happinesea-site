# CMS source asset transport after domain cutover

The public frontend now owns `https://happinesea.com`. Historical WordPress
upload URLs remain authoritative source identifiers, but their bytes are served
by `https://cms.happinesea.com` during builds.

## Boundary

- Only HTTPS URLs on the exact public origin, without credentials, beneath
  `/wp-content/uploads/` use the CMS hostname for fetching. Path, filename and
  query are retained. HTTP, other paths, other hosts and external images are not
  remapped. There is no fallback to unreviewed URLs.
- Original source URLs remain in article metadata, review evidence and fixtures.
  Canonical URLs, source HTML, category data and publication decisions do not change.
- Insight image fetches require the SHA-256 already stored in the published
  article asset metadata. Legacy compatibility fetches use the reviewed legacy
  asset metadata. Missing or different hashes fail closed. New unreviewed uploads
  therefore require normal evidence review, not automatic adoption.
- Existing MIME checks, image decoding, dimensions, GIF byte retention,
  localization and content review gates remain in place.
- Previous insight assets are pruned only after all replacements have passed
  validation and publication metadata has been written. A rejected source hash
  must not delete the previous asset set.
- Public HTML uses local static assets, not a CMS runtime dependency. Public HTTP
  audits continue to check the actual frontend; their requests are not remapped.

## Verification

The reported RC4GS image is HTTP 404 on the frontend and HTTP 200 `image/png`
on the CMS. Its fetched SHA-256 matches the existing reviewed source:
`399b796be62e30222b870b0d63cc6ae8e48160350a423248a3ff34a11529f30d`.

Local checks include full repository validation, resolver/hash rejection unit
tests, staging and production builds, and desktop/mobile Playwright checks for
home, hub, product, manual, RC4GS aliases, Byme-A index and all six chapters.
The origin verifier checks 303 HTML files, 302 canonical/OpenGraph URLs,
830 first-party HTTP references and 43 download hashes in each mode.

Against the unmodified-main build, staging compared 841 existing output files
and production compared 887, with zero byte differences. This includes all
95 published article outputs (90 insights and five drawing articles), manuals,
homepage, styles and downloads. Source/provenance data has no semantic diff.

Production verification reports zero staging-origin/prefix remnants, broken
links/assets, canonical conflicts and CMS runtime references. Browser capture
review confirms the reported RC4GS image renders in both viewport sizes.

An injected image-byte drift test, using the live REST response but replacing
image responses with invalid reviewed bytes, rejected the first source hash.
The complete previous image file set and publication JSON remained byte-identical.
Independent read-only review found no remaining P0/P1/P2 after this failure-path
ordering was corrected.

## Delivery boundary

This fix does not include GA4/AdSense PR #45, deployment, DNS, CNAME, Pages
settings, WordPress settings or content edits. After this fix is merged, PR #45
still needs to be rebased and independently revalidated; it is not automatically
approved by these results.
