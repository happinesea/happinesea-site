import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import sharp from 'sharp';

const animatedGif = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUQAOw==',
  'base64',
);
const bmpImage = Buffer.alloc(58);
bmpImage.write('BM');
bmpImage.writeUInt32LE(bmpImage.length, 2);
bmpImage.writeUInt32LE(54, 10);
bmpImage.writeUInt32LE(40, 14);
bmpImage.writeInt32LE(1, 18);
bmpImage.writeInt32LE(1, 22);
bmpImage.writeUInt16LE(1, 26);
bmpImage.writeUInt16LE(24, 28);
bmpImage.writeUInt32LE(4, 34);

test('asset processor preserves GIF and BMP source bytes without re-encoding', async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), 'happinesea-assets-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const png = await sharp({
    create: { width: 2, height: 3, channels: 3, background: '#123456' },
  })
    .png()
    .toBuffer();
  let servedGif = animatedGif;
  const server = createServer((request, response) => {
    const bmp = request.url === '/source.bmp';
    response.writeHead(200, {
      'content-type': bmp ? 'image/bmp' : 'image/gif',
    });
    response.end(
      request.url === '/source.png' ? png : bmp ? bmpImage : servedGif,
    );
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
      {
        id: 'buzzer-screen',
        source_image_url: `http://127.0.0.1:${port}/source.bmp`,
        public_path: '/assets/buzzer-screen',
      },
      {
        id: 'photo',
        source_image_url: `http://127.0.0.1:${port}/source.png`,
        public_path: '/assets/photo',
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
  assert.deepEqual(
    await readFile(join(workspace, 'public/assets/buzzer-screen.bmp')),
    bmpImage,
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
  assert.equal(report.results[1].bmp, '/assets/buzzer-screen.bmp');
  assert.equal(report.results[1].width, 1);
  assert.equal(report.results[1].height, 1);

  servedGif = Buffer.from(animatedGif);
  servedGif[13] ^= 1;
  const drift = await new Promise((done) => {
    const child = spawn(process.execPath, [script, 'manifest.json'], {
      cwd: workspace,
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', (code) => done({ code, stderr }));
  });
  assert.notEqual(drift.code, 0);
  assert.match(drift.stderr, /source image drift requires explicit review/);
  assert.deepEqual(
    await readFile(join(workspace, 'public/assets/animated.gif')),
    animatedGif,
  );

  await new Promise((done) => server.close(done));
  await writeFile(
    join(workspace, 'blocked-network.mjs'),
    "globalThis.fetch = () => { throw new Error('NETWORK_BLOCKED'); };\n",
  );
  const verify = async () =>
    new Promise((done) => {
      const child = spawn(
        process.execPath,
        [
          '--import',
          pathToFileURL(join(workspace, 'blocked-network.mjs')).href,
          resolve('scripts/verify-assets.mjs'),
          'manifest.json',
        ],
        { cwd: workspace },
      );
      let stderr = '';
      child.stderr.on('data', (chunk) => (stderr += chunk));
      child.on('close', (code) => done({ code, stderr }));
    });
  const offline = await verify();
  assert.equal(offline.code, 0, offline.stderr);
  const reportPath = join(
    workspace,
    'src/data/publication-assets/fixture.processed.json',
  );
  for (const mutate of [
    (copy) => {
      copy.results.pop();
    },
    (copy) => {
      copy.results[0].status = 'skipped';
    },
    (copy) => {
      copy.results[0].width = 2;
    },
    (copy) => {
      copy.results[2].files.pop();
    },
    (copy) => {
      copy.results[0].gif = '/outside.gif';
    },
  ]) {
    const copy = globalThis.structuredClone(report);
    mutate(copy);
    await writeFile(reportPath, JSON.stringify(copy));
    assert.notEqual(
      (await verify()).code,
      0,
      'invalid saved asset must fail closed',
    );
  }
  await writeFile(reportPath, JSON.stringify(report));
  await writeFile(join(workspace, 'public/assets/photo.webp'), 'corrupt');
  assert.notEqual((await verify()).code, 0, 'corrupt derivative must fail');
  await rm(join(workspace, 'public/assets/animated.gif'));
  assert.notEqual((await verify()).code, 0, 'missing image must fail');
  manifest.assets[0].source_image_url += '?changed';
  await writeFile(join(workspace, 'manifest.json'), JSON.stringify(manifest));
  assert.notEqual((await verify()).code, 0, 'source manifest drift must fail');
});
