import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

export const assetHash = (bytes) =>
  createHash('sha256').update(bytes).digest('hex');

export async function assetFiles(result) {
  return Promise.all(
    ['webp', 'avif', 'gif', 'bmp']
      .filter((format) => result[format])
      .map(async (format) => {
        const path = result[format];
        const bytes = await readFile(resolve('public', path.slice(1)));
        return { path, sha256: assetHash(bytes), bytes: bytes.length };
      }),
  );
}

export async function verifyAssets(manifest, report) {
  assert.equal(
    report.product_id,
    manifest.product_id,
    'asset product mismatch',
  );
  assert.equal(
    report.manifest_sha256,
    assetHash(JSON.stringify(manifest)),
    'asset manifest drift: run an explicitly reviewed sync',
  );
  assert(manifest.assets.length > 0, 'empty asset manifest');
  assert.equal(
    report.results.length,
    manifest.assets.length,
    'missing/extra asset records',
  );
  const ids = new Set();
  const paths = new Set();
  let files = 0;
  for (const asset of manifest.assets) {
    assert(!ids.has(asset.id), `duplicate asset id ${asset.id}`);
    ids.add(asset.id);
    assert(
      /^\/assets\/[A-Za-z0-9/_-]+$/.test(asset.public_path),
      `unsafe asset path ${asset.id}`,
    );
    const matches = report.results.filter((row) => row.id === asset.id);
    assert.equal(
      matches.length,
      1,
      `missing/duplicate saved asset ${asset.id}`,
    );
    const row = matches[0];
    assert.equal(
      row.status,
      'processed',
      `required asset not processed ${asset.id}`,
    );
    assert(
      asset.source_image_url && /^[a-f0-9]{64}$/.test(row.sha256),
      `missing source provenance ${asset.id}`,
    );
    const formats = ['webp', 'avif', 'gif', 'bmp'].filter(
      (format) => row[format],
    );
    assert(
      ['webp,avif', 'gif', 'bmp'].includes(formats.join(',')),
      `missing derived formats ${asset.id}`,
    );
    assert.equal(
      row.files?.length,
      formats.length,
      `missing output hashes ${asset.id}`,
    );
    for (const format of formats) {
      const path = `${asset.public_path}.${format}`;
      assert.equal(
        row[format],
        path,
        `manifest output path mismatch ${asset.id}`,
      );
      assert(!paths.has(path), `duplicate asset path ${path}`);
      paths.add(path);
      const hashes = row.files.filter((file) => file.path === path);
      assert.equal(hashes.length, 1, `missing/duplicate output hash ${path}`);
      const file = hashes[0];
      const bytes = await readFile(resolve('public', path.slice(1))).catch(
        (error) => {
          throw new Error(`required saved image unavailable: ${path}`, {
            cause: error,
          });
        },
      );
      assert.equal(
        assetHash(bytes),
        file.sha256,
        `saved image SHA-256 mismatch ${path}`,
      );
      assert.equal(
        bytes.length,
        file.bytes,
        `saved image size mismatch ${path}`,
      );
      if (format === 'gif' || format === 'bmp')
        assert.equal(
          file.sha256,
          row.sha256,
          `source byte identity mismatch ${path}`,
        );
      if (format === 'bmp') {
        assert(
          bytes.length >= 54 && bytes.subarray(0, 2).toString('ascii') === 'BM',
          `invalid BMP ${path}`,
        );
        assert.equal(
          bytes.readUInt32LE(2),
          bytes.length,
          `truncated BMP ${path}`,
        );
        assert.equal(
          Math.abs(bytes.readInt32LE(18)),
          row.width,
          `BMP width mismatch ${path}`,
        );
        assert.equal(
          Math.abs(bytes.readInt32LE(22)),
          row.height,
          `BMP height mismatch ${path}`,
        );
      } else {
        const image = sharp(bytes, { animated: true, failOn: 'warning' });
        const meta = await image.metadata();
        assert.equal(
          meta.format,
          format === 'avif' ? 'heif' : format,
          `image format mismatch ${path}`,
        );
        assert.equal(meta.width, row.width, `image width mismatch ${path}`);
        assert.equal(
          meta.pageHeight ?? meta.height,
          row.height,
          `image height mismatch ${path}`,
        );
        if (format === 'gif')
          assert.equal(meta.pages, row.pages, `GIF frames mismatch ${path}`);
        await image.stats();
      }
      files++;
    }
  }
  return { assets: ids.size, files };
}
