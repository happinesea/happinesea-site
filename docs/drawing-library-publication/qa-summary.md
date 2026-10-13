# QA summary

Baseline:934dc99265771f595a94481ec8619379100d13a9. No merge/deploy.

- npm run validate passed. Final unit164; Astro0 errors; lint/format passed; built-output35.
- Python14 passed, including SHA receipts, Unicode path, traversal, preview source drift and deterministic overlay replay.
- Drawing Playwright desktop/mobile6 passed: public6 cards, tags/filter/count, title navigation, tags below title, normal href download button, owner77/20/9/42/26 counts/current grouping/tag filters.
- All43 preparation records × desktop/mobile =86 page checks passed; image decode, HTTP200, noindex on37 candidates, console0/overflow0/image404 0.
- All53 active downloads checked over HTTP for exact bytes/SHA; no duplicate staged binary. Normal build keeps existing6 only; all37 candidate routes and staged download/image directories absent.
- All12 maintained legacy drawing URLs × desktop/mobile=24 passed: original title/canonical, image decode, one download, internal link success, console0/overflow0.
- RC8X/RC8P10 routes × desktop/mobile=20 smoke checks passed, correct canonical, visible images decode, no runtime CMS refs or resource errors. Main's full-manual built-output gate passed.
- Production build and35 output tests passed. Owner flag inproduction fails before output. Staging sitemap62 URLs; production193 URLs; candidate entries0. Production duplicate HTML152 consists of existing aliases, not new canonical records; canonical data and alias manifests are unchanged.
- All71 source paths/size/mtime/SHA unchanged; historic ledgers/static-downloads/legacy compatibility unchanged. Staged47 binaries203320048 bytes only in ignored local build. Git binary additions0; one code-authored generic SVG.
- Independent read-only review: twoP2 found (RC substring tag, linked preview output). Both fixed with negative tests; final unresolvedP0/P1/P2=0. Hardlink and junction tests passed without skips.
- git diff --check required before commit and verified.

## Additional pre-existing legacy suite

The broad legacy browser suite was also attempted. It expects directory URLs
without a trailing slash to return200 under Astro preview and expects safety-blocked
manual downloads to remain downloadable. Those expectations fail. Two representative
failures were reproduced using a clean archive/build of unchanged origin/main:
firmware directory URL404 and BLOCKED_SAFETY_REVIEW RC6GS.docx404. No production URL,
redirect, manual safety policy or unrelated content was changed to satisfy these tests.
The dedicated all12 drawing-route checks above use directory URLs with a slash and
flat.html routes unchanged. This inherited broad suite is not reported as passing.

## Visual artifacts

Outside Git: publication-index desktop/mobile; F4D multi-tag detail; F-22
multi-download; jet-engine split package; pulse-engine material; FIGHTER legacy;
owner summary/category/duplicate/probable/grouping/title plus tag/rights screenshots.
All images are first-page or generic fallbacks, not evidence of rights approval.

Remaining owner matters: rights77 files; grouping5 packages; probable5 relations;
unknown model/material identities retained in display labels. The26 title candidates
are display-ready with uncertainty, not confirmed aircraft identifications.
