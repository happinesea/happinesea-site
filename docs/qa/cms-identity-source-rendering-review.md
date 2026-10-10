# CMS identity and source-rendering review

## Evidence and boundary

On 2026-10-10, PR #52 CMS check run `38023432514` failed because the REST root identity test still expected the pre-migration `url=https://happinesea.com`. Read-only WP CLI inspection of profile `happinesea20191108` and live REST agree:

- `home=https://happinesea.com`
- `siteurl=https://cms.happinesea.com`
- REST `url=https://cms.happinesea.com`, `home=https://happinesea.com`, `name=happinesea hobby`.

This is the owner's approved CMS admin-origin separation, not public canonical migration. The integration test continues to require every approved post's exact public slug/canonical and no CMS-to-public REST redirect. No server options are changed by this PR.

## Article 2086

The immutable historical snapshot remains in `tests/fixtures/wordpress-phase6-completion-review.json`. Historical rendered SHA-256 is `ccbeadcfaac96cc3a65f1974c4d5527d478f65cff1a81ca392f0e2ee19f5bdfd`; live rendered SHA-256 is `3051fda07ebd24d970860ee85cc68ad76cbdab3ac403dfa57bf5058bccd304ed`.

Exact comparison shows four changed `srcset` attributes: only `https://happinesea.com/wp-content/uploads/` becomes `https://cms.happinesea.com/wp-content/uploads/`. All candidate image paths/descriptors, image `src`, alt, dimensions, text, links and markup otherwise match. Reverting these four literal attributes reproduces the historical HTML byte for byte. This is WordPress responsive-image rendering after siteurl separation, not an authored body change.

Four body source images and the featured source image were fetched from the CMS with HTTP 200 and image/png or image/jpeg. SHA-256 matches the existing image reviews:

- `a66b71b2-e20e-4e3f-b1ef-99bf5f7bcd63_471x655.png`: `37f7d7bcb8f831b892e358d9b4fe8eb95f3d01c40c4c183518e295e9b482762a`
- `fd8831e424e0478dbeaf88581ddc8b53-1024x638.jpeg`: `8d3c18f9c67762e147b7be137abfbd324d097c4f7ae8daf33306dc8be5328de7`
- `d8451a1eda5946a58c6ad62573d66fb9.jpeg`: `196e2921f56c19be312f901075005f6ff6424b7697d5577773e4271be3461f23`
- `bf83a98234df4779b6257e67a5796bfc.jpeg`: `fdc830bbd6deb7adb9595a430607de6e8d9ee9656216d7db42faffd16f231516`
- `fd8831e424e0478dbeaf88581ddc8b53.jpeg`: `632458ff5829195ecf70c614c7f65f4f406f7fd22f818b3d58ef214ffe544db5`

## Related reviews and fail-closed behavior

The 95 approved articles were checked against existing review hashes. The same srcset-only change affects 2012, 1947, 1758, 1691, 1687, 1682, 1679, 1675, 1577, 1559, 1500, 1413, 1382, 1350, 1118, 1090, 943, 114 and 1895. Article 2035 instead changes the Download Manager PDF icon's origin; its previously reviewed volatile refresh token/wrapper rules remain unchanged.

Each affected mapping records `source_variants`: a complete live rendered hash (or the existing stable-render hash) plus unique literal substitutions. Substitution is permitted only when that exact hash matches; the restored source must then pass the **unchanged original review hash**, followed by existing reviewed transformations. No wildcard URL replacement, unreviewed hash refresh, text change, image-path change or new volatile rule is accepted. Historical fixtures and Phase 6 decision hashes remain unchanged. Inventory decisions reuse the same variant evidence while retaining their own original hash checks.

Featured-media provenance uses only the inverse of the existing uploads fetch mapping. External URLs, plugins and credentials do not qualify. Restored public provenance keeps the existing reviewed URL and forces CMS-fetched bytes through the previous source SHA-256 gate. Public contracts, local asset URLs and browser output remain public/static; CMS URLs are build-time sources only.

PR #52's 29 verified RC8X assets / 46 persisted files and offline verification remain intact. Manufacturer fetching is still restricted to explicit asset sync, not deployment.

Four drawing inventory records also report the current CMS Download Manager ZIP-icon origin. These are source inventory observations, not published article/image changes; no plugin-path rewrite is added to the source fetch resolver.

## Verification

- Live CMS integration: 2 PASS, including exact public slug/canonical for every approved insight.
- Unit: 114 PASS, including original/live rendering equivalence, unreviewed text/image-path rejection, stable-token limits, featured provenance and source-byte rejection, persisted asset/offline tests.
- Normal live `npm run validate`: PASS (unit, Astro check, lint, format, live inventory/sync, build, 28 build-output tests).
- Astro check: 144 files, 0 errors/warnings/hints.
- Generated insight JSON and localized insight assets: no Git diff. Historical fixtures and decision hashes: unchanged.
- Staging HTML: all 306 pages byte-identical to the same-source baseline artifact, including 95 published posts and RC4GS V2.
- Expanded staging desktop/mobile suite: 88 PASS, 2 existing failures in `phase6-completion.spec.ts:105`, which still waits for the automatic query-download handoff deliberately removed by the static-download migration. The unchanged baseline HTML has the same behavior. This unrelated historical test is not modified or counted as passing; current static downloads are verified separately.
- Independent read-only review: no P0/P1/P2 findings; 21 additions / 63 literal substitutions independently checked to be origin-only. Historical manifest contents/hashes are unchanged after removing variant evidence. Targeted reviewer tests: 22 PASS.
