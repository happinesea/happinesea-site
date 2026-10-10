import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { htmlText } from './wordpress-publication.mjs';

export const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex');

export function migratedManualTarget(value, manual) {
  const url = new URL(value, 'https://happinesea.com');
  if (url.origin !== 'https://happinesea.com') return;
  const mapping = manual.mappings.find(
    (item) => item.legacy_path === url.pathname.replace(/\/$/, ''),
  );
  if (!mapping) return;
  const target = new URL(mapping.target, 'https://happinesea.com');
  target.search = url.search;
  // Only an explicitly mapped source anchor may override the section destination.
  target.hash = mapping.anchors?.[url.hash.slice(1)] ?? target.hash;
  return target.pathname + target.search + target.hash;
}

export function manualCanonical(value, manual) {
  const target = migratedManualTarget(value, manual);
  return target ? `https://happinesea.com${target.split(/[?#]/)[0]}` : value;
}

export function verifyRc4gsManual(manual, articles) {
  const ids = new Set();
  const paths = new Set();
  for (const mapping of manual.mappings) {
    assert(!paths.has(mapping.legacy_path), 'duplicate manual source route');
    paths.add(mapping.legacy_path);
  }
  for (const section of manual.sections) {
    assert(!ids.has(section.id), 'duplicate manual section');
    ids.add(section.id);
    const article = articles.find((entry) => entry.contract.id === section.id);
    assert(article, `missing manual source ${section.id}`);
    assert.equal(
      sha256(article.content_html),
      section.source_sha256,
      `source drift ${section.id}`,
    );
    assert.equal(
      sha256(section.content_html),
      section.publication_sha256,
      `publication drift ${section.id}`,
    );
    const text = (value) => htmlText(value);
    assert.deepEqual(
      text(section.content_html).match(/[A-Za-z][A-Za-z0-9_-]*/g),
      text(article.content_html).match(/[A-Za-z][A-Za-z0-9_-]*/g),
      `UI/technical label drift ${section.id}`,
    );
    assert.deepEqual(
      text(section.content_html).match(/[0-9０-９]+(?:[.．][0-9０-９]+)?/g),
      text(article.content_html).match(/[0-9０-９]+(?:[.．][0-9０-９]+)?/g),
      `numeric drift ${section.id}`,
    );
    assert.deepEqual(
      section.content_html.match(/<img\b[^>]*>/g),
      article.content_html.match(/<img\b[^>]*>/g),
      `image/alt/order drift ${section.id}`,
    );
    assert.deepEqual(
      section.content_html.match(/<figcaption>.*?<\/figcaption>/gs),
      article.content_html.match(/<figcaption>.*?<\/figcaption>/gs),
      `caption drift ${section.id}`,
    );
    assert.doesNotMatch(
      section.content_html,
      /<script\b|\son\w+=|javascript:/i,
    );
    assert.doesNotMatch(
      section.content_html,
      /(?:src|href)="https:\/\/cms\.happinesea\.com/,
    );
  }
  return manual;
}
