import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { sitemapSerializer } from './scripts/lib/sitemap.mjs';
import { fileURLToPath } from 'node:url';
import existingJapaneseManuals from './src/data/manuals/existing-ja.json' with { type: 'json' };
import { verifyExistingJapaneseManuals } from './scripts/lib/existing-ja-manuals.mjs';
import { satteri } from '@astrojs/markdown-satteri';
import { semanticHeadingPunctuation } from './scripts/lib/manual-semantic-structure.mjs';
import { manualSidebar } from './scripts/lib/manual-navigation.mjs';

verifyExistingJapaneseManuals(existingJapaneseManuals, new URL('./public/', import.meta.url));

const publicationMode = process.env.PUBLICATION_MODE || 'staging';
if (!['staging', 'production'].includes(publicationMode))
  throw new TypeError(`Unknown PUBLICATION_MODE: ${publicationMode}`);
const production = publicationMode === 'production';
const ownerDrawings = process.env.DRAWING_OWNER_PREVIEW === '1';
if (ownerDrawings && (production || process.env.CI)) throw new Error('Owner drawing preview is local-only');
const buildOutput = new URL(ownerDrawings ? './.superpowers/drawing-publication-build/' : './dist/', import.meta.url);

export default defineConfig({
  outDir: fileURLToPath(buildOutput),
  markdown: {
    processor: satteri({ hastPlugins: [semanticHeadingPunctuation(existingJapaneseManuals.manuals)] }),
  },
  site: production ? 'https://happinesea.com' : 'https://happinesea.github.io',
  base: production ? '/' : '/happinesea-site',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // Aliases are finalized after Astro; the post-build gate verifies canonical targets.
      serialize: sitemapSerializer(
        fileURLToPath(buildOutput),
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
        ...existingJapaneseManuals.manuals.filter((manual) => manual.publication_status === 'publication_copy').map(manualSidebar),
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
            { label: 'はじめに・目次', slug: 'manuals/rc8x' },
            {
              label: '第1章 リモートコントロールシステム',
              slug: 'manuals/rc8x/chapter-01',
            },
            { label: '第2章 基本機能', slug: 'manuals/rc8x/chapter-02' },
            { label: 'サポート・ご購入のお礼', slug: 'manuals/rc8x/back-matter' },
          ],
        },
        {
          label: 'RC8P',
          collapsed: true,
          items: [
            { label: 'はじめに・目次', slug: 'manuals/rc8p' },
            { label: '第1章 送信機とR8FG受信機', slug: 'manuals/rc8p/chapter-01' },
            { label: '第2章 基本機能', slug: 'manuals/rc8p/chapter-02' },
            { label: '第3章 ファームウェア更新', slug: 'manuals/rc8p/chapter-03' },
            { label: '第4章 カスタムスイッチ音声', slug: 'manuals/rc8p/chapter-04' },
            { label: 'サポート・ご購入のお礼', slug: 'manuals/rc8p/back-matter' },
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
