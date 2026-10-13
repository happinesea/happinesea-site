# RC8X / RC8P full manual publication plan

Goal: synchronize the Japanese publication copies with RadiolinkManual main `8b523d6e0fb0c2b5a5beec80906f43e6cd87c634`, retaining manufacturer review and noindex.

Architecture: reuse Starlight chapter routes, ManualFigure and ManualVideo. Extract original PDF images using upstream source-coordinate mappings into local assets; preserve canonical wording and semantic section order. No runtime upstream dependency.

- [x] Reconcile existing RC8X sections and anchors; inventory all canonical files, images, tables and YouTube references.
- [x] Generate chapter publication copies and front/back matter; keep RC8X chapter URLs, add RC8P chapters 1–4.
- [x] Update sidebar, manual directory and existing product links without product redesign.
- [x] Add completeness, local asset, video and fragment regression tests; run native validation and both publication builds.
- [x] Check desktop/mobile manuals, index, images, tables, videos and existing manuals in Playwright.
- [x] Obtain independent read-only review; fix P0/P1.
- [x] Create a Draft PR with exact evidence. No merge or deployment.

Review focus: missing or duplicate canonical text, wrong product figures, source page headings, lost warning severity, legacy anchors, accidental review-state promotion, mobile overflow.
