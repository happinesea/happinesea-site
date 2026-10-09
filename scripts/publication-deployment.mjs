import assert from 'node:assert/strict';
import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function selectMode(event, ref, input = '') {
  const mode = input || 'staging';
  assert(['staging', 'production'].includes(mode), 'Invalid publication mode');
  if (mode === 'production') {
    assert.equal(
      event,
      'workflow_dispatch',
      'Production requires manual dispatch',
    );
    assert.equal(ref, 'refs/heads/main', 'Production requires main');
  }
  return mode;
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
  const mode = selectMode(
    process.env.GITHUB_EVENT_NAME,
    process.env.GITHUB_REF,
    process.env.INPUT_PUBLICATION_MODE,
  );
  if (mode === 'production')
    requireApproval(await api('environments/production-cutover'));
  if (process.argv[2] === 'guard' && mode === 'staging') {
    requireStagingPages(await api('pages'));
  }
  if (process.argv[2] === 'select') {
    assert(process.env.GITHUB_OUTPUT, 'GITHUB_OUTPUT required');
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `mode=${mode}\nbase_url=${mode === 'production' ? 'https://happinesea.com/' : 'https://happinesea.github.io/happinesea-site/'}\n`,
    );
  }
  console.log(`Publication mode: ${mode}`);
}
