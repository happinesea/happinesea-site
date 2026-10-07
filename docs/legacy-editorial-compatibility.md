# Legacy fixed pages / FAQ / archive compatibility

Baseline: `f0103b9cf4e48eb67b06577456e3e5da3db10c53` (PR #26 merged).
Public source observations: 2026-10-07. WordPress remains the source; these are static publication copies, not new editorial originals.

## Scope and classification

| Public REST scope    | READY_AS_IS | MIGRATE_STATIC | ARCHIVE_COMPAT | NEEDS_REVIEW | BLOCKED |
| -------------------- | ----------: | -------------: | -------------: | -----------: | ------: |
| Fixed pages 22       |           2 |              8 |              1 |            8 |       3 |
| FAQ 5                |           0 |              5 |              0 |            0 |       0 |
| Category archives 11 |           0 |              0 |             11 |            0 |       0 |

All 38 source URLs and five supplemental FAQ spellings returned HTTP 200. Classification is separate from source HTTP success and from verified static publication.

Added 44 static pages: eight fixed pages, five FAQ answers, 22 category archive pages (11 category roots plus 11 pagination pages), seven Blog pages and two FAQ archive entrances. Existing 14 compatibility pages and 40 asset provenance records (34 physical paths) are retained. No new downloads or images were inferred.

The fixed-page publication copies are `/sample-page`, `/sample-page-2`, `/page-examples`, `/radiolink-q-and-a`, `/radiolink-q-and-a/radiolink-wheeler-faq`, `/radiolink-productions-manual`, `/radiolink-productions-manual/minipix-manual-multicopter`, and `/radiolink-productions-manual/rc4gs-manual`. The legacy sample/demo pages remain legacy-only copies; their removal has not been approved. They are not added to the main navigation.

The five FAQ question/answer pairs retain original wording and conditions. Only the old plugin's collapse controls, letter icons and Back to Top controls are replaced by always-visible static questions/answers. They are not merged into `/support/` or rewritten to match newer product specifications.

## Archive fidelity

Archive membership, ordering and pagination come from the actual public HTML, not frontend topics or category-name inference. Root and trailing-slash variants retain the observed canonical; percent-escape casing variants of the FAQ share the same decoded static path. No redirect or canonical replacement is introduced.

The parent Radiolink support archive includes 47 articles across five pages, whereas its direct REST category query returns ten. The public Blog contains 61 distinct entries across seven pages, not all 97 public posts. These differences are preserved rather than silently reconciled. The AT9S category has zero entries; its category identity comes from the public WordPress category record, without inventing articles.

WordPress's actual category names and publicly rendered taxonomy descriptions are retained. Archive links to migrated content are base-aware; links to unmigrated content keep their original URLs. Preserving an archive entrance does **not** mean its linked articles have all been migrated.

Evidence and per-URL decisions:

- `src/data/legacy-editorial-surface-review.json`: source HTTP receipts, canonical, hashes, dependencies, classification, reasons and observed pagination URLs.
- `tests/fixtures/legacy-editorial-review.json`: reviewed publication text/links and exact archive members/order.
- `src/data/legacy-compatibility.json`: static publication copies.
- `src/data/legacy-public-surface.json`: reconciled cutover inventory, including unresolved dependencies.

## Remaining fixed-page gates

- NEEDS_REVIEW: privacy policy applicability (legacy comments/login/cookies), homepage and product-catalogue route ownership/canonical compatibility, unreviewed instruction-image alts, theme-demo image dependencies.
- BLOCKED: RC4GS legacy landing page (inline script/images/GIF), Byme-A manual entrance (Amazon iframe and image), RC6GS manual entrance (Amazon iframe and dynamic download widget).
- Preserve the three short manual links from the old manual index; their old-domain compatibility remains to be reviewed. No guessed redirect is added.
- Meaningful original links are not silently removed. Unmigrated article/manual dependencies remain domain-cutover blockers.

## Cutover accounting

| Metric                         | Before | After |
| ------------------------------ | -----: | ----: |
| Inventory URLs                 |  1,353 | 1,374 |
| Verified preserved URL entries |     75 |   127 |
| HTTP unknown                   |  1,239 | 1,235 |
| Unresolved surfaces            |  1,278 | 1,247 |
| Redirect required              |      0 |     0 |

The inventory grew by 21 discovered archive/pagination URL entries. Preserved entries count observed variants as well as unique pages; 127 is not a count of distinct Astro pages.

Domain Cutover: **NOT READY**. Remaining inventory includes 13 blocked surfaces, 645 old-domain-only asset entries, three known broken source links, 1,235 unverified HTTP entries and unresolved legacy dependencies. Four previously blocked download sources and non-JavaScript query-download compatibility remain open. Zero newly observed download failures or canonical conflicts is not proof that the unverified remainder is safe.

Phase 6 article migration is unchanged: 97 total, 33 migrated (28 Insights plus five drawings), 55 NEEDS_REVIEW, six NEEDS_TRANSFORM, three BLOCKED. Phase 6 remains PARTIAL.

## Verification

Repository-level `npm run validate` passed: 42 unit tests, Astro check (zero errors/warnings/hints), lint, format, static build and 23 build-output tests. Desktop/mobile Playwright passed 126 compatibility checks; homepage/carousel smoke passed 14 checks. Captures were visually inspected. Browser checks found zero first-party console errors, horizontal overflow, broken tested internal links, image 404s or canonical drift, and verified download bytes/checksums. Old-origin links that are not migrated are explicitly unresolved, not counted as tested local routes.

Independent read-only review approved the Draft PR scope with no P0/P1/P2 findings. The reviewer checked source text/links, archive membership/order, canonicals, retained assets, selected captures and scope exclusions. GitHub Pages production HTTP behavior has not been verified for this unmerged branch; local static output is the verified surface. This is not Domain Cutover approval.

Homepage design, article source bodies, WordPress article adapter/migration logic, Publication Contract, taxonomy schema, DNS, CNAME and Actions are unchanged. No merge or domain cutover is performed.
