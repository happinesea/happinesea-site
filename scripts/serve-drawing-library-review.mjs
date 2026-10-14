import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { lstat, open, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadInputs, verifyExistingAssets } from './lib/drawing-library.mjs';
import {
  allowedReviewHost,
  reviewRequestPath,
  loadReviewModel,
  renderReview,
} from './lib/drawing-library-review.mjs';
import { reanalysis } from '../src/lib/drawing-publication.mjs';
import {
  verifyCurrentSource,
  currentSourcePath,
} from './lib/drawing-rar-source.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
let source,
  port = 4380;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--source' && args[i + 1]) source = resolve(args[++i]);
  else if (args[i] === '--port' && args[i + 1]) port = Number(args[++i]);
  else throw new Error('usage: --source <directory> [--port <loopback-port>]');
}
if (!source || !Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('invalid review source/port');
const input = await loadInputs(repo);
await verifyCurrentSource(source, input.inventory);
await verifyExistingAssets(repo, input);
const model = await loadReviewModel(repo);
const files = new Map(model.files.map((f) => [f.id, f]));
const physicalSource = await realpath(source);
const cache = join(repo, '.superpowers/drawing-library-review-cache');
const derivedRoot = await realpath(join(repo, '.superpowers/drawing-rar-work'));
const derivedBoundary = await realpath(join(repo, '.superpowers'));
const derivedWithin = relative(derivedBoundary, derivedRoot);
if (
  !derivedWithin ||
  derivedWithin.startsWith('..') ||
  isAbsolute(derivedWithin) ||
  (await lstat(join(repo, '.superpowers/drawing-rar-work'))).isSymbolicLink()
)
  throw Error('Derived work directory escape/link');
let previews = {};
try {
  previews = JSON.parse(await readFile(join(cache, 'previews.json'), 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const html = renderReview(model);
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect width="640" height="400" fill="#e9eff0"/><path d="M278 90h60l34 34v115h-94z" fill="white" stroke="#9cb1b8" stroke-width="3"/><path d="M338 90v34h34" fill="none" stroke="#9cb1b8" stroke-width="3"/><text x="320" y="286" text-anchor="middle" font-size="23" fill="#47646e" font-family="sans-serif">プレビュー未確認</text><text x="320" y="326" text-anchor="middle" font-size="16" fill="#6a828b" font-family="sans-serif">元資料・名称・関連情報を確認してください</text></svg>';
const send = (response, status, type, body) => {
  response.writeHead(status, { 'content-type': type });
  response.end(body);
};
const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'",
  );
  if (
    !allowedReviewHost(request.headers.host, port) ||
    (request.headers.origin &&
      request.headers.origin !== `http://127.0.0.1:${port}`)
  )
    return send(response, 403, 'text/plain', 'Loopback owner review only');
  if (!['GET', 'HEAD'].includes(request.method))
    return send(response, 405, 'text/plain', 'Read-only review');
  const path = reviewRequestPath(request.url);
  if (path === null)
    return send(response, 400, 'text/plain', 'Invalid request target');
  try {
    if (path === '/drawing-library-review/' || path === '/')
      return send(
        response,
        200,
        'text/html; charset=utf-8',
        request.method === 'HEAD' ? '' : html,
      );
    if (path === '/review.css' || path === '/review.js')
      return send(
        response,
        200,
        path.endsWith('.css') ? 'text/css' : 'text/javascript',
        await readFile(join(repo, 'scripts/drawing-review', path.slice(1))),
      );
    const match = path.match(
      /^\/(preview|source|derived)\/(download-[a-f0-9]{64}|download-existing-[a-f0-9]{64})$/,
    );
    const file = match ? files.get(match[2]) : null;
    if (!file)
      return send(response, 404, 'text/plain', 'Unknown review resource');
    if (match[1] === 'derived') {
      const derived = file.derived;
      if (!derived || !/^[a-f0-9]{64}\.zip$/.test(derived.derived_zip_path))
        return send(response, 404, 'text/plain', 'No derived distribution');
      const resource = join(derivedRoot, derived.derived_zip_path);
      const info = await lstat(resource);
      const body = await readFile(resource);
      if (
        info.isSymbolicLink() ||
        info.nlink > 1 ||
        body.length !== derived.bytes ||
        createHash('sha256').update(body).digest('hex') !== derived.sha256
      )
        return send(response, 409, 'text/plain', 'Derived ZIP drift');
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${derived.target_url.split('/').at(-1)}"`,
      );
      return send(
        response,
        200,
        'application/zip',
        request.method === 'HEAD' ? '' : body,
      );
    }
    if (match[1] === 'source') {
      if (!file.source_path)
        return send(response, 404, 'text/plain', 'Use existing public page');
      const sourcePath = await currentSourcePath(physicalSource, {
        relative_path: file.source_path,
        sha256: file.sha256,
      });
      const path = join(physicalSource, sourcePath);
      const within = relative(physicalSource, await realpath(path));
      if (
        within.startsWith('..' + sep) ||
        isAbsolute(within) ||
        (await lstat(path)).isSymbolicLink()
      )
        return send(response, 409, 'text/plain', 'Source path changed');
      const handle = await open(path, 'r');
      let body;
      try {
        const before = await handle.stat();
        if (before.size !== file.bytes)
          return send(response, 409, 'text/plain', 'Source size changed');
        body = await handle.readFile();
        const after = await handle.stat();
        if (
          body.length !== file.bytes ||
          before.mtimeMs !== after.mtimeMs ||
          createHash('sha256').update(body).digest('hex') !== file.sha256
        )
          return send(response, 409, 'text/plain', 'Source SHA changed');
      } finally {
        await handle.close();
      }
      response.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(file.filename_original)}`,
      );
      response.writeHead(200, {
        'content-type': 'application/octet-stream',
        'content-length': file.bytes,
      });
      if (request.method === 'HEAD') return response.end();
      return response.end(body);
    }
    const record = file.existingRecords[0];
    if (!file.source_path && record?.featured_image)
      return send(
        response,
        200,
        record.featured_image.src.endsWith('.gif')
          ? 'image/gif'
          : record.featured_image.src.endsWith('.png')
            ? 'image/png'
            : 'image/jpeg',
        await readFile(
          join(repo, 'public', record.featured_image.src.slice(1)),
        ),
      );
    const recovered = reanalysis.updates.find(
      (u) => u.record_id === file.rarUpdate?.record_id,
    )?.preview;
    if (
      file.source_path &&
      recovered &&
      /^drawing-[a-z0-9-]+\.png$/.test(recovered.filename)
    ) {
      const resource = join(derivedRoot, recovered.filename);
      const info = await lstat(resource);
      const body = await readFile(resource);
      if (
        info.isSymbolicLink() ||
        info.nlink > 1 ||
        createHash('sha256').update(body).digest('hex') !==
          recovered.thumbnail_sha256
      )
        return send(response, 409, 'text/plain', 'Recovered preview drift');
      return send(
        response,
        200,
        'image/png',
        request.method === 'HEAD' ? '' : body,
      );
    }
    const preview = previews[file.source_path];
    if (
      preview?.status === 'RENDERED' &&
      preview.filename === file.sha256 + '.png'
    )
      return send(
        response,
        200,
        'image/png',
        await readFile(join(cache, preview.filename)),
      );
    return send(response, 200, 'image/svg+xml; charset=utf-8', svg);
  } catch {
    return send(
      response,
      500,
      'text/plain',
      'Review resource unavailable; source was not changed',
    );
  }
});
server.listen(port, '127.0.0.1', () =>
  console.log(
    `Local-only owner review: http://127.0.0.1:${port}/drawing-library-review/`,
  ),
);
