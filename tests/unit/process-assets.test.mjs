import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const animatedGif = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUQAOw==',
  'base64',
);

test('asset processor preserves GIF source bytes without re-encoding', async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), 'happinesea-assets-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const server = createServer((_, response) => {
    response.writeHead(200, { 'content-type': 'image/gif' });
    response.end(animatedGif);
  });
  await new Promise((resolveListen) =>
    server.listen(0, '127.0.0.1', resolveListen),
  );
  t.after(() => server.close());

  const { port } = server.address();
  const manifest = {
    product_id: 'fixture',
    assets: [
      {
        id: 'animated-gif',
        source_image_url: `http://127.0.0.1:${port}/source.gif`,
        public_path: '/assets/animated',
      },
    ],
  };
  await writeFile(join(workspace, 'manifest.json'), JSON.stringify(manifest));

  const script = resolve('scripts/process-assets.mjs');
  const result = await new Promise((resolveRun) => {
    const child = spawn(process.execPath, [script, 'manifest.json'], {
      cwd: workspace,
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', (code) => resolveRun({ code, stderr }));
  });

  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(
    await readFile(join(workspace, 'public/assets/animated.gif')),
    animatedGif,
  );
  const report = JSON.parse(
    await readFile(
      join(workspace, 'src/data/publication-assets/fixture.processed.json'),
      'utf8',
    ),
  );
  assert.equal(report.results[0].gif, '/assets/animated.gif');
  assert.equal(report.results[0].webp, undefined);
  assert.equal(report.results[0].avif, undefined);
});
