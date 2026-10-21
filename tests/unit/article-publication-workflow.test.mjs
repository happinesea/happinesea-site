import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { parse } from 'yaml';
import {
  articleOnlyChanges,
  isArticlePush,
  requireArticlePages,
  unchangedPublicationCode,
  publishedProductionSha,
} from '../../scripts/publication-deployment.mjs';

test('only CMS articles, tag data and article images qualify for the light path', () => {
  assert.equal(
    articleOnlyChanges([
      'src/content/articles/記事.md',
      'src/content/article-tags/tag.yml',
      'public/images/articles/nested/photo.JPG',
    ]),
    true,
  );
  for (const path of [
    '.pages.yml',
    '.github/workflows/deploy.yml',
    'package.json',
    'src/data/wordpress-insights.json',
    'src/data/products.json',
    'src/content/docs/manuals/example.md',
    'src/content/articles/code.mdx',
    'public/images/articles/code.js',
    'public/images/articles/image.svg',
    'src/content/articles/../docs/manual.md',
    'src/content/articles/a.md\n.pages.yml',
  ])
    assert.equal(
      articleOnlyChanges(['src/content/articles/a.md', path]),
      false,
      path,
    );
  assert.equal(articleOnlyChanges([]), false);
  assert.equal(
    articleOnlyChanges([
      ...Array.from({ length: 350 }, (_, i) => `src/content/articles/a${i}.md`),
      '.pages.yml',
    ]),
    false,
  );
});

test('only an article-only main push can use merge approval instead of cutover approval', () => {
  assert.equal(isArticlePush('push', 'refs/heads/main', true), true);
  assert.equal(isArticlePush('push', 'refs/heads/main', false), false);
  assert.equal(isArticlePush('push', 'refs/heads/feature', true), false);
  assert.equal(
    isArticlePush('workflow_dispatch', 'refs/heads/main', true),
    false,
  );
  assert.equal(isArticlePush('pull_request', 'refs/heads/main', true), false);
  assert.doesNotThrow(() =>
    requireArticlePages({ cname: 'happinesea.com', build_type: 'workflow' }),
  );
  for (const pages of [
    {},
    { cname: null },
    { cname: 'other.example', build_type: 'workflow' },
    { cname: 'happinesea.com', build_type: 'legacy' },
  ])
    assert.throws(() => requireArticlePages(pages));
});

