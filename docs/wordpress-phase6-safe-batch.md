# Phase 6 safe video article batch

2026-10-05: public WordPress API review added 10 articles (1876, 1851, 1839,
1833, 1829, 1825, 1810, 1804, 1798, 1534), retaining the existing 11.
The manifest now contains 21 publication copies. This migration maps video
editorial articles to `insight`; it does not transfer canonical product or
manual ownership or validate historical product claims as current facts.

Each candidate previously needed content mapping and featured-image review.
The live rendered body was inspected: no body images, scripts, shortcodes or
unsupported embeds. Only existing YouTube embeds are retained. Body claims,
historic notices, commercial links and manual links remain source content.
Existing sanitization and build-time image localization remain in effect.

The per-article public evidence record is
[`tests/fixtures/wordpress-phase6-review.json`](../tests/fixtures/wordpress-phase6-review.json).
It records the source URL/API, source rendered-body SHA-256, exact category names,
YouTube IDs, featured-image URL and visual observation. All ten source JPEGs
were downloaded and visually inspected. They are video-preview/title duplication,
not independent instructions or diagrams; empty featured alt is retained only
for this decorative presentation. No missing body-image alt is waived.

The public categories API and embedded terms confirmed these additional display
names: `product` = 製品紹介; `byme-a-manual` = Byme-A製品マニュアル. Stored slugs,
category order and source taxonomy are unchanged.

After Astro builds, the alias copier copies each active manifest article's
generated HTML to the exact source `.html` pathname in `dist`. It validates
origin, path, slug, route, uniqueness, active count, source existence and target
collisions before copying, and uses exclusive file creation. Aliases reuse the
same article UI and canonical, with no redirect. Under the project Pages base,
the path is prefixed by `/happinesea-site`; domain cutover is outside this batch.
Unmapped articles, category/tag/archive/search URLs and manual/product links
outside these article aliases still require the separate legacy-surface review.

The existing asset adapter continues to preserve GIF bytes and localize featured
and reviewed body assets. This batch introduces ten WebP previews and no GIF or
body assets. Nothing writes to WordPress or changes DNS, CNAME, custom domain,
Actions, homepage layout, sanitizer allowlist or Publication Contract.

The embedded-post fetch is bounded to ten posts per request. The prior single
21-post request timed out; subsequent ten-post requests also timed out during
concurrent CMS probing. After other probes stopped, the live sync succeeded.
This observation does not prove a server root cause. Existing timeouts, retries,
count/ID/status checks and fail-closed behavior remain; incomplete chunks and
duplicates are tested. The ten-article body text matches the fetched source,
and the previous eleven generated article objects remain unchanged.

Verification: `npm run validate` passed with 27 unit and 23 build-output tests,
Astro check (zero diagnostics), lint, formatting and live WordPress sync.
Existing MDX directive and empty i18n collection build warnings remain.
Browser QA passed 48 checks across desktop and mobile at port 4334: migrated article routes,
local decoded assets, canonicals, overflow, internal links, exact legacy HTTP
200 filenames without redirects, source metadata cards and homepage smoke.
One exact third-party YouTube player compute-pressure permission diagnostic is
annotated separately when its source URL is the YouTube player script; all
other console errors still fail. The old card test's homepage assumption was
removed because the homepage uses a separate card UI covered by its own tests.

The retained final browser report (`test-results/phase6-results.json`, ignored
local artifact) records 48 expected passes, zero unexpected/skipped/flaky tests,
and two third-party console observations: mobile articles 1851 and 1825. Both
reported `Permissions policy violation: compute-pressure is not allowed in this document.`
from `https://www.youtube.com/s/player/8ab5c328/player_embed_es6.vflset/en_US/base.js`.
Thus this is a first-party console pass with recorded third-party diagnostics,
not an assertion that every frame emitted no console messages. A separate hero
carousel desktop/mobile smoke run passed all ten tests, retained in
`test-results/phase6-hero-results.json`.
