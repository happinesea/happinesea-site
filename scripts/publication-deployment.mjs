import assert from 'node:assert/strict';
import { appendFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function selectMode(event, ref, input = '') {
  const mode =
    input ||
    (event === 'push' && ref === 'refs/heads/main' ? 'production' : 'staging');
  assert(['staging', 'production'].includes(mode), 'Invalid publication mode');
  if (mode === 'production') {
    assert(
      ['push', 'workflow_dispatch'].includes(event),
      'Invalid production event',
    );
    assert.equal(ref, 'refs/heads/main', 'Production requires main');
  }
  return mode;
}

export function articleOnlyChanges(files) {
  const allowed =
    /^(?:src\/content\/articles\/[^/\\\r\n]+\.md|src\/content\/article-tags\/[^/\\\r\n]+\.ya?ml|public\/images\/articles\/(?:[a-z0-9_-][a-z0-9._-]*\/)*[a-z0-9_-][a-z0-9._-]*\.(?:png|jpe?g|webp|gif))$/i;
  return files.length > 0 && files.every((file) => allowed.test(file));
}

export function isArticlePush(event, ref, articleOnly) {
  return event === 'push' && ref === 'refs/heads/main' && articleOnly === true;
}

export function requireArticlePages(pages) {
  assert.equal(
    pages.cname,
    'happinesea.com',
    'Article publication requires the production custom domain',
  );
  assert.equal(
    pages.build_type,
    'workflow',
    'Article publication requires Actions Pages',
  );
}

function diffPaths(base, head, mergeBase = false) {
  assert(
    /^[a-f0-9]{40}$/i.test(base ?? '') && !/^0+$/.test(base),
    'Missing diff base',
  );
  assert(/^[a-f0-9]{40}$/i.test(head ?? ''), 'Missing diff head');
  return execFileSync(
    'git',
    [
      'diff',
      '--name-only',
      '--no-renames',
      '-z',
      ...(mergeBase ? [`${base}...${head}`] : [base, head]),
      '--',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  )
    .split('\0')
    .filter(Boolean);
}

export function unchangedPublicationCode(base, head) {
  try {
    const files = diffPaths(base, head);
    return files.length === 0 || articleOnlyChanges(files);
  } catch {
    return false;
  }
}

export async function publishedProductionSha(readApi) {
  const deployments = await readApi('deployments?per_page=20');
  const candidates = await Promise.all(
    deployments
      .filter((d) =>
        ['github-pages', 'production-cutover'].includes(d.environment),
      )
      .map(async (d) => {
        const [status] = await readApi(`deployments/${d.id}/statuses`);
        // Approval-only jobs have no public URL; staging and inactive runs are not a baseline.
        if (
          status?.state === 'success' &&
          ['https://happinesea.com/', 'https://happinesea.com'].includes(
            status.environment_url,
          ) &&
          /^[a-f0-9]{40}$/i.test(d.sha)
        )
          return { sha: d.sha, at: status.created_at, log: status.log_url };
      }),
  );
  const latest = candidates
    .filter(Boolean)
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  const ids = latest?.log?.match(/\/actions\/runs\/(\d+)\/job\/(\d+)$/);
  if (!ids) return;
  const [job, run] = await Promise.all([
    readApi(`actions/jobs/${ids[2]}`),
    readApi(`actions/runs/${ids[1]}`),
  ]);
  if (
    job.name === 'deploy' &&
    job.conclusion === 'success' &&
    job.head_sha === latest.sha &&
    String(job.run_id) === ids[1] &&
    run.path === '.github/workflows/deploy.yml' &&
    run.head_branch === 'main' &&
    run.head_sha === latest.sha &&
    ['push', 'workflow_dispatch'].includes(run.event)
  )
    return latest.sha;
}

async function matchesPublishedCode() {
  return unchangedPublicationCode(
    await publishedProductionSha(api),
    process.env.GITHUB_SHA,
  );
}

async function classifyChanges() {
  const event = JSON.parse(
    await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'),
  );
  const base = event.before ?? event.pull_request?.base?.sha;
  const head = event.pull_request?.head?.sha ?? process.env.GITHUB_SHA;
  let files = [];
  if (
    ['push', 'pull_request'].includes(process.env.GITHUB_EVENT_NAME) &&
    /^[a-f0-9]{40}$/i.test(base ?? '') &&
    !/^0+$/.test(base) &&
    /^[a-f0-9]{40}$/i.test(head ?? '')
  ) {
    try {
      files = diffPaths(base, head, Boolean(event.pull_request));
    } catch {
      // Missing history or an unreadable diff must retain full validation/approval.
    }
  }
  const articleOnly = articleOnlyChanges(files);
  await appendFile(process.env.GITHUB_OUTPUT, `article_only=${articleOnly}\n`);
  console.log(
    `Publication scope: ${articleOnly ? 'articles only' : 'development/full'}`,
  );
}

export function requireApproval(environment) {
  assert(
    environment.protection_rules?.some(
      (rule) =>
        rule.type === 'required_reviewers' && rule.reviewers?.length > 0,
    ),
    'production-cutover environment must have owner-designated required reviewers',
  );
}

export function requireStagingPages(pages) {
  assert.equal(
    pages.cname,
    null,
    'Remove custom domain before staging rollback deployment',
  );
}

async function api(path) {
  assert(process.env.GH_TOKEN, 'GH_TOKEN required for deployment preflight');
  const response = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/${path}`,
    {
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );
  assert.equal(
    response.status,
    200,
    `GitHub preflight ${path}: ${response.status}`,
  );
  return response.json();
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  assert(
    ['changes', 'select', 'guard'].includes(process.argv[2]),
    'Invalid deployment command',
  );
  assert(
    process.env.GITHUB_OUTPUT || process.argv[2] === 'guard',
    'GITHUB_OUTPUT required',
  );
  if (process.argv[2] === 'changes') {
    await classifyChanges();
  } else {
    const mode = selectMode(
      process.env.GITHUB_EVENT_NAME,
      process.env.GITHUB_REF,
      process.env.INPUT_PUBLICATION_MODE,
    );
    let articleOnly = isArticlePush(
      process.env.GITHUB_EVENT_NAME,
      process.env.GITHUB_REF,
      process.env.ARTICLE_ONLY === 'true',
    );
    if (articleOnly) {
      const unchanged = await matchesPublishedCode();
      if (process.argv[2] === 'guard')
        assert(
          unchanged,
          'Unpublished code changes require production-cutover approval',
        );
      articleOnly = unchanged;
    }
    if (mode === 'production') {
      if (articleOnly) requireArticlePages(await api('pages'));
      // A main merge is the publication approval; full QA remains in workflow.
    }
    if (process.argv[2] === 'guard' && mode === 'staging') {
      requireStagingPages(await api('pages'));
    }
    if (process.argv[2] === 'select') {
      assert(process.env.GITHUB_OUTPUT, 'GITHUB_OUTPUT required');
      await appendFile(
        process.env.GITHUB_OUTPUT,
        `article_only=${articleOnly}\nmode=${mode}\nbase_url=${mode === 'production' ? 'https://happinesea.com/' : 'https://happinesea.github.io/happinesea-site/'}\n`,
      );
    }
    console.log(`Publication mode: ${mode}`);
  }
}
