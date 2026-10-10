import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const hash = (value) => createHash('sha256').update(value).digest('hex');

/** @returns {string} */
export function rewriteSafetyBlockedDownloads(html, files, noticeHref) {
  return html.replaceAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/g, (tag, href) => {
    const url = new URL(href, 'https://happinesea.com');
    if (
      url.origin !== 'https://happinesea.com' ||
      !files.some(
        (file) =>
          file.status === 'BLOCKED_SAFETY_REVIEW' &&
          [file.target_route, ...file.legacy_routes].includes(
            decodeURIComponent(url.pathname),
          ),
      )
    )
      return tag;
    return tag
      .replace(/href="[^"]+"/, `href="${noticeHref}"`)
      .replace(/\sdownload(?:="[^"]*")?(?=\s|>)/g, '')
      .replace(
        /^<a\b/,
        '<a data-safety-withheld-download title="操作手順の確認が必要なため配信を停止しています"',
      );
  });
}

export function verifyExistingJapaneseManuals(inventory, publicDirectory) {
  const routes = new Set();
  for (const manual of inventory.manuals) {
    assert(
      !routes.has(manual.route),
      `Duplicate Japanese manual route: ${manual.route}`,
    );
    routes.add(manual.route);
    if (
      manual.blocker ||
      manual.safety_review ||
      [
        'repo-rc4gs-legacy-ja-instruction_manual',
        'repo-rc6gs-v3-ja-instruction_manual',
        'repo-rc6gs-v3-quick-reference-ja-quick_reference',
      ].includes(manual.id)
    ) {
      const review = manual.safety_review;
      const blocked = manual.publication_status === 'BLOCKED_SAFETY_REVIEW';
      assert(
        review &&
          review.decision ===
            (blocked
              ? 'PUBLICATION_BLOCKED_BY_UNRESOLVED_AUTHORITATIVE_EVIDENCE'
              : 'AUTHORITATIVE_EVIDENCE_CLEARED') &&
          review.applicability_established === !blocked &&
          Array.isArray(review.missing_evidence) &&
          (blocked
            ? review.missing_evidence.length > 0
            : review.missing_evidence.length === 0) &&
          Array.isArray(review.authoritative_sources) &&
          review.authoritative_sources.length > 0,
        `Missing applicable authoritative evidence: ${manual.id}`,
      );
      for (const source of review.authoritative_sources)
        assert(
          source.path &&
            /^[a-f0-9]{64}$/.test(source.sha256) &&
            source.physical_pages.length,
          `Invalid authoritative evidence: ${manual.id}`,
        );
      for (const correction of manual.technical_changes) {
        assert(
          correction.before &&
            correction.after &&
            correction.reason &&
            correction.source_locator &&
            correction.evidence?.physical_pages.length &&
            review.authoritative_sources.some(
              (source) =>
                source.path === correction.evidence.path &&
                source.sha256 === correction.evidence.sha256 &&
                correction.evidence.physical_pages.every(
                  (page) =>
                    Number.isInteger(page) &&
                    page > 0 &&
                    source.physical_pages.includes(page),
                ),
            ),
          `Technical correction lacks authoritative evidence: ${manual.id}`,
        );
        if (!blocked && !correction.source_locator.part) {
          const text = manual.sections
            .map((section) => section.content_html)
            .join('\n');
          assert(
            !text.includes(correction.before) &&
              text.includes(correction.after),
            `Unapplied authoritative correction: ${manual.id}`,
          );
        }
      }
    }
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
