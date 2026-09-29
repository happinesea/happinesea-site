# RC8X design QA

## Reference and implementation

- Source truth: <https://www.radiolink.com.cn/rc8x> and the Radiolink ergonomics card layout attached in Browser Comment 3.
- Implementation: `/radiolink/rc8x/`
- Desktop evidence: `docs/screenshots/rc8x-official-fidelity/desktop-hero.png`, `desktop-feature-middle.png`, `desktop-full-page.png`
- Mobile evidence: `docs/screenshots/rc8x-official-fidelity/mobile-hero.png`, `mobile-body.png`, `mobile-full-page.png`
- Viewports: Desktop Chrome 1280 x 720; Pixel 7 412 x 915; device scale factor 1.
- State: default page, collapsed tutorial list and FAQ.

## Comparison

| Surface          | Initial finding                                                                                              | Resolution                                                                                                                                                 | Result |
| ---------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Hero actions     | P1: English manual competed with the primary Japanese manual; LINE label made the action row too wide.       | Kept the Japanese manual as the primary pill, reduced the English manual to a labelled external text link, and used the official LINE brand icon at 44 px. | Passed |
| Product summary  | P2: Overview and features were presented as separate concepts; the channel condition interrupted the metric. | Renamed the section and navigation to RC8X, changed the metric to `最大16チャンネル※`, and placed the Firmware condition directly below the metric grid.   | Passed |
| Feature layout   | P1: Repeated full-width split rows made small customization and ergonomics points visually oversized.        | Retained split rows for major features and grouped compact points into responsive cards with contained media height.                                       | Passed |
| Animated media   | P1: Official animated GIFs were being converted to static WebP/AVIF outputs.                                 | GIF inputs are copied byte-for-byte and referenced as GIF; the processor test verifies exact bytes and excludes static derivatives.                        | Passed |
| Tutorial wording | P2: Video headings used `公式動画`, which did not match the intended user task.                              | Changed the section and disclosure labels to `チュートリアル`.                                                                                             | Passed |

## Required surfaces

- Desktop full view and focused Hero/feature/specification/tutorial/FAQ captures reviewed.
- Mobile full view and focused Hero/body captures reviewed.
- Hero CTA row stays on one line at 397 px content width with no horizontal overflow.
- Telemetry media loaded from `/assets/radiolink/rc8x/telemetry.gif` at its natural 1920 x 780 dimensions.
- Playwright desktop/mobile checks cover console errors, internal links, image responses, and overflow.

No unresolved P0, P1, or P2 visual issues remain.

final result: passed
