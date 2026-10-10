# RC8X asset deploy dependency resolution

## Evidence / cause

Latest main baseline: `17ed350` (RC4GS V2 publication merged). Actions run `38020925418`, Deploy to GitHub Pages #78 failed in `Fetch and optimize verified official product assets`. Undici connection timeout after 10,000 ms, attempted addresses `43.169.13.142:443` and `43.169.14.142:443`, `UND_ERR_CONNECT_TIMEOUT`. The build job fetched manufacturer images on every deploy before building. Local processed metadata was tracked, but the 46 generated public files were not tracked. A temporary upstream connection failure therefore stopped publication.

## Change boundary

- Persist the existing verified 29-image / 46-file set: 17 WebP + 17 AVIF + 11 original GIF + 1 original BMP (6,706,210 bytes).
- These are the previously synchronized local files, not invented replacements. All preexisting source hashes/dimensions match the main processed report; no source hash is reapproved. Add each output's SHA-256 and size and a parsed-manifest SHA-256 binding source URLs/public paths/alt.
- Normal `npm run build` and the existing deploy job verify local files without manufacturer fetch. All publication selection, production approval/protection, artifact verification, deploy and browser gates remain unchanged.
- `assets:sync` is an explicitly run, independent network update. Existing source identity must match before that image is overwritten. Same quality 82/55, GIF/BMP bytes, public URLs, no new dependency. Only sync gets a 30-second timeout; no broad workflow retry or network fallback.
- Missing file/record/variant, skipped status, changed hash/size/dimension/format/GIF frames or manifest drift fail closed. BMP has source-byte/header checks; browser QA covers actual BMP decode. JPEG/PNG original hashes remain provenance, not hashes of WebP/AVIF output.
- RC4GS V2 text/images, article data, CMS endpoint, DNS and production configuration are untouched. No merge or production deploy.

## Initial QA before CMS rendering review

The unit test serves real PNG/GIF/BMP bytes, runs the actual sync, then closes the source server and verifies with fetch blocked. It also checks source drift rejection before overwrite and negative saved-file/manifest/variant/status/dimension tests. The offline build fixture blocks all fetch/TCP; Astro telemetry is disabled only for that test run. Existing stored publication data is used for the direct Astro/static finalization QA, not as a deployment fallback.

`npm run validate` runs the normal build: image verification PASS, then the existing live CMS review gate rejects article2086 (`ccbeadcfaac96cc3a65f1974c4d5527d478f65cff1a81ca392f0e2ee19f5bdfd`). This remains a separately unresolved source review issue. No source fixture/gate update is included; do not call full validate PASS.

Observed QA:

- Unit108 PASS; Astro check0 errors/warnings/hints; lint/format PASS.
- Saved source provenance29 records unchanged; all46 output files byte-identical to the previously synchronized set.
- Fetch/TCP-blocked staging and production direct Astro builds plus alias/legacy/sitemap finalization PASS. This uses the existing publication snapshot; it does not bypass the live CMS step in the normal build. Staging build-output28 PASS. Production Google gate/CMS-reference tests2 PASS with the existing Analytics/AdSense true flags.
- Desktop/mobile staging28 and production28 PASS, including RC8X product/manual and unchanged RC4GS V2 pages/91 mappings. Image decode, canonical, console, overflow and CMS runtime assertions remain active.
- Production-mode local artifact verifier: HTML306, canonical/OG305, first-party HTTP830, download hash43, manual aliases23, article aliases90. Broken links/assets0, canonical conflicts0, CMS runtime references0, staging origin/prefix residual0.
- Staging HTML306 files match the same source baseline's previous artifact byte-for-byte (including all95 article outputs and RC4GS V2). No content/URL/image alteration.

The subsequently reviewed CMS identity/srcset differences are documented in [CMS identity and source-rendering review](cms-identity-source-rendering-review.md). The normal live `npm run validate` now passes without changing the original source hashes or public article outputs. No production run is dispatched by this task.
