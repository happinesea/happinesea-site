import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import * as wp from '../../scripts/lib/wordpress-publication.mjs';
import { readFileSync } from 'node:fs';

test('plain-text metadata decodes HTML entities once without retaining active markup', () => {
  assert.equal(
    wp.metadataText(
      '<p>RC8X &amp; DJI &#x65e5; &lt;test&gt;</p><script>bad()</script>',
    ),
    'RC8X & DJI 日 <test>',
  );
  assert.equal(wp.metadataText('<p>&amp;amp;</p>'), '&amp;');
});

test('reviewed transformations require unchanged source bytes and unique literal matches', () => {
  const source =
    '<p><a href="_wp_link_placeholder">https://example.org/item</a></p>';
  const review = {
    source_content_sha256: createHash('sha256').update(source).digest('hex'),
    replacements: [
      {
        from: 'href="_wp_link_placeholder"',
        to: 'href="https://example.org/item"',
      },
    ],
  };
  assert.equal(
    typeof wp.reviewedArticleHtml,
    'function',
    'reviewed transformer is missing',
  );
  assert.equal(
    wp.reviewedArticleHtml(source, review),
    '<p><a href="https://example.org/item">https://example.org/item</a></p>',
  );
  assert.throws(
    () => wp.reviewedArticleHtml(source + ' ', review),
    /source review drift/,
  );
  assert.throws(
    () =>
      wp.reviewedArticleHtml(source, {
        ...review,
        replacements: [{ from: '<absent>', to: '' }],
      }),
    /replacement drift/,
  );
  assert.throws(
    () =>
      wp.reviewedArticleHtml(source, {
        ...review,
        replacements: [{ from: '<', to: '' }],
      }),
    /replacement drift/,
  );
  assert.throws(
    () =>
      wp.sanitizeArticleHtml(
        wp.reviewedArticleHtml(source, {
          ...review,
          replacements: [{ from: source, to: '<script>bad()</script>' }],
        }),
      ),
    /forbidden HTML/,
  );
});

test('source exponent markup and meaningful anchors survive sanitization without permitting active markup', () => {
  const html = wp.sanitizeArticleHtml(
    '<p id="equation">x<sup>2</sup> + a<sub>1</sub></p>',
    new Map(),
    { preserveAnchors: true },
  );
  assert.equal(html, '<p id="equation">x<sup>2</sup> + a<sub>1</sub></p>');
  assert.throws(
    () => wp.sanitizeArticleHtml('<script>alert(1)</script>'),
    /forbidden HTML/,
  );
  assert.throws(
    () => wp.sanitizeArticleHtml('<p><img alt=""/></p>'),
    /image source missing/,
  );
});

test('a reviewed live-page featured recovery rejects media identity drift and restored REST metadata', () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL(
        '../fixtures/wordpress-phase6-review-batch4.json',
        import.meta.url,
      ),
    ),
  );
  const post = globalThis.structuredClone(fixture.articles[0].source_record);
  post.featured_media = 2038;
  post._embedded['wp:featuredmedia'] = [{ code: 'rest_not_found' }];
  const mapping = {
    id: post.id,
    content_type: 'insight',
    slug: post.slug,
    route: `/insights/${post.slug}/`,
    canonical: post.link,
    featured_image_review: fixture.articles[0].featured_image_review,
    content_review: {
      source_content_sha256: fixture.articles[0].source_content_sha256,
    },
    featured_image_recovery: {
      media_id: post.featured_media,
      source_url: fixture.articles[0].source_featured_image,
      width: 629,
      height: 914,
    },
  };
  assert.equal(
    wp.normalizePost(post, mapping).contract.featured_image.url,
    mapping.featured_image_recovery.source_url,
  );
  assert.throws(
    () => wp.normalizePost({ ...post, featured_media: -1 }, mapping),
    /featured recovery drift/,
  );
  const restored = globalThis.structuredClone(post);
  restored._embedded['wp:featuredmedia'] =
    fixture.articles[0].source_record._embedded['wp:featuredmedia'];
  assert.throws(
    () => wp.normalizePost(restored, mapping),
    /featured recovery drift/,
  );
});