test('classifier examines the full Git diff, including deletions and both rename paths', () => {
  const dir = mkdtempSync(join(tmpdir(), 'article-changes-'));
  const script = new URL(
    '../../scripts/publication-deployment.mjs',
    import.meta.url,
  );
  const git = (...args) =>
    execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  try {
    git('init', '--quiet');
    git('config', 'user.name', 'workflow-test');
    git('config', 'user.email', 'workflow-test@example.invalid');
    mkdirSync(join(dir, 'src/content/articles'), { recursive: true });
    writeFileSync(join(dir, 'src/content/articles/a.md'), 'draft');
    git('add', '.');
    git('commit', '--quiet', '-m', 'base');
    const before = git('rev-parse', 'HEAD');
    writeFileSync(join(dir, 'src/content/articles/a.md'), 'published');
    git('add', '.');
    git('commit', '--quiet', '-m', 'article');
    const head = git('rev-parse', 'HEAD');
    const event = join(dir, '.git/event.json'),
      output = join(dir, '.git/output');
    const classify = (base, sha, pr = false) => {
      writeFileSync(
        event,
        JSON.stringify(
          pr
            ? { pull_request: { base: { sha: base }, head: { sha } } }
            : { before: base },
        ),
      );
      writeFileSync(output, '');
      execFileSync(process.execPath, [fileURLToPath(script), 'changes'], {
        cwd: dir,
        env: {
          ...process.env,
          GITHUB_EVENT_NAME: pr ? 'pull_request' : 'push',
          GITHUB_SHA: sha,
          GITHUB_EVENT_PATH: event,
          GITHUB_OUTPUT: output,
        },
      });
      return readFileSync(output, 'utf8').trim();
    };
    assert.equal(classify(before, head), 'article_only=true');
    assert.equal(classify(before, head, true), 'article_only=true');
    const stub = join(dir, '.git/api-stub.mjs');
    writeFileSync(
      stub,
      `
      globalThis.fetch = async url => {
        const path = new URL(url).pathname;
        let value;
        if (path.endsWith('/deployments')) value = [{ id: 1, sha: process.env.TEST_PUBLISHED_SHA, environment: 'production-cutover' }];
        else if (path.endsWith('/statuses')) value = [{ state: 'success', environment_url: 'https://happinesea.com/', created_at: '2026-10-21T00:00:00Z', log_url: 'https://github.com/test/site/actions/runs/1/job/2' }];
        else if (path.endsWith('/actions/jobs/2')) value = { name: 'deploy', conclusion: 'success', head_sha: process.env.TEST_PUBLISHED_SHA, run_id: 1 };
        else if (path.endsWith('/actions/runs/1')) value = { path: '.github/workflows/deploy.yml', head_branch: 'main', head_sha: process.env.TEST_PUBLISHED_SHA, event: 'push' };
        else if (path.endsWith('/pages')) value = { cname: 'happinesea.com', build_type: 'workflow' };
        else if (path.endsWith('/environments/production-cutover')) value = { protection_rules: [{ type: 'required_reviewers', reviewers: [{}] }] };
        else throw new Error('Unexpected API call: ' + url);
        return new Response(JSON.stringify(value), { status: 200 });
      };
    `,
    );
    const preflight = (sha, command = 'select') => {
      writeFileSync(output, '');
      execFileSync(
        process.execPath,
        ['--import', pathToFileURL(stub).href, fileURLToPath(script), command],
        {
          cwd: dir,
          env: {
            ...process.env,
            GITHUB_EVENT_NAME: 'push',
            GITHUB_REF: 'refs/heads/main',
            GITHUB_SHA: sha,
            ARTICLE_ONLY: 'true',
            INPUT_PUBLICATION_MODE: '',
            GITHUB_OUTPUT: output,
            GH_TOKEN: 'test-only',
            GITHUB_REPOSITORY: 'test/site',
            TEST_PUBLISHED_SHA: before,
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      return readFileSync(output, 'utf8');
    };
    assert.match(preflight(head), /article_only=true\nmode=production/);
    assert.doesNotThrow(() => preflight(head, 'guard'));
    const savedCwd = process.cwd();
    try {
      process.chdir(dir);
      assert.equal(unchangedPublicationCode(before, head), true);
      assert.equal(unchangedPublicationCode(head, head), true);
    } finally {
      process.chdir(savedCwd);
    }
    git('mv', 'src/content/articles/a.md', 'model.md');
    git('commit', '--quiet', '-am', 'move out');
    assert.match(
      preflight(git('rev-parse', 'HEAD')),
      /article_only=false\nmode=production/,
    );
    assert.throws(
      () => preflight(git('rev-parse', 'HEAD'), 'guard'),
      /Unpublished code changes/,
    );
    try {
      process.chdir(dir);
      assert.equal(
        unchangedPublicationCode(before, git('rev-parse', 'HEAD')),
        false,
      );
      assert.equal(unchangedPublicationCode(undefined, head), false);
    } finally {
      process.chdir(savedCwd);
    }
    assert.equal(
      classify(head, git('rev-parse', 'HEAD')),
      'article_only=false',
    );
    assert.equal(classify('0'.repeat(40), head), 'article_only=false');
    assert.equal(classify('f'.repeat(40), head), 'article_only=false');
    git('rm', 'model.md');
    git('commit', '--quiet', '-m', 'remove');
    writeFileSync(join(dir, 'src/content/articles/deleted.md'), 'draft');
    git('add', '.');
    git('commit', '--quiet', '-m', 'draft');
    const deletionBase = git('rev-parse', 'HEAD');
    git('rm', 'src/content/articles/deleted.md');
    git('commit', '--quiet', '-m', 'delete draft');
    assert.equal(
      classify(deletionBase, git('rev-parse', 'HEAD')),
      'article_only=true',
    );
  } finally {
    assert.ok(dir.startsWith(join(tmpdir(), 'article-changes-')));
    rmSync(dir, { recursive: true, force: true });
  }
});

test('published baseline excludes approval jobs, staging, failed and inactive deployments', async () => {
  const deployments = [
    { id: 1, sha: 'a'.repeat(40), environment: 'production-cutover' },
    { id: 2, sha: 'b'.repeat(40), environment: 'github-pages' },
    { id: 3, sha: 'c'.repeat(40), environment: 'production-cutover' },
    { id: 4, sha: 'd'.repeat(40), environment: 'production-cutover' },
  ];
  const statuses = {
    1: [
      {
        state: 'success',
        environment_url: '',
        created_at: '2026-10-21T12:00:00Z',
      },
    ],
    2: [
      {
        state: 'success',
        environment_url: 'https://happinesea.github.io/happinesea-site/',
        created_at: '2026-10-21T12:00:00Z',
      },
    ],
    3: [
      {
        state: 'success',
        environment_url: 'https://happinesea.com/',
        created_at: '2026-10-20T12:00:00Z',
      },
    ],
    4: [
      {
        state: 'inactive',
        environment_url: 'https://happinesea.com/',
        created_at: '2026-10-21T12:00:00Z',
      },
      { state: 'success', environment_url: 'https://happinesea.com/' },
    ],
  };
  for (const list of Object.values(statuses))
    for (const status of list)
      status.log_url = 'https://github.com/test/site/actions/runs/1/job/2';
  let published = 'c'.repeat(40),
    jobName = 'deploy';
  const api = async (path) => {
    if (path === 'actions/jobs/2')
      return {
        name: jobName,
        conclusion: 'success',
        head_sha: published,
        run_id: 1,
      };
    if (path === 'actions/runs/1')
      return {
        path: '.github/workflows/deploy.yml',
        head_branch: 'main',
        head_sha: published,
        event: 'push',
      };
    return path.startsWith('deployments?')
      ? deployments
      : statuses[path.split('/')[1]];
  };
  assert.equal(await publishedProductionSha(api), 'c'.repeat(40));
  statuses[3][0].state = 'failure';
  assert.equal(await publishedProductionSha(api), undefined);
  statuses[2][0].environment_url = 'https://happinesea.com/';
  published = 'b'.repeat(40);
  assert.equal(await publishedProductionSha(api), 'b'.repeat(40));
  jobName = 'approve-production';
  assert.equal(await publishedProductionSha(api), undefined);
});

const workflow = (file) =>
  parse(
    readFileSync(
      new URL(`../../.github/workflows/${file}`, import.meta.url),
      'utf8',
    ),
  );

test('one serialized Pages deploy follows a successful verified build; article pushes skip browsers', () => {
  const deploy = workflow('deploy.yml');
  assert.deepEqual(deploy.on.push.branches, ['main']);
  assert.equal(
    deploy.on.push.paths,
    undefined,
    'do not omit deploy-worthy changes with an event path filter',
  );
  assert.equal(deploy.concurrency.group, 'pages');
  assert.equal(deploy.concurrency['cancel-in-progress'], false);
  const jobs = deploy.jobs;
  assert.match(jobs['approve-production'].if, /article_only.*!=.*true/);
  assert.equal(jobs['approve-production'].environment, 'production-cutover');
  assert.ok(jobs.deploy.needs.includes('build'));
  assert.equal(
    jobs.deploy.if,
    undefined,
    'failed build must keep default success dependency',
  );
  assert.match(jobs.deploy.environment.name, /article_only/);
  assert.match(jobs['browser-check'].if, /article_only.*!=.*true/);
  assert.equal(
    Object.values(jobs)
      .flatMap((j) => j.steps ?? [])
      .filter((s) => s.uses?.startsWith('actions/deploy-pages@')).length,
    1,
  );
  const build = jobs.build.steps;
  assert.equal(build.filter((s) => s.run === 'npm run build').length, 1);
  const upload = build.findIndex((s) =>
    s.uses?.startsWith('actions/upload-pages-artifact@'),
  );
  assert.ok(
    build.findIndex((s) => s.run?.includes('verify-publication-origin.mjs')) <
      upload,
  );
  assert.match(
    build.find(
      (s) => s.name === 'Verify publication state and Google service gates',
    ).run,
    /CMS publication state/,
  );
  for (const s of build) assert.notEqual(s['continue-on-error'], true);
});

test('article PRs reuse the existing build while development PRs retain full validation', () => {
  const verify = workflow('cms-endpoint-check.yml').jobs.verify.steps;
  assert.ok(
    verify.some((s) => s.run?.includes('publication-deployment.mjs changes')),
  );
  assert.match(
    verify.find((s) => s.run === 'npm run validate').if,
    /article_only.*!=.*true/,
  );
  const light = verify.find(
    (s) => s.name === 'Build and verify article-only publication',
  );
  assert.match(light.if, /article_only.*==.*true/);
  assert.equal(light.env.PUBLICATION_MODE, 'production');
  assert.match(light.run, /npm run build/);
  assert.match(light.run, /CMS publication state/);
  assert.doesNotMatch(light.run, /npm run test(?:\s|$)|playwright|lighthouse/);
});
