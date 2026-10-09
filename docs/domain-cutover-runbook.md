# Domain Cutover execution runbook

Status: **wiring prepared; execution requires separate owner approval**. The workflow changes do not configure DNS, CNAME, Pages, HTTPS, environment protections or deploy production. A main push defaults to staging; production requires a manual dispatch and protected environment approvals.

Public frontend: Astro static HTML on GitHub Pages. Editing/build-time CMS: `https://cms.happinesea.com`. WordPress `home` / `siteurl` remain `https://happinesea.com`; do not change them to the CMS hostname. CMS outage must fail a new build, not replace a working deployment with an empty site.

## 1. Preflight and evidence

Use a separately approved maintenance window. Record the exact approved main SHA, operator approval, rollback deadline, current deployment run/artifact and DNS/Pages settings in an owner-held execution log, not secrets or infrastructure backups in this public repository.

Read-only observations on 2026-10-09, baseline `944643e5851184cea5bf014450b666284f3fa890` (PR #42 merged): Pages uses Actions, `cname=null`, staging URL `https://happinesea.github.io/happinesea-site/`, HTTPS enforced. The `github-pages` environment has a branch policy but **no required-reviewer protection**. Latest main deployment was still building when inspected; this is not evidence of successful deployed-main QA. Recheck all values at execution time.

```powershell
git fetch origin
git rev-parse origin/main
gh api repos/happinesea/happinesea-site/pages
gh run list --workflow deploy.yml --limit 3
gh api repos/happinesea/happinesea-site/environments/github-pages
gh variable list --repo happinesea/happinesea-site
Resolve-DnsName happinesea.com -Type A
Resolve-DnsName happinesea.com -Type AAAA
Resolve-DnsName cms.happinesea.com -Type A
Resolve-DnsName www.happinesea.com -Type CNAME
$cms = Invoke-RestMethod https://cms.happinesea.com/wp-json/
$cms | Select-Object name,url,home
```

Confirm `/wp-json/` is 200 JSON, `name=happinesea hobby`, `url/home=https://happinesea.com`. REST metadata alone does not prove database options: the owner must also read `wp option get home` and `wp option get siteurl` in the established WordPress profile/document root, as its normal execution user. Resolve that path from the existing server setup; do not guess it or change either option. Check a real CMS posts API fetch and existing source-hash review gates.

Export the original apex/www DNS records and TTL, including AAAA/ALIAS/ANAME and any relevant CAA records, and Pages settings. Preserve mail/TXT records, CMS DNS/TLS/vhost and old WordPress frontend/TLS for rollback. CMS must resolve independently of apex: do not leave `cms` as a CNAME to `happinesea.com`. Lowering TTL is itself a separately approved DNS operation, sufficiently before the window; it cannot invalidate existing caches immediately.

Stop if CMS API redirects to an apex `/wp-json/` endpoint, source gates fail, downloads differ, approved routes disappear, active deployments are unknown, or rollback evidence is missing. Archive staging artifact and verify it can be restored before proceeding. A green deploy plus deployed browser/HTTP checks is required; a historical or local-only pass is insufficient.

## 2. Actions production-mode wiring

Selector: `workflow_dispatch` input `publication_mode`, default `staging`. Automatic main push also selects staging. Only an explicit manual **main** dispatch can select production. No repository variable can implicitly enable production. Invalid input fails closed.

The build job explicitly injects the validated selection into its process environment:

```yaml
env:
  PUBLICATION_MODE: ${{ needs.check.outputs.mode }}
```

The workflow runs `npm run build` directly, retaining CMS sync, Astro build, exact alias copying and compatibility finalization. It serves that artifact locally and checks origin/base/canonical/OG/sitemap/robots, all first-party references, HTML bytes, manual aliases and download hashes before uploading it as `github-pages` (7-day retention). No source gates or site/base overrides are bypassed.

Production sequence:

- Preflight reads `production-cutover` environment through GitHub API. Missing environment, unreadable rules or no required reviewer stops before approval/build. A branch policy alone is insufficient.
- `approve-production` pauses in that protected environment before production build.
- Build rechecks protection, builds and verifies static output, then uploads the verified artifact.
- `deploy` pauses in `production-cutover` again so owner can inspect the uploaded artifact/run/SHA before releasing the deployment. It rechecks protection before `deploy-pages`.
- `browser-check` downloads that run's exact artifact, compares deployed HTML/downloads/aliases against it and captures desktop/mobile with the selected public base.

Owner must create/configure **`production-cutover`** with owner-designated required reviewers, a main-only deployment branch policy and appropriate admin-bypass/self-review restrictions before execution. This PR does not create it. If protection is unavailable, stop; do not replace the gate with an immediately deploying workflow. Staging retains the existing `github-pages` environment.

After cutover, a default staging run cannot overwrite a custom-domain site: its build/deploy guard requires Pages `cname=null`. Subsequent production publications require fresh manual dispatch and approvals, not an implicit persistent selector. Restore DNS/Pages settings before staging rollback. Freeze main pushes and drain old queued/running runs during the window; old pre-wiring runs do not acquire these guards retroactively.

The verifier now permits HTTPS same-origin static runtime assets only when verifying actual production base. Local/staging checks still reject old-origin runtime assets; CMS, PHP/REST and legacy query runtime dependencies remain forbidden. Every generated HTML response must match the approved artifact bytes. No production workflow dispatch or protection-setting mutation is part of this PR's QA.

Only in the approved window, after merging/validating wiring and configuring protection, owner command:

```powershell
gh workflow run deploy.yml --repo happinesea/happinesea-site --ref main -f publication_mode=production
```

This is a **deploying operation**, not a preflight command. Drain/cancel older runs and freeze main pushes. Record the resulting run ID/SHA and mode. Approve build first, then verify the uploaded artifact before approving deploy. Letting its artifact expire requires a fresh reviewed run, not bypassing verification.

## 3. Build/artifact gate before public switching

In an isolated checkout of the approved SHA, run staging `npm run validate` with `PUBLICATION_MODE` unset. Fetch verified official RC8X assets using the same command as Actions when needed. Preserve that staging artifact separately. Then build production locally; this does not publish it:

```powershell
$env:PUBLICATION_MODE='production'
npm run build
python -m http.server 4343 --bind 127.0.0.1 --directory dist
```

In a second PowerShell terminal in the same checkout:

```powershell
$env:PUBLICATION_MODE='production'
$env:E2E_BASE_URL='http://127.0.0.1:4343/'
node scripts/verify-publication-origin.mjs dist
npx playwright test tests/e2e/publication-origin.spec.ts --project=desktop --project=mobile
```

Require zero staging-origin/project-prefix residuals; production canonical/OG/sitemap/robots consistency; zero broken first-party links/assets, image failures and CMS runtime requests; legacy canonical fidelity; exact download hashes. Serve actual static output: Astro preview's route manifest can miss aliases written by the post-build finalizer. Actions uses runner Python's static server; staging wraps `dist` under a temporary `happinesea-site` directory. The verifier checks the built filesystem as well as HTTP: keep the matching `dist` for deployed checks. Its JSON evidence may be regenerated locally; do not unintentionally commit audit timestamps/data during execution. Existing `test:dist` assertions are staging-specific, so do not run production `npm run validate` and treat that mismatch as permission to weaken tests.

Build and approve the root artifact **before** changing DNS. Production deployment changes the one Pages site's serving artifact; it is not an independent preview slot. Saving a custom domain can also change github.io redirect behavior. There is no guaranteed zero-downtime/atomic switch: allow a short Pages transition and DNS-cache mixed routing; schedule and communicate the window.

Local build is preliminary only: CMS and fetched assets can differ from the Actions build despite identical Git SHA. While the future deployment is paused, download that run's `github-pages` artifact and inspect the exact bytes to be deployed. Record artifact identity/digest, run ID, head SHA and selected mode; reject missing, expired or mismatched artifacts. Owner supplies `$approvedRun` from the recorded run, not an arbitrary latest run:

```powershell
gh run view $approvedRun --repo happinesea/happinesea-site --json headSha,status,jobs
$artifactDir = ".cache/cutover-artifact-$approvedRun"
gh run download $approvedRun --repo happinesea/happinesea-site --name github-pages --dir $artifactDir
New-Item -ItemType Directory -Path "$artifactDir/site" -Force
tar -xf "$artifactDir/artifact.tar" -C "$artifactDir/site"
```

Serve the extracted `site` directory with an approved local static HTTP server (for example, if Python is available: `python -m http.server 4344 --bind 127.0.0.1 --directory "$artifactDir/site"`). In another terminal keep the approved repository as cwd, redefine `$artifactDir` to the recorded absolute extraction path (PowerShell variables do not carry between terminals), set production mode and `E2E_BASE_URL=http://127.0.0.1:4344/`, then run `node scripts/verify-publication-origin.mjs "$artifactDir/site"` and the desktop/mobile origin tests. Verify screenshot and download bytes from this artifact, not local `dist`. Only then approve the paused deploy of **that same artifact**. Confirm artifact packaging/retention still matches this procedure before execution; rehearse the same extraction/recovery for the saved staging artifact.

## 4. Pages custom domain, DNS, HTTPS — owner execution order

1. Verify domain ownership in GitHub first, following the current [domain-verification instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages). This may require an approved TXT change. Keep the verification record.
2. Freeze pushes/deploys; approve production build and complete the uploaded artifact gate. **Keep the second, deploy approval paused** while performing the following owner steps. Record the exact run/SHA; do not approve first deployment while apex still serves WordPress, because the immediate post-deploy byte checks would correctly fail against the old frontend.
3. Repository Settings → Pages: retain **GitHub Actions** publishing, set custom domain to `happinesea.com`. Do this **before** pointing DNS at Pages. A custom Actions workflow does not require a source `CNAME` file; do not add one as a substitute for Pages settings.
4. Change only apex web-serving records to the current [GitHub Pages DNS values](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site). Current documented A values: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`. Reconfirm immediately before execution. Use an appropriate provider-supported ALIAS/ANAME alternative if approved. Remove conflicting apex web records, including stale AAAA; if IPv6 is enabled, use the documented Pages AAAA set. Do not touch CMS, MX, mail or unrelated TXT. No wildcard DNS.
5. Decide www scope explicitly: if preserving www access, point `www` CNAME to `happinesea.github.io` (no repository path), with apex as preferred custom domain. Preserve the original www value for rollback; do not assume it was previously configured.
6. Verify authoritative and public-resolver A/AAAA answers and independent CMS A/API. DNS propagation is not instantaneous. Wait for Pages DNS verification and certificate readiness; do not use `curl -k` to declare TLS valid. Enable Enforce HTTPS when available. Certificate readiness can take up to 24 hours; investigate conflicting DNS/CAA if it fails rather than disabling security permanently. Once DNS/TLS are ready, release the second approval to deploy the already verified root artifact. Existing staging content can be unsuitable at the custom domain during this maintenance transition; do not claim zero downtime. Confirm exact deployed SHA. If resolver propagation causes only the post-deploy check to fail, rerun only failed `browser-check` after convergence using the same retained artifact, not the whole production deployment/approvals.
7. Only declare success after actual public HTTPS and all gates below pass. Keep old hosting available until the rollback window closes.

These ordering/TLS constraints follow [GitHub custom-domain guidance](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) and [HTTPS guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https). Recheck them at execution time.

## 5. Public verification and completion gate

```powershell
curl.exe --fail --show-error --location https://happinesea.com/ -o NUL
curl.exe --fail --show-error --location https://happinesea.com/robots.txt
curl.exe --fail --show-error --location https://happinesea.com/sitemap-index.xml
curl.exe --show-error --head http://happinesea.com/
$env:PUBLICATION_MODE='production'
$env:E2E_BASE_URL='https://happinesea.com/'
node scripts/verify-publication-origin.mjs dist
npx playwright test tests/e2e/publication-origin.spec.ts --project=desktop --project=mobile
```

Use `dist` extracted from the **actual deployed artifact**, not a separately rebuilt snapshot. Record final URL, status and redirects as well as canonical; HTTP must lead to valid HTTPS on the intended origin, not merely end at some 200 response. Read root HTML canonical, OG URL, every sitemap loc and robots sitemap entry. Require `https://happinesea.com` with root base; legacy canonical slash/`.html` exceptions stay source-owned. Verify 404 withdrawal behavior with redirects disabled, not as broken-live-route failures.

Representative routes: `/`, `/insights/`, `/radiolink/`, `/radiolink/rc8x/`, `/manuals/rc8x/`, `/drawinglibrary/`, `/drone-rc-glossary/`, `/privacy-policy`, `/radiolink-productions-manual/byme-a-manual`, `/downloads/`. Also test exact `.html` aliases from `src/data/wordpress-insight-manifest.json`, manual aliases/firmware/download-tag entries from `src/data/cutover-compatibility.json`, and all Byme-A chapter links. Take desktop/mobile captures and inspect them. Meaningful hash anchors remain navigable; query-download URLs render static guidance/direct links, **not** PHP or automatic download responses.

Download all permanent and legacy static URLs from `src/data/static-downloads.json`; require HTTP 200, actual file bytes/content type and SHA-256 equality. The existing verifier performs byte/hash checks; separately inspect response content type/filename, PDF/ZIP/DOCX decode/open and GIF preservation. Keep distinct same-name/different-hash files distinct. Check all first-party navigation/assets, canonical conflicts, route collisions and runtime requests. Browser CMS requests must be zero; the CMS REST API must still work independently after DNS changes. Inspect CMS embedded/media redirects too: working before cutover is not sufficient.

Completion: deployed SHA/mode proven; HTTPS valid; root/base/canonical/sitemap/robots pass; aliases/downloads work; no unexplained 404 or runtime CMS dependency; no unresolved required content/asset blocker. Reconcile latest inventories/owner withdrawals before signing off. This runbook alone does **not** declare Domain Cutover READY.

## 6. Rollback

Rollback immediately on TLS failure beyond the approved window, wrong artifact/mode, broken critical downloads/routes, runtime CMS reliance or canonical drift. Freeze new deploys and cancel/drain queued runs first.

1. Restore original apex/www DNS records from the preflight export; retain CMS independent records and old WordPress vhost/TLS. Confirm old WordPress frontend via its original host/IP and normal certificate, then from public resolvers as caches expire. Do not change WordPress home/siteurl.
2. Once apex is no longer intended to point to Pages, remove the Pages custom domain and restore saved staging settings. Leave domain verification TXT intact; avoid removing the custom domain while live DNS still points to an unclaimed Pages host. Mixed resolver caches may persist, so domain ownership verification and the retained production artifact limit this transition risk.
3. Dispatch `gh workflow run deploy.yml --repo happinesea/happinesea-site --ref main -f publication_mode=staging` after Pages custom domain removal; its guard prevents project-base output at a still-configured custom domain. This rebuilds/verifies before staging deployment. Never redeploy an old run without confirming its mode/SHA; a CMS/source gate failure is not a reason to skip gates. If rebuilding fails, restored WordPress hosting remains the public fallback; keep Pages' existing artifact and use the separately rehearsed artifact recovery procedure rather than an empty site. This workflow has no unvalidated arbitrary-artifact deploy input.
4. Verify staging at `https://happinesea.github.io/happinesea-site/`, previous WordPress apex frontend, TLS, CMS API, canonicals, downloads and representative routes. Keep automatic deploys frozen until settings/artifact/selector agree. Record rollback run IDs and residual DNS caches; restore normal automation only after owner sign-off.

## Preparation verification

This wiring changes workflow guards and verification, not UI, taxonomy, CMS fetch, content, canonical or asset bytes. DNS, CNAME, Pages settings and production deployments were not changed. Production dry-run QA exercises local build/HTTP verification and fail-closed policy tests, not hosted approvals or production deploy. Real environment approvals and public cutover validation remain owner operations against the final approved SHA.

Wiring QA: `npm run validate` passed (86 unit tests, 26 build-output tests), actionlint passed, and both mode static HTTP verifiers passed 303 HTML / 302 canonical-OG pairs / 830 references / 43 download URL hashes / 23 manual aliases / 90 article aliases. Production staging-origin/prefix residuals were zero. Desktop/mobile passed 16 cases in each mode; staging was rerun serially after a local Python-server parallel connection-capacity failure. Production frontend dry-run reused the live-validated CMS snapshot and verified an extracted tar artifact, with no production publication. The actual missing `production-cutover` environment was read-only checked and rejected by CLI preflight; protection was not created or changed. Independent review has no outstanding P0/P1/P2 findings. Initial Astro-preview alias failures were resolved by using static serving, not filtering failed routes. Generated QA artifacts were moved out of the source tree before the final repository-level validation.
