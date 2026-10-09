import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';

test('permanent download inventory publishes verified bytes without losing legacy files', () => {
  const path = 'src/data/static-downloads.json';
  assert.ok(existsSync(path), 'permanent download inventory exists');
  const inventory = JSON.parse(readFileSync(path, 'utf8'));
  const legacy = JSON.parse(
    readFileSync('src/data/legacy-compatibility.json', 'utf8'),
  );
  const receipts = legacy.assets.filter((asset) => asset.kind === 'download');
  assert.equal(inventory.files.length, 18);
  assert.equal(
    new Set(inventory.files.map((file) => file.target_route)).size,
    18,
  );
  for (const receipt of receipts) {
    const file = inventory.files.find((item) => item.sha256 === receipt.sha256);
    assert.ok(file, receipt.target_route);
    assert.ok(file.legacy_routes.includes(receipt.target_route));
    assert.match(
      file.target_route,
      /^\/downloads\/(radiolink|drawings)\/[^/]+\.(pdf|zip|docx)$/,
    );
    for (const route of [file.target_route, receipt.target_route]) {
      assert.equal(
        createHash('sha256')
          .update(readFileSync(`public${route}`))
          .digest('hex'),
        receipt.sha256,
      );
    }
  }
  assert.equal(inventory.unknown.length, 4);
  for (const item of inventory.unknown) {
    assert.equal(item.status, 'OWNER_DECISION_REQUIRED');
    assert.equal(
      existsSync(`public${new URL(item.source_url).pathname}`),
      false,
    );
  }
});
