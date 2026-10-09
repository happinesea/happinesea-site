import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const publicationMode = process.env.PUBLICATION_MODE || 'staging';
if (!['staging', 'production'].includes(publicationMode))
  throw new TypeError(`Unknown PUBLICATION_MODE: ${publicationMode}`);
const production = publicationMode === 'production';

export default defineConfig({
  site: production ? 'https://happinesea.com' : 'https://happinesea.github.io',
  base: production ? '/' : '/happinesea-site',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap(),
    starlight({
      title: 'happinesea hobby マニュアル',
      disable404Route: true,
      locales: {
        root: { label: '日本語', lang: 'ja' },
      },
      sidebar: [
        {
          label: 'RC8X',
          items: [
            { label: 'はじめに', slug: 'manuals/rc8x' },
            {
              label: '第1章 リモートコントロールシステム',
              slug: 'manuals/rc8x/chapter-01',
            },
            { label: '第2章 基本機能', slug: 'manuals/rc8x/chapter-02' },
          ],
        },
      ],
      customCss: ['./src/styles/global.css', './src/styles/starlight.css'],
      components: {
        Head: './src/components/manuals/Head.astro',
        SiteTitle: './src/components/manuals/SiteTitle.astro',
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
