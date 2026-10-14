# RC8X publication-origin browser investigation

## Incident and available evidence

Deploy run [38496948947](https://github.com/happinesea/happinesea-site/actions/runs/38496948947), main commit `00615eb7ffb5c05df8cac59fa069fff0c80ec917`, reported 18 passing browser checks and two desktop failures:

- Chapter 01: console assertion received exactly `Permissions policy violation: compute-pressure is not allowed in this document.`
- Chapter 02: the 30-second test budget expired; the CI log does not identify an API call.

The artifacts API returned only `github-pages` (artifact ID `11864498205`). The workflow uploads screenshots only after the browser command succeeds, and does not upload failed traces. Thus the runner's original trace ZIPs cannot be retrieved from this run. The exact original chapter-02 failing API is unknown.

## Reproduction and root cause

On 2026-10-14, the unchanged browser test was run against `https://happinesea.com/`, desktop, one worker, trace enabled. Chapter 01 passed in 15.8 seconds. Chapter 02 reproduced the 30-second timeout (34.4 seconds including failure cleanup).

The reproduction trace establishes that chapter 02 completed all 156 CSS-visible image decodes, horizontal-overflow assertion, console-error assertion, and CMS-request assertion. Its navigation began at trace time 17673.440 ms; full-page screenshot began at 41108.548 ms and was still pending when the budget expired. The sequential image loop issued a scroll and decode round trip for each image, consuming most of the budget before full-page capture. This is the demonstrated reproduction cause, not proof of the missing original CI trace's exact stage.

The saved reproduction traces are local ignored investigation artifacts, rather than publication content.

## Test-only correction

`decodePublicationImages` selects the same `img:visible` images as the old check, sets their loading mode to eager, and decodes them concurrently in one browser evaluation. The caller retains its positive-natural-width assertion. Broken decodes still reject. Full-page screenshots, the 30-second budget, console/page-error checks, and CMS-request checks remain in force.

No manual text, media, source data, Google service settings, deployment settings, or iframe permissions were changed.

The image check no longer scrolls through every figure, so it does not incidentally activate every lazy external video embed. Video playback is not an assertion in this suite; third-party player behavior remains unverified by the image check.

## Chapter-01 policy error

The publication contains lazy YouTube privacy-enhanced embeds. A targeted probe scrolled all four chapter-01 iframes into view while recording console-error text and location, but captured no errors. Neither the chapter-01 unchanged-test rerun nor the patched rerun reproduced the policy message. The original CI console collector stored text alone, so that log cannot prove which document emitted it. YouTube attribution remains a hypothesis. No console-error exclusion was added.

## Verification

- Before the helper existed, the new image unit file failed on its missing export.
- Image unit tests: 3 passed, covering eager loading before decode, concurrent decode, failed decode propagation, and zero-width preservation for the caller's assertion.
- Existing screenshot unit tests: 3 passed; compositor retry remains bounded and unrelated failures remain failures.
- ESLint on the three changed test/helper files: passed.
- `git diff --check` for the changed test/helper paths: passed.
- Patched deployed desktop chapter checks: chapter 01 passed in 3.7 seconds; chapter 02 passed in 12.0 seconds, both with trace enabled and one worker.

These targeted reruns establish the correction for the reproduced time-budget exhaustion. They do not certify that the unreproduced chapter-01 policy error is resolved. The full production artifact browser matrix is verified separately by the publication coordinator.
