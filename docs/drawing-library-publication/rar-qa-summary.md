# RAR reanalysis QA

- Existing7-Zip26.04 x64:44 listings succeeded;43 complete archives converted. Split continuation1 retained; encrypted0; unsafe/corrupt0.
- Safe stdout extraction uses literal member names, validated Windows/Unicode paths, no links, bounded count/bytes/ratio/time and cumulative nested depth2. Unsafe descendant states propagate to root and block ZIP conversion.
- Stable ZIP: UTF-8 names, sorted entries,1980-01-01 timestamp, DEFLATE9. Every complete archive generated twice with equal ZIP SHA. Nested RARs become nested ZIPs; transformed-name collisions are rejected. Canonical member SHA and transformed-distribution member SHA are separately recorded.
- Original44 RAR and current71 source paths/bytes/mtime/SHA replay unchanged. The44 path relocations occurred before this task and are recorded separately.
- ZIP43 SHA/reopen/CRC and recursive member SHA replay passed; normalized source ZIP1 also passed. Active ZIP payload duplicates0; nested RAR distributions0. Original members and raw extracted document text remain local evidence.
- Python19 tests passed, including traversal, drive/UNC/reserved paths, NFC ancestor collision, encryption/expansion, recursive review propagation and nested conversion with unchanged leaf bytes.
- Node unit166 passed. Full npm validate: Astro0 errors, lint/format, build and35 build-output tests passed. The final run is recorded in rar-qa-report.json.
- Owner43 records ×desktop/mobile =86 page checks passed: image decode, tags beneath title, metadata, download counts, no overflow or console errors.51 download HTTP/size/SHA checks and39 derived ZIP owner-review HTTP/SHA checks passed.
- Drawing Playwright6 passed desktop/mobile. Existing12 drawing routes ×2 =24 checks passed; titles/canonical/download links preserved.
- Owner sitemap62 entries, new37 detail pages excluded, duplicate canonical pages0. Normal build still exposes existing6 only.
- Final ignored owner artifact348695978 bytes (~332.54 MiB). Selected source-only binaries45 /199183120 bytes; future repository growth would be those approved binaries plus approved derived previews. No binary added to Git.
- Independent read-only review found2 safety issues (descendant review propagation and NFC ancestor collision), both fixed and reproduced by tests. Final focused re-review: unresolved P0/P1/P2=0; no source access by reviewer.
- Representative desktop/mobile screenshots cover recovered FOXIE, FD3 nested package, split Model Jet Engines, Furia/Hornet, CAD-only F4U, unknown Boeing, Office-only paper aircraft and F4D; stored outside Git in the task visualization folder.

Commands:

```text
python -B -m unittest discover -s tests -p '*drawing*test.py'
python -B scripts/verify-drawing-rar-artifacts.py --source <original71-root>
npm run validate
node scripts/verify-drawing-rar-owner.mjs --screenshots <local-screenshot-directory>
```

The broad inherited legacy-compatibility browser suite was not rerun: PR62 documented existing baseline failures for bare directory routes and intentionally safety-blocked Office downloads. This task validates all drawing routes and leaves those unrelated behaviors unchanged.

CAD/legacy Office embedded images were not inspected with unsupported tooling. Two records have no standalone image/PDF; two old Office records use UNSUPPORTED_DOCUMENT_PREVIEW. Missing source previews are listed in missing-images.md; absence of embedded imagery is not asserted.
