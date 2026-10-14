# RAR reanalysis publication readiness

> Current owner correction: four unsuitable records excluded; preparation39 records /47 downloads /35 active derived ZIP. Original43-record reanalysis evidence below is retained. See [owner exclusions](owner-exclusions.md).

Baseline: ae194413d80cf759e3a20d0963b41ef702c0ae10. Status: READY_FOR_OWNER_PUBLICATION_APPROVAL. No rights promotion, merge or deploy.

## Results

- Existing 7-Zip 26.04 x64 listed all44 RAR files.43 complete archives converted;1 continuation volume retained as canonical evidence. Split set:2 files /1 set. Encryption/password0; corrupt/unsafe0. Nested packages3, all safely analyzed.
- Source71 bytes/SHA match historical inventory. Owner relocated RAR44 before this task; source-relocations.json records historical/current paths. Current path/mtime/bytes/SHA unchanged during this task.
- Exact20:20 SHA replay confirmed. Probable9:5 EXACT_MEMBER_DUPLICATE /4 SAME_MODEL_DIFFERENT_VERSION. All5 previously unresolved probable entries now resolved. Differing supplemental files remain separate downloads.
- Prior grouping-review5 resolved from nested/split member inventory. All43 records retained; existing URLs/canonical/download bytes unchanged.
- Title refinements6; source-grounded tag changes7 records. Unknown identifiers without sufficient evidence remain uncertain.
- Recovered previews12; previews33/37 new records; missing/unsupported4. Existing6 featured images preserved. No AI-generated imagery.
- Owner distributions51 = existing6 +local45; active derived ZIP39 (38 RAR roots and1 normalized source ZIP). Nested RAR members are ZIP distributions, preserving leaf bytes/SHA. No original RAR is an additional active download. One ZIP contains the complete split set.
- Rights pending: inventory77 downloads /43 records. Production retains existing6; new public eligibility0.

## Probable decisions

| Original source                   | Decision                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| 3d双翼机.rar                      | EXACT_MEMBER_DUPLICATE; reuse existing Pitts ZIP                                           |
| F-14.rar                          | EXACT_MEMBER_DUPLICATE; reuse existing F-14 ZIP                                            |
| Draken.zip                        | EXACT_MEMBER_DUPLICATE; previous verified SHA evidence retained                            |
| c-17运输机.zip                    | EXACT_MEMBER_DUPLICATE; previous verified SHA evidence retained                            |
| F4D.rar                           | EXACT_MEMBER_DUPLICATE; reuse existing F4D ZIP                                             |
| J10.rar / 歼10.rar                | SAME_MODEL_DIFFERENT_VERSION; two identical member payloads, differing supplemental member |
| 简单的f22.rar / 简单的F22图纸.rar | SAME_MODEL_DIFFERENT_VERSION; common drawing/photo SHA, differing supplemental images      |

Comparison excludes directory prefixes and Thumbs.db; container bytes are not claimed identical. Every original file is retained. Machine-readable exact/member evidence is in rar-reanalysis.json; historical publication.json remains unchanged.

## Title refinements

- FOXIE CAD設計図: nested FOXIE.dxf and Foxie.jpg.
- FD 3/67・FD3/64 模型用タービンエンジン製作資料: nested PDF filenames and first-page identifiers; both source identifiers retained.
- Furia Ultralight Helicopter 設計図: PDF filename/metadata and visually checked cover. Manned aircraft plans; RC applicability is not established.
- Hornet ジャイロプレーン資料: metadata and visually checked HORNET Sport Gyroplane Documentation cover.
- Model Jet Engines 模型用ジェットエンジン製作資料: PDF title metadata; no author/license inference.
- セスナ182 図面資料（原題：赛斯纳）: member182SHEET2.jpg; separate from 塞斯纳182.pdf pending design comparison.

## Storage

| Measurement                                              |     Bytes |
| -------------------------------------------------------- | --------: |
| Original RAR44                                           | 190889898 |
| All derived ZIP43                                        | 194558469 |
| Delta                                                    |  +3668571 |
| Largest ZIP                                              |  55919107 |
| Selected derived ZIP39                                   | 185583113 |
| Selected source-only staging45                           | 199183120 |
| Active publication downloads51, including existing files | 210595969 |
| Duplicate active ZIP payloads                            |         0 |

Maximum ZIP53.33 MiB is below100 MiB. Selected source staging189.96 MiB decreases by4136928 bytes from PR62. Assessment A remains technically feasible after rights approval; future repository growth would be selected unique source binaries plus approved previews. Binary Git additions0. Pages artifact measurement is recorded in rar-qa-summary.md; no storage migration.

## Local reproduction

1. `python -B scripts/reanalyze-drawing-rars.py --source <RAR-directory>`
2. `python -B scripts/reconcile-drawing-rars.py --source <original71-root>`
3. Build with `DRAWING_OWNER_PREVIEW=1`, then `node scripts/stage-drawing-owner-build.mjs --source <original71-root> --out .superpowers/drawing-publication-build`.
4. `node scripts/serve-drawing-library-review.mjs --source <original71-root> --port 4380`.
5. Owner library preview on4410; ordinary existing-only preview on4327. Never deploy owner output; owner build is rejected in production/CI.

Owner review: http://127.0.0.1:4380/drawing-library-review/

Owner library: http://127.0.0.1:4410/happinesea-site/drawinglibrary/

## Remaining owner decisions

- Approve redistribution rights and selected source/derived previews separately. Local possession and existing download are insufficient permission evidence.
- Review CAD-only F4U/P51 and legacy Office-only beginner/paper-aircraft records with appropriate offline tooling before concluding embedded images are absent. See missing-images.md.
- FD3/64 and FD3/67 occur in one source package; structure is resolved but their design relationship remains REVIEW_REQUIRED.
- Optionally refine unresolved model labels and supplementary version relationships using source evidence; no uncertain identity is silently confirmed.
- Approve ZIP distribution and thumbnail provenance in a separate publication promotion change. No unapproved binary is committed here.

Source document text stays in local receipts. The public ledger retains first-page text hashes/length/status and short title evidence, not source paragraphs. RAR remains canonical evidence; ZIP is a derived distribution artifact. Current owner tag counts and per-record previous/new state are machine-readable in rar-reanalysis.json.
