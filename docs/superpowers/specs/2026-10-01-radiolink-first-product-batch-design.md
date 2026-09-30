# Radiolink first product batch design

## Goal

Publish Japanese RC8P and T12D product pages at the standard GitHub Pages project URL, preserving each official product page's section order, emphasis, assets, conditions, and unresolved source conflicts. RC8X remains unchanged as the quality reference.

## Public sources

RC8P source set:

- <https://www.radiolink.com/en/rc8p>
- <https://www.radiolink.com/en/rc8p_specs>
- <https://www.radiolink.com/en/rc8p_certificates>
- <https://www.radiolink.com/en/rc8p_firmware>
- <https://www.radiolink.com/en/rc8p_user_manual>
- <https://www.radiolink.com/en/rc8p_video>
- <https://www.radiolink.com/en/rc8p_faq>

T12D uses the equivalent `/en/t12d*` pages: product, specifications, certificates, firmwares, manual, video, and FAQ.

## Content maps

### RC8P

Hero → compact form → 2.4-inch display → voice → 3 ms response → 600 m range → 8 proportional channels → model/Sub-ID/mix storage → battery/Type-C → simulator/trainer → dual rate → telemetry → R8FG gyro → ergonomics → R8FG IPX4 → colors → compatible receivers → package → specifications → certificates → firmware → tutorials → FAQ.

### T12D

Hero → long-range modules → receiver range table → anti-interference → 12 proportional channels/models → FreeRTOS/LVGL → controls → simulator/trainer → flight-controller telemetry → restore → aircraft presets → languages → programmable mixing → compatible receivers → guided menus → RSSI/FPV → R12F update → power → package/accessories → specifications → certificates → firmware → tutorials → FAQ.

## Design result from official-page audit

Use the existing happinesea shell, typography, teal/slate palette, breadcrumb, CTA hierarchy, responsive media, tables, and base-aware URLs. Within that shell, follow the official pages' product storytelling:

- large official product images lead important features;
- alternate white and light-slate full-width feature bands;
- use compact cards only for short grouped facts;
- keep official image grouping and visible UI text unchanged;
- retain GIF animation and lazy-load non-hero media;
- keep technical source links secondary to the product story;
- use readable tables for dense specifications and range data.

This is not a pixel copy of the Radiolink site and does not adopt Radiolink branding as the site identity.

## Minimal implementation

Keep the existing RC8X route branch intact. Add one reusable `StandardProductPage` component and one public JSON detail file for RC8P/T12D. Add the two catalogue records to the existing `products` collection. Do not build a universal product schema or refactor RC8X.

Official images are fetched through the existing asset manifest/process script and served locally as AVIF/WebP; official GIFs are preserved byte-for-byte. YouTube remains embedded from `youtube-nocookie.com`.

## Translation

Use the official English source meaning first, then Radiolink canonical terms, then natural Japanese. Preserve numbers, units, conditions, model names, UI literals, and warning strength. Do not translate text inside images. Ambiguity and conflicts stay out of asserted body facts and remain in public review notes only where needed.

## OPEN items

- RC8P dimensions differ between specs and manual.
- RC8P specs say simulator firmware V1.7.1, while the firmware page lists V1.0.5 as latest.
- RC8P certificate page is `COMING SOON`.
- RC8P manual adds R12FL to compatibility; product/specs differ.
- T12D product range table names R8F while specifications name R4F; neither disputed model is asserted as compatible.
- T12D firmware page date and ZIP date differ for V2.0.2.
- T12D specifications use `T16D` in one simulator sentence; the product/manual identify T12D.

## Completion boundary

`manufacturer_review` means a technically reviewed preview awaiting manufacturer confirmation. It is not `published` or manufacturer-confirmed. No merge, custom domain, DNS, CNAME, or Actions changes are part of this batch.
