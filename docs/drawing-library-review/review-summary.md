# Drawing Library Phase 2 review summary

Baseline: `c0fc48d29780b891dadf6891f72b19fbb464a8eb` (Phase 1 PR #60).

## Scope and counts

| Category           | Proposed records | Download files | Rights pending files | Public index cards |
| ------------------ | ---------------: | -------------: | -------------------: | -----------------: |
| 機体の設計図       |               31 |             69 |                   69 |                  6 |
| エンジン・製作資料 |                2 |              8 |                    8 |                  0 |
| Total              |               33 |             77 |                   77 |                  6 |

The 77 downloads comprise 71 local source files and six existing public files.
The 33 records comprise six existing records and 27 new proposals. These counts
are proposals, not approved aircraft groupings. All 33 records and 77 downloads
retain `REVIEW_REQUIRED` publication rights.

- Exact: 20 source-file cases. Each case shows every matching target, source and target size/SHA-256, match type, archive member when applicable, and proposed action. Member identity is distinguished from whole-file identity. This is not a count of source SHA groups. Existing matches are refresh candidates.
- Probable: 9 cases with evidence and explicit `REVIEW_REQUIRED`; no automatic exclusion or removal.
- Grouping: 42 unresolved candidates. Related files, previews, confidence and candidate relations remain visible; no grouping is finalized.
- Titles: 26 medium/low-confidence candidates (21 medium, 5 low). Original names are retained. Aircraft identifiers are not translated or inferred as confirmed names.
- Previews: 45 of 71 source files rendered; 26 have explicit unconfirmed placeholders. Only the first safely readable PDF page/image is shown. Unsupported, nested or split archives do not imply unreadable content is safe or approved.

## Local owner review

Run from the repository worktree with the original source directory:

```powershell
python -B scripts/render-drawing-review-previews.py --source '<source directory>'
node scripts/serve-drawing-library-review.mjs --source '<source directory>'
```

Open <http://127.0.0.1:4380/drawing-library-review/>. The server binds to loopback,
requires the exact loopback Host, rejects foreign Origin and mutation methods,
and checks source size/SHA before serving a source attachment. Unknown paths
are rejected. Malformed request targets return 400 without stopping the server.
HTML metadata is escaped. No approval/write API or tracking is installed.

Review code, cache and source files are not imported by Astro routes. Preview
images are stored only in ignored `.superpowers/drawing-library-review-cache`.
Production builds emit no review route or new candidate detail page. The review
must be opened locally, not deployed.

## Public index

`/drawinglibrary/` projects only the six existing static-download records and
reuses `CategoryFilter`. Desktop has three columns; mobile has one. Cards have
existing featured images, Japanese titles, short overviews, detail links and
normal download links. Existing canonical values, package IDs, aliases,
FIGHTER relationships and the F-14 old F4D slug remain unchanged. Detail links
use the same directory with a trailing slash for local Astro preview navigation.
No redirect rule was changed. No GA4 configuration was changed.

The local built preview is <http://127.0.0.1:4327/happinesea-site/drawinglibrary/>.
The public production URL remains <https://happinesea.com/drawinglibrary/>;
this PR has not been merged or deployed.

## Verification

- `npm run validate`: unit, Astro check, lint, format, build and built-output tests.
- Final unit: 153 passing; built-output: 32 passing; Python: 11 passing.
- Playwright: public index and owner review, desktop/mobile, four passing cases.
- Browser checks: zero console errors, overflow, image 404s and broken index internal links; all 77 review previews respond and decode.
- Exact/probable/group/title/category/filter counts verified against Phase 1 data.
- Source replay: all 71 file paths, bytes, modification times and SHA-256 unchanged before/after rendering.
- Archive traversal, cache hardlink isolation and source drift regression tests pass.
- Independent review: malformed request crash fixed and verified against running server; unresolved P0/P1/P2: zero in the reviewed scope.
- New binary assets: zero. Existing binaries, source inventory, proposal ledgers, rights states, WordPress compatibility metadata and GA4 configuration unchanged.
- Production-mode Astro build separately verified: six public cards; owner review and all new candidate routes absent.
- `git diff --check`: passing before commit.

Screenshots are local QA artifacts outside Git: public drawinglibrary desktop/mobile,
review summary/category/duplicate/probable/grouping/title desktop/mobile. They are
not committed to the public repository. Existing WordPress build sync is read-only;
incidental generated metadata changes are restored before commit.

## Owner decisions before publication

Confirm publication rights and source/author/license evidence; approve or correct
Japanese titles and categories; determine RC relevance of technical/full-size
materials; resolve the 42 grouping relationships and nine probable cases; inspect
the 26 unavailable previews and nested/split packages separately. The UI records
no approval and changes no ledger status. Exact matches remain skip/refresh
proposals, not authorization to replace existing published files.

Next work after owner decisions: Phase 3 detail template; Phase 4 existing-page
maintenance; Phase 5 approved unique imports; Phase 6 full publication QA.
