import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://happinesea.github.io',
  base: '/happinesea-site',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap(),
    starlight({
      title: 'happinesea manuals',
      disable404Route: true,
      customCss: ['./src/styles/global.css', './src/styles/starlight.css'],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
