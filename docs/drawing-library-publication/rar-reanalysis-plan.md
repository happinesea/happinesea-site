# RAR reanalysis implementation plan

> Use superpowers:executing-plans for native implementation in this session.

Goal: retain original evidence while producing deterministic local ZIP distributions and member-grounded record/preview review.

Architecture: a bounded 7-Zip stdout reader validates names before reading members into hash-named local files. Python zipfile creates stable UTF-8 ZIPs. A separate reanalysis overlay retains historical ledgers and original download IDs; runtime applies derived distribution metadata only in owner preview.

Constraints: baseline ae194413d80cf759e3a20d0963b41ef702c0ae10; no installs, source mutation, rights promotion, WordPress write, merge or deploy. All binary artifacts stay in ignored local staging. Existing URLs/assets remain unchanged.

Review focus: traversal/Windows collisions; encrypted/split archives; nested expansion; corrupt member streams; duplicate payloads and source/derived identity confusion.

- [x] Add safe 7-Zip inventory/conversion with traversal, collision, encrypted, size/depth limits and deterministic ZIP/member replay tests.
- [x] Analyze all 44 RARs; verify original 71 source hashes and RAR before/after; inspect member documents/images and compare existing download payloads.
- [x] Produce member-grounded record/download/preview overlay, dedup/grouping/title/tag decisions, missing-image report and storage measurements.
- [x] Integrate overlay with existing owner staging/detail/review and filters; keep ordinary/production catalog unchanged.
- [x] Run full validate, Python tests, owner desktop/mobile 43-record and ZIP HTTP/SHA/reopen checks; capture representative screenshots, review diff, push Draft PR.
