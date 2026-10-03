import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { format } from 'prettier';
import sharp from 'sharp';

import {
  assertCollection,
  assertManifestContinuity,
  fetchImage,
  fetchPublishedPosts,
  htmlText,
  normalizePost,
  validateContracts,
} from './lib/wordpress-publication.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = join(root, 'src/data/wordpress-insights.json');
const reportPath = join(root, 'src/data/wordpress-publication-validation.json');
const manifest = JSON.parse(
  await readFile(
    join(root, 'src/data/wordpress-insight-manifest.json'),
    'utf8',
  ),
);
const schema = JSON.parse(
  await readFile(
    join(root, 'src/data/contracts/publication-content-v0.1.schema.json'),
    'utf8',
  ),
);
const assetDir = join(root, 'public/assets/insights/wordpress');
const sourceEndpoint =
  process.env.WORDPRESS_API_URL ?? manifest.source_endpoint;

async function downloadImage(article) {
  const image = article.contract.featured_image;
  if (!image) return null;
  const { contentType, bytes: source } = await fetchImage(image.url);
  const metadata = await sharp(source, { animated: true }).metadata();
  if (!metadata.width || !metadata.height)
    throw new Error(`image decode failed: ${image.url}`);

  const digest = createHash('sha256').update(source).digest('hex');
  const isGif = contentType === 'image/gif';
  const extension = isGif ? 'gif' : 'webp';
  const filename = `${article.contract.id}-${digest.slice(0, 12)}.${extension}`;
  const bytes = isGif
    ? source
    : await sharp(source).webp({ quality: 90 }).toBuffer();
  await writeFile(join(assetDir, filename), bytes);
  return {
    src: `/assets/insights/wordpress/${filename}`,
    alt: article.contract.featured_image_alt,
    width: metadata.width,
    height: metadata.height,
    sha256: digest,
    source_url: image.url,
  };
}

async function writeJson(path, value) {
  const output = await format(JSON.stringify(value), { parser: 'json' });
  let current = '';
  try {
    current = await readFile(path, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (current !== output) await writeFile(path, output);
}

const withdrawnIds = new Set(manifest.withdrawals.map(({ id }) => id));
const activeMappings = manifest.articles.filter(
  ({ id }) => !withdrawnIds.has(id),
);
const ids = activeMappings.map(({ id }) => id);
if (
  manifest.expected_count !== ids.length ||
  new Set(ids).size !== ids.length
) {
  throw new Error('manifest expected_count or article ids are inconsistent');
}

const posts = await fetchPublishedPosts(sourceEndpoint, ids);
const postById = new Map(posts.map((post) => [post.id, post]));
const articles = activeMappings.map((mapping) =>
  normalizePost(postById.get(mapping.id), mapping),
);
assertCollection(articles);
assertManifestContinuity(articles, manifest.articles, manifest.withdrawals);
validateContracts(articles, schema);

for (const article of articles) {
  if (
    /\bsrc=["']https?:\/\//i.test(
      article.contract.content.replaceAll(/<iframe\b[\s\S]*?<\/iframe>/gi, ''),
    )
  ) {
    throw new Error(
      `remote inline asset requires migration review: ${article.contract.id}`,
    );
  }
}

await mkdir(assetDir, { recursive: true });
for (const name of await readdir(assetDir)) {
  if (/^\d+-[a-f0-9]{12}\.(?:gif|webp)$/.test(name))
    await unlink(join(assetDir, name));
}

const output = [];
for (const article of articles) {
  const hero = await downloadImage(article);
  output.push({
    id: `wordpress-${article.contract.id}`,
    ...article,
    slug: article.contract.slug,
    title: article.contract.title,
    description: htmlText(article.contract.excerpt),
    published_at: article.contract.published_at,
    updated_at: article.contract.modified_at,
    content_status: 'published',
    content_html: article.contract.content,
    canonical: article.contract.canonical,
    noindex: article.contract.noindex,
    hero: hero ? { ...hero, image_status: 'verified' } : null,
  });
}

await writeJson(dataPath, output);
await writeJson(reportPath, {
  contract_version: manifest.contract_version,
  source_endpoint: manifest.source_endpoint,
  expected_count: manifest.expected_count,
  received_count: output.length,
  article_ids: output.map(({ contract }) => contract.id),
  canonicals: output.map(({ contract }) => contract.canonical),
  routes: output.map(({ route }) => route),
  assets: output.map(({ contract, hero }) => ({
    id: contract.id,
    path: hero ? `public${hero.src}` : null,
    sha256: hero?.sha256 ?? null,
  })),
  validation: {
    schema: 'publication-content-v0.1.schema.json',
    status: 'passed',
    html_policy: 'allowlist-with-youtube-only-iframes',
    remote_runtime_dependency: false,
  },
});

console.log(
  `Validated and generated ${output.length} WordPress insight articles.`,
);
