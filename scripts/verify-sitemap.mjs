import { verifySitemap } from './lib/sitemap.mjs';

const mode = process.env.PUBLICATION_MODE || 'staging';
if (!['staging', 'production'].includes(mode))
  throw new Error('Invalid PUBLICATION_MODE');
const base =
  mode === 'production'
    ? 'https://happinesea.com/'
    : 'https://happinesea.github.io/happinesea-site/';
console.log(
  'Sitemap/robots verified:',
  await verifySitemap(process.argv[2] ?? 'dist', base),
);
