# Publication origin preparation

Default/unset `PUBLICATION_MODE` and explicit `staging` retain `site=https://happinesea.github.io`, `base=/happinesea-site`. Only explicit `PUBLICATION_MODE=production` uses `site=https://happinesea.com`, `base=/`. Unknown values fail closed.

Set the variable in the **build process environment**, not a browser/public runtime variable or a `.env` file. This PR does not alter Actions, Pages settings, CNAME, DNS or actual deployment. Merging it alone leaves current staging deployment unchanged.

PowerShell production build:

```powershell
$env:PUBLICATION_MODE='production'
npm run build
```

Return to staging:

```powershell
Remove-Item Env:PUBLICATION_MODE
npm run validate
```

POSIX equivalent: `PUBLICATION_MODE=production npm run build`.

Canonical generation, OpenGraph URLs, sitemap and robots consume Astro's selected site/base. Existing source-owned legacy canonical overrides remain unchanged, including exact `.html` aliases. Starlight manuals, products, downloads and static assets use the same selected base. No CMS runtime or UI redesign is introduced.

## Verification

- `npm run validate` checks default staging source, CMS build-time sync and static output against existing staging expectations.
- Build production with the explicit environment variable and run `scripts/verify-publication-origin.mjs` against its local HTTP server using `E2E_BASE_URL`.
- The same verifier checks staging. Evidence in `docs/audits/publication-origin-{staging,production}.json` is local build/HTTP evidence, not a live production deployment claim.
- It checks every HTML canonical, OpenGraph/canonical agreement, all sitemap locations, robots, first-party links/assets, all permanent/legacy download hashes and 23 byte-exact manual aliases.
- Production HTML/JS/XML/TXT must contain neither `happinesea.github.io/happinesea-site` nor `/happinesea-site/`. CMS references in public HTML/JS are forbidden.
- `tests/e2e/publication-origin.spec.ts` checks home, catalogue, product, manual, downloads, drawings, glossary and a manual alias on desktop/mobile in each mode, with real screenshots, image decode, overflow, console and CMS-request checks.

Existing build-output assertions intentionally describe staging; production uses the separate origin verifier and browser suite. Article content, publication manifest, source hash gates, legacy canonicals and existing download bytes are not changed.

Measured results: default staging `npm run validate` passed (82 unit tests, 26 build-output tests). Both mode HTTP verifiers checked 303 HTML files, 302 canonical/OpenGraph pairs, 830 first-party references, 43 static download URLs/hashes and 23 exact manual aliases, with zero failures. Production staging-origin/prefix residuals are zero. Default staging's 303 HTML files are byte-identical to the PR #41 baseline output. Each mode's desktop/mobile browser suite has 16 cases; representative real captures were visually inspected.

Production frontend generation reused the freshly validated CMS snapshot and ran `PUBLICATION_MODE=production npx astro build`, followed by the unchanged alias-copy and compatibility-finalization scripts. CMS source acquisition was live-verified by the staging `npm run validate`; no new CMS fetch architecture or runtime fallback was introduced.

## Owner-controlled cutover steps / remaining gate

1. Review/merge this Draft PR only when its two-mode QA is accepted.
2. Separately authorize the custom-domain cutover and its rollback plan. Coordinate DNS, GitHub Pages custom-domain/HTTPS settings and the production-mode deployment selection as one controlled operation; none is performed here.
3. Set `PUBLICATION_MODE=production` in the actual authorized build environment. Leaving the default would publish project-base paths at the custom domain; selecting production early would break the current project Pages base.
4. Verify the deployed root, legacy URLs, sitemap, robots, canonicals, downloads and TLS using the real public origin after cutover. Preserve `cms.happinesea.com` as build-time source; do not change WordPress home/siteurl.
5. Keep the last staging build/configuration and DNS/hosting rollback procedure available until final public HTTP/browser verification succeeds.

Code readiness does not imply Domain Cutover READY: owner authorization, hosting/DNS/HTTPS coordination and real production deployment verification remain. The previously observed main homepage visual-capture timeout is a separate verification issue; this PR does not change that unrelated test or Actions definition.

The current `withastro/action@v6` build command is the package manager's `run build` and does not itself select publication mode. A GitHub repository variable alone is not injected into the build process: the future authorized cutover must explicitly wire the production value into the build job/step environment (or an approved build command). This workflow wiring is intentionally not performed here.
