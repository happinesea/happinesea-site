# Build-time CMS endpoint migration

## Boundary

The default WordPress REST source is now
`https://cms.happinesea.com/wp-json/wp/v2/posts`, configured in
`src/data/wordpress-insight-manifest.json`. The existing
`WORDPRESS_API_URL` override remains supported by article inventory/sync and
is also used by the legacy REST audit/sync callers.

Public article links, canonical URLs, historical source evidence, assets,
taxonomy, and Publication Contract are unchanged. As of 2026-10-19, WordPress
`home` and `siteurl` both use `https://cms.happinesea.com`; this is the accepted
CMS configuration and does not determine Astro publication URLs.
The sync validation report records the endpoint actually used. WordPress is
still a build-time source; browser HTML and JavaScript must not reference
`cms.happinesea.com`.

The existing Pages workflow has no endpoint environment override and is
unchanged. Its existing `npm run build` consumes the manifest default. The
new CMS endpoint check workflow verifies the live API and validation on pull
requests or manual dispatch, with read-only repository permissions and no
deployment job. No repository Actions variables were present at inspection.

## Source identity and public URL identity (2026-10-19)

The REST root and current API post links belong to the CMS origin. Article
`contract.source_url` records that input link; `canonical`, `slug`, and `route`
come from the existing approved manifest. A CMS link is accepted only when its
HTTPS origin is trusted and its path matches the pinned public canonical.
Credentials, query/fragment, foreign origins, ID/slug/route drift, changed
source text, and changed image hashes remain failures. Historical public-origin
source links remain valid for replay of approved evidence.

Inventory membership stays pinned to existing inventory IDs plus explicitly
registered manifest IDs. Other new CMS posts do not enter publication or gain
a canonical through inference. Article 2197 is not registered in this change.

Download Manager renderings for articles 2051 and 2035 now generate CMS-origin
package links. Their two observed render variants are stable-hash pinned in the
existing manifest review format. Literal replacements must still reproduce the
original approved source hash before the existing publication transform runs.
There is no global CMS URL replacement or relaxed body/media review.

No WordPress configuration, plugin, upload, preview, posting flow, or deployment
is changed. The sync report and source metadata may reference CMS inputs;
generated browser content, canonical, sitemap, and runtime requests must not.

## Historical verification

Baseline: `origin/main` at `e04aa16ed59f47b3ce00733c91a0c78e82c37be1`.

- The unit regression failed on the old endpoint and passed after migration.
- Live CMS REST root: 200 JSON; `name = happinesea hobby`;
  `url/home = https://happinesea.com`.
- Live CMS returned all 87 approved insight records, with unchanged slugs,
  publish status, and canonical URLs, without redirects to the public origin.
- Direct article sync succeeded; the article JSON and localized image assets
  have no Git diff. The validation report changes only `source_endpoint`.
- Phase 6's 92 migrated posts comprise 87 insight articles and five drawings.
  Fresh static renders of the baseline and branch produced byte-identical
  HTML for all 92 legacy post routes. Canonicals on all 262 HTML pages match.
  The 7,090 HTML URL references have unchanged public routes; three Starlight
  manual stylesheet references have build-directory-dependent scoped CSS
  fingerprints. Their CSS is identical after normalizing scoped identifiers.
- Unit tests: 65 passed. Astro check: no errors. ESLint and Prettier passed.
- Static generation, alias finalization, and 25 build-output tests passed.
- Desktop/mobile CMS-boundary Playwright: two passed; CMS requests, page
  errors, article image decode failures, and article overflow were zero.
- Generated public HTML and browser JavaScript contain no CMS hostname.

## Existing fail-closed blocker

The unmodified baseline `npm run build` and the migrated `npm run validate`
both stop at the existing review gate for BLOCKED article 1627. The current
source adds `web-share` and a `referrerpolicy` attribute to its YouTube iframe.
Both REST hostnames return the same changed HTML:

- Reviewed SHA-256:
  `76b1178b510c82ab7269421b252794ce6447c8fc8f9d9f2a9ff295c9d4cf5dba`
- Current SHA-256:
  `da83d208efe14c5419c6074d2b83af110d86b20eac2b991618545f44676f6889`

No source hash, content decision, or review gate was changed to make the
build pass. Static rendering was tested separately with `astro build` and
the existing alias/finalization scripts; this does **not** constitute a
successful full publication build. The endpoint PR remains blocked for merge
until that source drift receives a separate bounded review.

This change separates REST fetching from the future public-domain cutover.
It does not resolve blocked articles, fixed-page owner decisions, legacy
download compatibility, or the other Domain Cutover Gate requirements.
