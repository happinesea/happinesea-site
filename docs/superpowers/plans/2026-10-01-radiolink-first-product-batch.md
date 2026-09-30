# Radiolink first product batch implementation plan

**Goal:** Implement RC8P and T12D as manufacturer-review product pages while preserving RC8X.

**Spec:** `docs/superpowers/specs/2026-10-01-radiolink-first-product-batch-design.md`

## Task 1: Regression tests first

- [ ] Add build-output assertions for all three product routes, product-specific section order, manuals, official links, local assets, embeds, source-conflict omissions, and no commercial claims.
- [ ] Extend Playwright route, error, overflow, link, and asset checks to RC8P/T12D.
- [ ] Run the targeted tests against the current build and record the expected red result.

## Task 2: Public data and official assets

- [ ] Add RC8P/T12D catalogue records and page-detail data translated with `radiolink-manual-translation` terminology rules.
- [ ] Add public asset manifests with provenance and run the existing processor.
- [ ] Preserve official GIFs; do not rehost YouTube.

## Task 3: Minimal generic rendering

- [ ] Add a standard product-page component for RC8P/T12D.
- [ ] Make ProductHero manual CTAs optional so unavailable internal manuals do not create broken links.
- [ ] Route RC8X to its existing presentation and RC8P/T12D to the new standard component.

## Task 4: Translation, design, and technical QA

- [ ] Run independent Japanese QA against the official English source and canonical terminology.
- [ ] Run independent design/content-fidelity review against the official pages.
- [ ] Run targeted tests, check, lint, build, build-output, internal links, assets, desktop/mobile Playwright, console errors, and overflow.
- [ ] Record inherited baseline formatting debt separately; do not reformat unrelated files.

## Task 5: Staging and delivery

- [ ] Commit and push the dedicated branch.
- [ ] Create a Draft PR without merge.
- [ ] Verify the GitHub Pages deployment URL in desktop and mobile browsers.
