# Publication readiness summary

Baseline: 934dc99265771f595a94481ec8619379100d13a9. Status: READY_FOR_OWNER_PUBLICATION_APPROVAL.

- Final records: 43 (existing6 / new37).
- Inventory downloads:77; active downloads:53 (existing6 / local47).
- Exact20: skip and reuse. Probable9: confirmed4 / review5.
- Grouping42: resolved37 / review5. Title26: display ready with uncertainty retained; unidentified model labels are not identity confirmation.
- Rights pending:77 downloads /43 records. Production eligible:existing6. New eligible:0 until owner approval.
- Binary Git additions:0. Local unique staging:47 /203320048 bytes (193.90 MiB).
- Maximum active source file:50332469 bytes (48.00 MiB), below 100 MiB hard limit.
- Existing6 records use shared detail template at package/engineering routes; canonical/legacy URL/download SHA unchanged. FIGHTER relations and F-14 old F4D slug retained.
- 26 source previews unavailable; explicit generic fallback. Available source previews45; first safely readable image/page only.

## Local preparation

```powershell
python -B scripts/resolve-drawing-publication.py --source '<source directory>'
python -B scripts/render-drawing-review-previews.py --source '<source directory>'
$env:DRAWING_OWNER_PREVIEW='1'
npx astro build
node scripts/stage-drawing-owner-build.mjs --source '<source directory>' --out .superpowers/drawing-publication-build
node scripts/verify-sitemap.mjs .superpowers/drawing-publication-build
npx astro preview --ignore-lock --host 127.0.0.1 --port 4410
```

Preparation index: http://127.0.0.1:4410/happinesea-site/drawinglibrary/
Owner evidence/tag review: http://127.0.0.1:4380/drawing-library-review/
Ordinary existing-only preview: http://127.0.0.1:4327/happinesea-site/drawinglibrary/
Remove the owner environment variable before ordinary validation/build. Owner output is never a deployment artifact.

## Storage

Assessment A technically remains feasible after rights approval. Public assets currently132576276 bytes; staged originals203320048 bytes; observed final preparation artifact349898147 bytes (~333.69 MiB). Existing Git loose objects152.34 MiB plus pack156.13 KiB; projected raw asset growth is at most193.90 MiB for selected unique originals, plus derived thumbnails. No LFS/migration introduced. Git history already exists; loose-object numbers are a local measurement, not a compressed-clone forecast. Update artifact measurement at the final approved build.

[GitHub file limit](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github) blocks files above100 MiB; [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) and [upload-pages-artifact](https://github.com/actions/upload-pages-artifact) document the1GB site/artifact ceiling. Current prepared output is below these limits. Continued growth warrants reassessment.

Ruling: public-repository rights boundary prevents unapproved binaries being committed merely because the PR is Draft. Page generation and local staging complete technical preparation; promotion needs a separately reviewed asset/rights manifest. No merge or deploy in this task.

Split RAR downloads share one ASCII basename and preserve .part1.rar/.part2.rar suffixes. The record title covers the logical part set; every original filename remains unchanged in metadata. Existing maintenance covers 12 legacy routes (5 engineering articles /7 packages).

Thumbnail selection checks every active download within a record before using generic fallback. The local staging receipt records actual source download IDs; candidate image URIs remain stable per record. Promote the selected thumbnail map/fallback together with approved metadata/assets.
