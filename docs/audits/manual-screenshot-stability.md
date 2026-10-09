# Publication screenshot stability

## Observed failure and scope

Production run [37947229654](https://github.com/happinesea/happinesea-site/actions/runs/37947229654)
successfully built and deployed. Its browser gate passed 15 tests; mobile
`/manuals/rc8x/` failed only at `Page.captureScreenshot: Unable to capture screenshot`
after HTTP, heading, canonical, image decode, overflow, console and CMS assertions.

The exact protocol failure was not reproduced locally: three original captures per
device succeeded. The index is only 720 CSS pixels high on desktop and 839 on mobile,
so a hard long-page size limit is **not established as its cause**. A transient
Chromium capture failure remains the observed boundary; runner-specific GPU/resource
conditions are not proved by the log.

Pixel 7 uses 412 × 839 CSS viewport pixels and DPR 2.625. Actual full-page chapter
captures measured:

| Page       | Desktop CSS pixels | Mobile CSS pixels |
| ---------- | ------------------ | ----------------- |
| RC8X index | 1280 × 720         | 412 × 839         |
| Chapter 1  | 1280 × 21473       | 412 × 28426       |
| Chapter 2  | 1280 × 48474       | 412 × 64292       |

## Minimal test-only handling

- Keep full-page screenshots and existing publication assertions unchanged.
- Capture at `scale: 'css'`, reducing high-DPR image allocation without removing any
  page area. [Playwright's documented scale option](https://playwright.dev/docs/api/class-page#page-screenshot)
  uses one image pixel per CSS pixel rather than device pixels.
- Wait two animation frames before capture, without changing viewport or page content.
- Retry **once only**, and only the exact observed Chromium protocol error. Log that
  retry. Persistent or unrelated errors still fail the verification gate.
- Keep existing artifact directory and filename convention, so the existing workflow
  uploads screenshots unchanged. Add both long RC8X chapter routes to the same gate.
- No browser-test retries, assertion suppression, viewport-only fallback, production
  content change, build/deploy modification or workflow edit.

## Verification

Against actual production with Google traffic intercepted as in the existing suite:

- Desktop/mobile publication suite: **20 passed**.
- Index and both chapter routes, three repetitions per desktop/mobile: **18 passed**.
- Twenty screenshot files generated; manual PNG dimensions decoded and checked.
  Mobile index capture visually inspected.
- Unit suite: **95 passed**, including single recovery, persistent failure propagation,
  and unrelated-error propagation tests. Error injection is limited to the screenshot
  boundary because the CI compositor failure could not be reliably reproduced.
- Astro check: 0 errors/warnings; lint and format checks passed.

No production deployment or rerun was triggered. Hosted Linux capture behavior must
still be confirmed on the next owner-authorized browser-check. There is no claimed
universal Chromium maximum screenshot height: this change reduces allocation and
bounds retry, but does not hide a persistent capture failure.
