import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  if (!site)
    throw new TypeError('robots.txt requires Astro site configuration');

  const sitemap = new URL(`${import.meta.env.BASE_URL}sitemap-index.xml`, site);
  const news = new URL(`${import.meta.env.BASE_URL}news-sitemap.xml`, site);
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${sitemap}\nSitemap: ${news}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
