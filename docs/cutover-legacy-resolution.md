# Legacy compatibility resolution after PR #40

Baseline: `origin/main` `efe10bba091ef92d007d079434b43f147b18d7f1`.

## Owner-approved scope

35 targets resolved in this branch:

| Target                                  | Count | Disposition                                                                                                             |
| --------------------------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------- |
| Manual aliases                          |    23 | Exact static HTML copies of measured existing destinations; destination canonical retained; no redirect.                |
| Download-tag archives                   |     5 | Static lists of existing download entries linked to the corresponding source tag. No taxonomy change.                   |
| Firmware entrances                      |     2 | Static guidance and ordinary links to verified ZIPs. Query parameters do not trigger downloads.                         |
| Broken manual navigation                |     2 | Remove anchors for `/r6dsm-manual` and `/minipix-manual-multicopter`; preserve their labels. No substitute or redirect. |
| Retired article 1627 archive navigation |     1 | Remove links in both category and blog archives, preserve labels. Article remains withdrawn/404.                        |
| Obsolete administration navigation      |     1 | Remove `/sample-page` link to `/wp-admin/`, preserve label. No CMS runtime restoration.                                 |
| Japanese V6.0.1 firmware ZIP            |     1 | Separate static asset, not merged with the other V6.0.1 ZIP.                                                            |

The four unreferenced log/spreadsheet candidates remain unpublished. Their inventory records now say `OWNER_APPROVED_DO_NOT_PUBLISH`, with `cutover_blocker: false`. They are not unresolved owner decisions.

## Fidelity and trust boundaries

- Existing article content, slug, categories, source hashes and canonicals are unchanged. Existing article HTML byte comparison reports no changes.
- Approved link removals are guarded by the original normalized page SHA-256 and exact link literals. Source drift fails closed; only anchor wrappers are removed.
- Alias copying preflights paths, existing output collisions and destination canonicals. Each alias is byte-identical to its generated source.
- Firmware source receipt: 75,113 bytes, SHA-256 `1a7dec9ec4990dff69e1312f9f6c99bab3e6b8702a80f67b5edb1ac11a7cf024`.
- Permanent URL: `/downloads/radiolink/RC4GS_firmware_V6.0.1-2019.7.8_jp-1a7dec9ec499.zip`.
- Prior static download URLs and hashes remain unchanged. The 19 permanent files and 24 legacy static URLs are checked by HTTP and SHA-256.
- No orphan/derivative copying, WordPress runtime, query download emulation or guessed redirect is introduced.

## Verification

`docs/audits/cutover-legacy-resolution.json` records the fresh local static HTTP audit, not a production deployment claim. It checks all generated HTML and first-party references, maps current old-origin navigation to its future static counterpart, checks aliases and compares existing article bytes against the clean baseline.

- `npm run validate`: unit, Astro check, lint, format, CMS build-time sync, static build and build-output tests.
- Playwright: all 34 target/edited pages on desktop and mobile (68 cases), plus download/hash/withdrawal/query checks on both devices (2 cases).
- Existing homepage/Radiolink smoke: 8 cases.
- All target screenshots captured; representative manual index, archive and firmware desktop/mobile captures visually inspected.
- Broken first-party links, canonical conflicts, unexpected old-origin runtime assets, runtime CMS references and article byte changes: zero.

The local RC8X assets must first be generated with the existing CI command, `npm run assets:sync -- src/data/publication-assets/rc8x.json`; these generated assets are not part of this PR. Initial smoke failures from missing assets/local concurrent connection errors were rerun successfully after matching the CI asset preparation and using one browser worker.

## Cutover disposition

Beyond root/base/canonical configuration, the 35 approved legacy compatibility targets leave **zero technical blockers in this branch's tested static output**. This does not authorize a domain switch.

Remaining cutover requirements: root/base/canonical owner-controlled configuration, followed by actual main GitHub Pages deployment verification of these new routes and assets after merge. A Draft PR/CI build is not proof that production already serves this branch. DNS, CNAME, custom domain, Actions, Analytics and AdSense are unchanged.

Baseline main Actions run `37882765032` completed source check, build and Pages deploy successfully. Its existing `visual.spec.ts` homepage captures timed out on both devices while scrolling images (38 other cases passed). This is an outstanding deployed-browser verification issue, not evidence that this branch's 35 routes are already deployed. No unrelated test or Actions change is made here.

Independent review is read-only; no P0/P1/P2 findings were reported. Build and browser evidence are recorded separately from that source review.
