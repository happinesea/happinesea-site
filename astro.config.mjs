import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { sitemapSerializer } from './scripts/lib/sitemap.mjs';
import { fileURLToPath } from 'node:url';
import existingJapaneseManuals from './src/data/manuals/existing-ja.json' with { type: 'json' };
import { verifyExistingJapaneseManuals } from './scripts/lib/existing-ja-manuals.mjs';

verifyExistingJapaneseManuals(existingJapaneseManuals, new URL('./public/', import.meta.url));

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
    sitemap({
      // Aliases are finalized after Astro; the post-build gate verifies canonical targets.
      serialize: sitemapSerializer(
        fileURLToPath(new URL('./dist/', import.meta.url)),
        production ? 'https://happinesea.com/' : 'https://happinesea.github.io/happinesea-site/',
      ),
    }),
    starlight({
      title: 'happinesea hobby マニュアル',
      disable404Route: true,
      locales: {
        root: { label: '日本語', lang: 'ja' },
      },
      sidebar: [
        ...existingJapaneseManuals.manuals.filter((manual) => manual.publication_status === 'publication_copy').map((manual) => ({
          label: manual.title,
          items: [{ label: 'はじめに・本文', slug: manual.route.slice(1, -1) }],
          collapsed: true,
        })),
        {
          label: 'RC4GS V2',
          items: [
            { label: 'はじめに・目次', slug: 'manuals/rc4gs-v2' },
            { label: '第1章 送信機と受信機', slug: 'manuals/rc4gs-v2/chapter-01' },
            { label: '第2章 機能', slug: 'manuals/rc4gs-v2/chapter-02' },
          ],
        },
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