test('final inventory decisions fail closed on source drift or an approval that still fails preflight', () => {
  const post = {
    id: 905,
    slug: 'old-manual',
    link: 'https://happinesea.com/old.html',
    content: { rendered: '<p>old</p>' },
  };
  const decision = {
    id: 905,
    slug: post.slug,
    source_url: post.link,
    source_content_sha256: createHash('sha256')
      .update(post.content.rendered)
      .digest('hex'),
    decision: 'BLOCKED_WITH_EXPLICIT_REASON',
    reason: 'Source relocation URL is HTTP 404.',
  };
  assert.equal(typeof wp.resolveInventoryDecision, 'function');
  assert.equal(
    wp.resolveInventoryDecision(
      post,
      { status: 'NEEDS_REVIEW', reasons: [] },
      decision,
    ).status,
    'BLOCKED',
  );
  assert.throws(
    () =>
      wp.resolveInventoryDecision(
        { ...post, slug: 'changed' },
        { status: 'READY', reasons: [] },
        decision,
      ),
    /decision drift/,
  );
  assert.throws(
    () =>
      wp.resolveInventoryDecision(
        post,
        { status: 'BLOCKED', reasons: ['unsafe iframe'] },
        { ...decision, decision: 'READY_AND_MIGRATE' },
      ),
    /preflight not ready/,
  );
});

test('only the declared Download Manager refresh token is volatile, never the download id or article text', () => {
  const source =
    '<p>Manual</p><a href="#" data-downloadurl="https://happinesea.com/download/manual?wpdmdl=2032&refresh=abc123">Download</a>';
  const stable =
    '<p>Manual</p><a href="#" data-downloadurl="https://happinesea.com/download/manual?wpdmdl=2032&refresh=WPDM_REFRESH">Download</a>';
  const review = {
    source_content_sha256: createHash('sha256').update(source).digest('hex'),
    stable_content_sha256: createHash('sha256').update(stable).digest('hex'),
    replacements: [
      {
        from: source.match(/<a[^>]+>/)[0],
        to: '<a href="/downloads/verified.pdf">',
      },
    ],
  };
  assert.equal(
    wp.reviewedArticleHtml(source.replace('abc123', 'def456'), review),
    '<p>Manual</p><a href="/downloads/verified.pdf">Download</a>',
  );
  assert.throws(
    () => wp.reviewedArticleHtml(source.replace('2032', '2033'), review),
    /source review drift/,
  );
  assert.throws(
    () => wp.reviewedArticleHtml(source.replace('Manual', 'Other'), review),
    /source review drift/,
  );
});

test('reviewed render-context metadata varies without allowing changes to source content or gallery images', () => {
  const source =
    '<p><div class=\'w3eden\'><p>Manual</p>\n</div></p><figure class="wp-block-gallery-1"><img src="https://example.org/one.png" alt="one" /></figure>';
  const review = {
    source_content_sha256: createHash('sha256').update(source).digest('hex'),
    stable_content_sha256: createHash('sha256')
      .update(wp.stableReviewedHtml(source))
      .digest('hex'),
  };
  const variant = source
    .replace("<p><div class='w3eden'>", "<div class='w3eden'>")
    .replace('\n</div></p>', '\n</div>')
    .replace('wp-block-gallery-1', 'wp-block-gallery-3');
  assert.equal(
    wp.reviewedArticleHtml(source, review),
    wp.reviewedArticleHtml(variant, review),
  );
  assert.throws(
    () => wp.reviewedArticleHtml(variant.replace('one.png', 'two.png'), review),
    /source review drift/,
  );
  assert.throws(
    () => wp.reviewedArticleHtml(variant.replace('Manual', 'Other'), review),
    /source review drift/,
  );
  assert.throws(
    () =>
      wp.reviewedArticleHtml(
        variant.replace('one.png', 'wp-block-gallery-3.png'),
        review,
      ),
    /source review drift/,
  );
  assert.equal(
    wp.stableReviewedHtml('<p>wp-block-gallery-3</p>'),
    '<p>wp-block-gallery-3</p>',
  );
});
