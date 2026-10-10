import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const hash = (value) => createHash('sha256').update(value).digest('hex');

export function verifyExistingJapaneseManuals(inventory, publicDirectory) {
  const routes = new Set();
  for (const manual of inventory.manuals) {
    assert(
      !routes.has(manual.route),
      `Duplicate Japanese manual route: ${manual.route}`,
    );
    routes.add(manual.route);
    if (manual.publication_status === 'BLOCKED_SAFETY_REVIEW') {
      assert(
        manual.blocker && !manual.assets.length && !manual.sections.length,
        `Blocked manual has publication content: ${manual.id}`,
      );
      continue;
    }
    assert.equal(
      manual.publication_status,
      'publication_copy',
      `Unknown manual status: ${manual.id}`,
    );
    for (const asset of manual.assets) {
      assert(
        /^\/assets\/radiolink\/[a-z0-9-]+\/manuals\/[a-z0-9-]+\/[a-z0-9.-]+$/.test(
          asset.src,
        ),
        `Unsafe manual asset path: ${asset.src}`,
      );
      const bytes = readFileSync(new URL(asset.src.slice(1), publicDirectory));
      assert.equal(
        hash(bytes),
        asset.sha256,
        `Japanese manual asset hash mismatch: ${asset.src}`,
      );
      assert.equal(
        bytes.length,
        asset.bytes,
        `Japanese manual asset size mismatch: ${asset.src}`,
      );
    }
    for (const section of manual.sections) {
      assert.equal(
        hash(section.content_html),
        section.sha256,
        `Japanese manual text hash mismatch: ${manual.id}/${section.id}`,
      );
      assert(
        !/<script\b|<iframe\b|\son\w+=|javascript:/i.test(section.content_html),
        `Unsafe Japanese manual markup: ${manual.id}`,
      );
      for (const match of section.content_html.matchAll(/src="([^"]+)"/g))
        assert(
          manual.assets.some((asset) => asset.src === match[1]),
          `Unregistered manual image: ${match[1]}`,
        );
    }
  }
}
