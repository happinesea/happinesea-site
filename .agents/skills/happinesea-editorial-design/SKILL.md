---
name: happinesea-editorial-design
description: Audit and improve the Astro presentation of Pages CMS general articles on happinesea.com. Use for article typography, title and lead, media, pagination, and editorial regression review.
---

1. Pin the baseline commit. Read the CMS branch of `src/pages/insights/[slug].astro`, `CmsArticleBody.astro`, and the article renderer before adding styles. Scope styling to CMS content so migrated WordPress articles, other insights, and manuals retain their output.
2. Preview a representative draft by slug using the local procedure in `docs/pages-cms-articles.md`. Capture the opening, body, page controls, final page, images, and article footer at 1440×900, 390×844, and 360×800. Record the DOM or computed style behind each P0 blocker, P1 material reading issue, or P2 polish item.
3. Keep one article H1, preserve distinct editorial leads and body wording, and use the existing slate and teal palette. Check heading order, readable measures, figure captions, keyboard focus, and overflow within genuinely wide tables or code blocks. Avoid general layout changes.
4. Repeat the same captures. Exercise pager URLs, current page, history, direct entry, public unpaginated articles, and draft exclusion. Compare same-mode normal and news sitemap outputs against the pinned baseline, and check canonical and robots.
5. Preserve sources and publication state. Use public examples in publicly accessible review artifacts and keep unpublished captures local. Report exact test commands and distinguish reproduced baseline failures.
