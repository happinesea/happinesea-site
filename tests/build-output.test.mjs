import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { verifySitemap } from '../scripts/lib/sitemap.mjs';
import { manualCanonical } from '../scripts/lib/rc4gs-v2-manual.mjs';
import {
  headingText,
  pageHeading,
} from '../scripts/lib/manual-semantic-structure.mjs';
import {
  manualChapters,
  manualSidebar,
} from '../scripts/lib/manual-navigation.mjs';
const rc4gsManual = JSON.parse(
  await readFile(
    new URL('../src/data/manuals/rc4gs-v2.json', import.meta.url),
    'utf8',
  ),
);

const route = (path) =>
  readFile(new URL(`../dist/${path}`, import.meta.url), 'utf8');
const publicationBase =
  process.env.PUBLICATION_MODE === 'production' ? '' : '/happinesea-site';

test('latest full manuals have complete local figures, tables, videos and resolvable links', async () => {
  const inventory = JSON.parse(
    await readFile(
      new URL('../docs/rc8x-rc8p-publication-inventory.json', import.meta.url),
      'utf8',
    ),
  );
  for (const product of inventory.products) {
    let figures = 0,
      tables = 0,
      videos = 0;
    for (const page of product.pages) {
      const html = await route(`${page.route.slice(1)}index.html`);
      if (page.route === '/manuals/rc8x/chapter-01/') {
        const text = headingText(html);
        for (const value of [
          'L*W*H',
          '121*163*209mm',
          '92*52*14.5mm',
          '35*24*13.5mm',
          '250mA±10mA@8.4V',
          '3.7V*2=7.4V',
        ])
          assert(
            text.includes(value),
            `Missing literal specification: ${value}`,
          );
        assert.doesNotMatch(html, /href="mailto:10mA@8\.4V"/);
      }
      if (page.route === '/manuals/rc8x/chapter-02/')
        for (const value of ['L*1', 'L*4', '3.7V*2S=7.4V', 'HA3.0*12mm'])
          assert(
            headingText(html).includes(value),
            `Missing literal instruction: ${value}`,
          );
      figures += [...html.matchAll(/data-source-figure="([^"]+)"/g)].length;
      tables += (html.match(/<table\b/g) ?? []).length;
      videos += (html.match(/youtube-nocookie\.com\/embed\//g) ?? []).length;
      assert.doesNotMatch(
        html,
        /href="https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//,
      );
      for (const anchor of page.legacy_anchors)
        assert(
          html.includes(`id="${anchor.id}"`),
          `${page.route}#${anchor.id}`,
        );
      const toc =
        html.match(/<starlight-toc[^>]*>([\s\S]*?)<\/starlight-toc>/)?.[1] ??
        '';
      for (const section of product.sections.filter(
        (section) =>
          section.route === page.route &&
          section.section.split('.').length === 4,
      ))
        assert(
          headingText(toc).includes(section.section),
          `${page.route}: missing deep TOC section ${section.section}`,
        );
      for (const [, value] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
        const url = new URL(
          value.replaceAll('&amp;', '&'),
          `https://local.test${publicationBase}${page.route}`,
        );
        if (url.origin !== 'https://local.test') continue;
        let path = decodeURIComponent(
          url.pathname.slice(publicationBase.length),
        ).replace(/^\//, '');
        if (path.endsWith('/')) path += 'index.html';
        await access(new URL(`../dist/${path}`, import.meta.url));
        if (url.hash && path.endsWith('.html')) {
          const target = await route(path);
          const id = decodeURIComponent(url.hash.slice(1));
          assert(
            target.includes(`id="${id}"`),
            `${page.route}: broken ${value}`,
          );
        }
      }
    }
    assert.equal(figures, product.figure_placements);
    assert.equal(tables, product.tables);
    assert.equal(videos, product.videos.length);
  }
});

test('drawing index exposes only six existing files and local owner review is absent from production', async () => {
  const html = await route('drawinglibrary/index.html');
  assert.equal((html.match(/data-drawing-card/g) ?? []).length, 6);
  assert.match(html, /6件を表示/);
  assert.match(html, /data-category-filter="機体の設計図"/);
  assert.match(html, /data-category-filter="エンジン・製作資料"/);
  assert.match(html, /href="https:\/\/happinesea.com\/drawinglibrary"/);
  assert.doesNotMatch(
    html,
    /REVIEW_REQUIRED|source_path|drawing-library-review|OWNER_APPROVED/,
  );
  await assert.rejects(
    access(new URL('../dist/drawing-library-review/', import.meta.url)),
    /ENOENT/,
  );
  const proposed = JSON.parse(
    await readFile(
      new URL(
        '../src/data/drawing-library/records.proposed.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  for (const record of proposed.filter((r) => !r.legacy.canonical_url)) {
    assert.ok(!html.includes(record.title_original));
    await assert.rejects(
      access(
        new URL(`../dist/drawinglibrary/${record.slug}/`, import.meta.url),
      ),
      /ENOENT/,
    );
  }
});

test('RC6GS Full and Quick expose identical reviewed operating values, not receiver revisions', async () => {
  const pages = await Promise.all([
    route('manuals/rc6gs-v3/index.html'),
    route('manuals/rc6gs-v3-quick-reference/index.html'),
  ]);
  const guides = pages.map((html) => {
    assert(!/R7FG\s+V1\.[24]/.test(html));
    const guide = html.match(
      /<section\b[^>]*data-r7fg-operating-guide[^>]*>([\s\S]*?)<\/section>/,
    )?.[1];
    assert(guide, 'reviewed receiver instructions missing');
    return headingText(guide).replace(/\s/g, '');
  });
  assert.equal(
    guides[0],
    guides[1],
    'Full/Quick operating instructions contradict',
  );
  for (const value of [
    '4.6～10V',
    '3～12V',
    '送信機、受信機の順',
    '受信機、送信機の順',
    'テレメトリーポートから受信機に給電してはいけません',
    'CH6はPPM、CH7はSBUS',
    '1秒以内に2回',
    '1秒より長く押して離',
    'LEDの速い点滅',
    '電波を受信できなくなったとき',
  ])
    assert(guides[0].includes(value), `Missing technical value: ${value}`);
  for (const [index, link] of [
    '/manuals/rc6gs-v3-quick-reference/',
    '/manuals/rc6gs-v3/',
  ].entries())
    assert(pages[index].includes(link), 'mutual manual navigation missing');
});

test('all public manual headings and TOCs are semantic, including V2 and RC8X full chapters', async () => {
  const inventory = JSON.parse(
    await readFile(
      new URL('../src/data/manuals/existing-ja.json', import.meta.url),
      'utf8',
    ),
  );
  const paths = (
    await readdir(new URL('../dist/manuals/', import.meta.url), {
      recursive: true,
    })
  ).filter((path) => path.endsWith('.html'));
  assert(
    paths.some((path) =>
      path.replaceAll('\\', '/').includes('rc4gs-v2/chapter-01/'),
    ),
  );
  assert(
    paths.some((path) =>
      path.replaceAll('\\', '/').includes('rc8x/chapter-02/'),
    ),
  );
  for (const path of paths) {
    const html = await route(`manuals/${path.replaceAll('\\', '/')}`);
    for (const heading of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g))
      assert(
        !pageHeading.test(headingText(heading[2])),
        `${path}: page placeholder heading`,
      );
    for (const toc of html.matchAll(
      /<(?:starlight-toc|mobile-starlight-toc)\b[^>]*>([\s\S]*?)<\/(?:starlight-toc|mobile-starlight-toc)>/g,
    ))
      for (const link of toc[1].matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g))
        assert(
          !pageHeading.test(headingText(link[1])),
          `${path}: page placeholder TOC`,
        );
    const manual = inventory.manuals.find(
      (manual) =>
        `manuals${manual.route.slice('/manuals'.length)}index.html` ===
        `manuals/${path.replaceAll('\\', '/')}`,
    );
    if (!manual) continue;
    const chapters = manualChapters(manual);
    const chapterPages = await Promise.all(
      chapters.map((chapter) => route(`${chapter.route.slice(1)}index.html`)),
    );
    const pages = [html, ...chapterPages];
    const all = pages.join('\n');
    for (const page of pages) {
      const ids = [...page.matchAll(/\bid="([^"]+)"/g)].map(
        (match) => match[1],
      );
      assert.equal(
        new Set(ids).size,
        ids.length,
        `${path}: duplicate anchor ID`,
      );
    }
    for (const item of manualSidebar(manual).items) {
      assert(
        html.includes(`${publicationBase}/${item.slug}/`),
        `${path}: missing sidebar link`,
      );
      await route(`${item.slug}/index.html`);
      assert(!pageHeading.test(item.label));
    }
    const baseline = JSON.parse(
      await readFile(
        new URL('fixtures/manual-semantic-baseline.json', import.meta.url),
        'utf8',
      ),
    );
    for (const id of baseline.manuals.find((entry) => entry.id === manual.id)
      .heading_anchors ?? [])
      assert(
        html.includes(`id="${id}"`),
        `${path}: lost published heading anchor ${id}`,
      );
    for (const semantic of manual.semantic_sections.filter(
      (section) => section.title,
    )) {
      assert(
        all.includes(`id="${semantic.id}"`),
        `${path}: missing stable heading anchor`,
      );
      assert(
        [
          ...all.matchAll(
            new RegExp(`<h[1-6]\\b[^>]*>([\\s\\S]*?)<\\/h[1-6]>`, 'g'),
          ),
        ].some(
          (match) =>
            headingText(match[1]).replace(/#+$/, '').trim() === semantic.title,
        ),
        `${path}: missing real semantic heading ${semantic.title}`,
      );
      const sectionPage = pages.find((page) =>
        page.includes(`data-semantic-section="${semantic.id}"`),
      );
      assert(sectionPage, 'semantic body missing');
      if (chapters.some((chapter) => chapter.sections[0].id === semantic.id)) {
        assert.equal(
          [
            ...sectionPage.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/g),
          ].filter(
            (match) =>
              headingText(match[1]).replace(/#+$/, '').trim() ===
              semantic.title,
          ).length,
          1,
          'chapter title is duplicated',
        );
        continue;
      }
      for (const toc of sectionPage.matchAll(
        /<(?:starlight-toc|mobile-starlight-toc)\b[^>]*>([\s\S]*?)<\/(?:starlight-toc|mobile-starlight-toc)>/g,
      ))
        assert(
          [...toc[1].matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].some(
            (link) => headingText(link[1]) === semantic.title,
          ),
          `${path}: semantic TOC entry missing ${semantic.title}`,
        );
    }
    assert.equal(
      [...all.matchAll(/data-manual-figure/g)].length,
      manual.sections.reduce(
        (sum, section) =>
          sum +
          [...section.content_html.matchAll(/data-manual-figure/g)].length,
        0,
      ),
    );
  }
});

test('only evidence-cleared manual routes and corrected assets are generated', async () => {
  const inventory = JSON.parse(
    await readFile(
      new URL('../src/data/manuals/existing-ja.json', import.meta.url),
      'utf8',
    ),
  );
  for (const manual of inventory.manuals) {
    const output = new URL(`../dist${manual.route}index.html`, import.meta.url);
    if (manual.publication_status === 'BLOCKED_SAFETY_REVIEW') {
      await assert.rejects(access(output));
      await assert.rejects(
        access(
          new URL(
            `../dist/assets/radiolink/${manual.product}/manuals/${manual.route.split('/')[2]}/`,
            import.meta.url,
          ),
        ),
      );
    } else {
      await access(output);
    }
  }
  const quick = (
    await Promise.all([
      route('manuals/rc6gs-v3-quick-reference/index.html'),
      ...Array.from({ length: 6 }, (_, index) =>
        route(
          `manuals/rc6gs-v3-quick-reference/chapter-0${index + 1}/index.html`,
        ),
      ),
    ])
  ).join('\n');
  assert.match(quick, /figure-006\.svg/);
  assert.doesNotMatch(
    quick,
    /figure-005\.png|figure-006\.png|2回早打ち→ジャイロON\/OFF/,
  );
  assert.match(quick, /送信機の電源をいったんOFFにし、再びON/);
  assert.match(await route('manuals/rc4gs-v2/index.html'), /RC4GS/);
  assert.match(await route('manuals/rc4gs-v3/index.html'), /RC4GS V3/);
});

test('sitemap lists only self-canonical generated public URLs and excludes deferred/withdrawn articles', async () => {
  const base =
    process.env.PUBLICATION_MODE === 'production'
      ? 'https://happinesea.com/'
      : 'https://happinesea.github.io/happinesea-site/';
  await verifySitemap(
    fileURLToPath(new URL('../dist/', import.meta.url)),
    base,
  );
  const xml = await route('sitemap-0.xml');
  assert.doesNotMatch(
    xml,
    /202107081627\.html|20200511905\.html|cms\.happinesea\.com/,
  );
  if (process.env.PUBLICATION_MODE === 'production') {
    assert.doesNotMatch(xml, /happinesea\.github\.io|\/happinesea-site\//);
    const manifest = JSON.parse(
      await readFile(
        new URL('../src/data/wordpress-insight-manifest.json', import.meta.url),
        'utf8',
      ),
    );
    for (const article of manifest.articles)
      assert(
        xml.includes(
          `<loc>${manualCanonical(article.canonical, rc4gsManual)}</loc>`,
        ),
        article.canonical,
      );
  }
});

test('every public page receives exactly one enabled Google bootstrap, including Starlight and legacy aliases', async () => {
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  const production = process.env.PUBLICATION_MODE === 'production';
  const analytics = production && process.env.ANALYTICS_ENABLED === 'true';
  const adsense = production && process.env.ADSENSE_ENABLED === 'true';
  for (const path of await readdir(dist, { recursive: true })) {
    if (!path.endsWith('.html')) continue;
    const html = await readFile(join(dist, path), 'utf8');
    assert.equal(
      html.split('G-R5SC3Z7WHL').length - 1,
      Number(analytics),
      path,
    );
    assert.equal(
      html.split('ca-pub-9916217226323909').length - 1,
      Number(adsense),
      path,
    );
    assert.equal(
      (html.match(/<script\b[^>]*data-google-publication/g) ?? []).length,
      Number(analytics || adsense),
      path,
    );
    assert.doesNotMatch(
      html,
      /<script\b[^>]*src="https:\/\/(?:www\.googletagmanager|pagead2\.googlesyndication)\.com/,
      path,
    );
    if (!analytics && !adsense)
      assert.doesNotMatch(
        html,
        /googletagmanager|pagead2\.googlesyndication/,
        path,
      );
  }
});

test('CMS endpoint is absent from public HTML and browser JavaScript', async () => {
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  for (const path of await readdir(dist, { recursive: true })) {
    if (!/\.(?:html|js)$/.test(path)) continue;
    assert.doesNotMatch(
      await readFile(join(dist, path), 'utf8'),
      /cms\.happinesea\.com/i,
      path,
    );
  }
});

test('owner-retired 1627 emits no legacy article or invented redirect', async () => {
  await assert.rejects(route('experience/202107081627.html'), {
    code: 'ENOENT',
  });
  const manifest = JSON.parse(
    await readFile(
      new URL('../src/data/wordpress-insight-manifest.json', import.meta.url),
      'utf8',
    ),
  );
  const withdrawal = manifest.withdrawals.find((x) => x.id === 1627);
  assert.ok(withdrawal);
  assert.equal(
    manifest.articles.some((x) => x.id === 1627),
    false,
  );
  assert.doesNotMatch(await route('sitemap-0.xml'), /202107081627\.html/);
  assert.doesNotMatch(await route('404.html'), /rel="canonical"/);
});

test('localized article body images include the Pages base on all article and linked compatibility routes', async () => {
  const articles = JSON.parse(
    await readFile(
      new URL('../src/data/wordpress-insights.json', import.meta.url),
      'utf8',
    ),
  );
  for (const article of articles) {
    if (!article.body_assets.length) continue;
    const paths = [
      `insights/${decodeURIComponent(article.slug)}/index.html`,
      new URL(article.canonical).pathname.slice(1),
    ];
    if ([1075, 1086].includes(article.contract.id))
      paths.push(`news/20200628${article.contract.id}.html`);
    for (const path of paths) {
      const html = await route(path);
      for (const image of article.body_assets)
        assert.ok(
          html.includes(`src="${publicationBase}${image.src}"`),
          `body image base missing: ${path} ${image.src}`,
        );
      assert.doesNotMatch(
        html,
        publicationBase
          ? /src="\/assets\/insights\/wordpress\//
          : /src="\/happinesea-site\/assets\/insights\/wordpress\//,
      );
    }
  }
});

test('home puts articles and hobby resources before Radiolink', async () => {
  const html = await route('index.html');

  const order = [...html.matchAll(/data-home-section="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(order, [
    'latest',
    'news',
    'rc-drone',
    'drawings',
    'glossary',
    'radiolink',
  ]);
  assert.equal((html.match(/data-home-latest/g) ?? []).length, 1);
  assert.match(html, />製品・マニュアル・サポート</);
  assert.match(html, />ニュース・航空知識</);
  assert.match(html, /happinesea hobby/);
  assert.match(html, /夢を現実に！/);
  assert.ok(html.includes(`href="${publicationBase}/drawinglibrary/"`));
  assert.ok(html.includes(`href="${publicationBase}/drone-rc-glossary/"`));
  assert.doesNotMatch(
    html,
    /業界・技術|Products &amp; Support|Industry &amp; Technology|日本代理店/,
  );
  assert.match(html, /data-home-resource="manuals"/);
  assert.match(html, /data-home-resource="support"/);
  assert.match(html, /data-home-resource="updates"/);
  assert.ok(html.includes(`href="${publicationBase}/manuals/"`));
  assert.doesNotMatch(html, /実装済み|公開サンプル|検証用/);
});

test('Radiolink catalogue exposes seven accessible category filters', async () => {
  const html = await route('radiolink/index.html');
  const categories = [
    '送信機',
    '受信機',
    'フライトコントローラー',
    'GPS・RTK・センサー',
    '機体',
    '電源・ESC',
    'モジュール・アクセサリー',
  ];

  for (const category of categories) {
    assert.match(html, new RegExp(`data-category-filter="${category}"`));
  }
  assert.match(html, /aria-live="polite"/);
});

test('Radiolink catalogue renders all inventory products without pending detail links', async () => {
  const html = await route('radiolink/index.html');

  assert.equal((html.match(/data-product-card=/g) ?? []).length, 83);
  assert.equal((html.match(/data-detail-available/g) ?? []).length, 8);
  assert.equal((html.match(/data-detail-preparing/g) ?? []).length, 75);
  assert.equal((html.match(/詳しい仕様は公式サイトで/g) ?? []).length, 75);
  assert.equal((html.match(/data-product-card-image/g) ?? []).length, 83);
  assert.equal((html.match(/loading="lazy"/g) ?? []).length, 83);
  assert.match(html, /83件を表示/);
  assert.match(html, /data-radiolink-hub/);
  assert.doesNotMatch(html, /公式ページで確認した83商品/);
  assert.doesNotMatch(html, /詳細ページがない商品/);
  assert.doesNotMatch(html, /詳細ページ準備中/);
  assert.doesNotMatch(
    html,
    new RegExp(`href="${publicationBase}/radiolink/(?:turbo-pix|at10-ii)/"`),
  );
});

test('Radiolink catalogue uses official white-background menu icons', async () => {
  const html = await route('radiolink/index.html');

  for (const slug of [
    'rc8x',
    'rc8p',
    't12d',
    'r16f',
    'r12f',
    'r8fg',
    'r7fg',
    'r6fg',
  ]) {
    assert.match(
      html,
      new RegExp(`/assets/radiolink/catalogue/${slug}\\.webp`),
      slug,
    );
  }
  assert.match(html, /data-product-card-image/);
  assert.match(html, /object-contain/);
  assert.doesNotMatch(html, /公式商品ページの内容を日本向けに整理しています。/);
});

test('RC8X product page follows the official product flow without commercial claims', async () => {
  const html = await route('radiolink/rc8x/index.html');
  const sections = [
    'overview',
    'features',
    'package',
    'specifications',
    'certificates',
    'firmware',
    'videos',
    'faq',
    'updates',
  ];

  assert.match(html, /aria-label="パンくずリスト"/);
  assert.match(html, /Radiolink/);
  assert.match(html, /RC8X/);
  assert.match(html, /href="https:\/\/line\.me\/R\/ti\/p\/%40662zyrsb"/);
  for (const section of sections) {
    assert.match(html, new RegExp(`data-product-section="${section}"`));
  }
  assert.match(html, /data-product-nav/);
  assert.ok(html.includes(`href="${publicationBase}/manuals/rc8x/"`));
  assert.match(html, />日本語マニュアル</);
  assert.match(html, />英語マニュアル</);
  assert.match(html, /Radiolink公式・外部サイト/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /aria-label="LINEで相談"/);
  assert.doesNotMatch(html, />LINEで相談</);
  assert.doesNotMatch(html, /メーカー確認中/);
  assert.doesNotMatch(html, /メーカー確認用プレビュー/);
  assert.match(html, />RC8X</);
  assert.match(
    html,
    /※出荷時は8チャンネルです。ファームウェアV1\.3\.5以降へ更新すると16チャンネルに拡張できます。/,
  );
  assert.doesNotMatch(html, /PRODUCT OVERVIEW/);
  assert.doesNotMatch(html, /data-product-section="feature-summary"/);
  assert.match(html, /data-official-product-video/);
  assert.match(html, /d5acb416b76a01be7edf080741b0e681\.mp4/);
  assert.doesNotMatch(html, /Radiolink公式 RC8X製品動画/);
  assert.match(html, /\/assets\/radiolink\/rc8x\/architecture\.webp/);
  assert.match(html, /data-feature-layout="tile"/);
  assert.match(html, /data-feature-layout="split"/);
  const cardOrder = [
    'wallpaper',
    'theme-customization',
    'voice-customization',
    'voice-broadcast',
    'channel-customization',
    'switch-customization',
    'languages',
    'latency',
    'model-storage',
    'cruise-control',
    'dual-rate',
    'ergonomics',
    'physical-options',
    'power',
  ];
  let previousCardPosition = -1;
  for (const featureId of cardOrder) {
    const position = html.indexOf(`data-feature-section="${featureId}"`);
    assert.ok(position > previousCardPosition, `${featureId} card order`);
    previousCardPosition = position;
  }
  for (const groupLabel of [
    'カスタマイズ / UI',
    '運用 / 表示 / モデル管理',
    '操作性 / 拡張 / ハードウェア',
  ]) {
    assert.match(html, new RegExp(groupLabel.replaceAll('/', '\\/')));
  }
  assert.match(html, /\/assets\/radiolink\/rc8x\/buzzer-screen\.bmp/);
  assert.match(html, /\/assets\/radiolink\/rc8x\/languages\.gif/);
  assert.match(html, /data-feature-section="fpv-external-functions"/);
  assert.match(html, /data-feature-section="r8fg-receiver-system"/);
  assert.doesNotMatch(
    html,
    /data-feature-section="(?:interfaces|external-functions|fpv-display|gyro|water-resistance|r8fg-stability-protection|receivers)"/,
  );
  assert.match(html, /\/assets\/radiolink\/rc8x\/telemetry\.gif/);
  assert.doesNotMatch(
    html,
    /\/assets\/radiolink\/rc8x\/telemetry\.(?:webp|avif)/,
  );
  assert.match(html, />チュートリアル</);
  assert.match(html, /チュートリアル動画をさらに表示する（24本）/);
  assert.match(
    html,
    /href="https:\/\/www\.radiolink\.com\.cn\/rc8x_certificates"/,
  );
  assert.match(html, /RC8X仕様/);
  assert.match(html, /R8FG仕様/);
  assert.match(html, /V1\.3\.6/);
  assert.match(html, /youtube-nocookie\.com\/embed\//);
  assert.match(html, /<details[^>]*data-product-faq/);
  assert.match(html, /<time[^>]*>[^<]+<\/time>[\s\S]*?<a[^>]+>[^<]+<\/a>/);
  assert.doesNotMatch(html, /data-product-section="manuals"/);
  assert.doesNotMatch(html, /data-product-section="support"/);
  assert.doesNotMatch(html, /data-product-section="(?:source|last-checked)"/);
  assert.doesNotMatch(html, />情報源</);
  assert.doesNotMatch(html, /"@type":"(?:Offer|AggregateRating)"/);
  assert.doesNotMatch(html, /"offers"|"aggregateRating"/);
  assert.doesNotMatch(html, /data-ad-client|data-ad-slot/);
  // Auto Ads may load in the head; manual ad slots remain prohibited.
});

for (const product of [
  {
    slug: 'rc8p',
    model: 'RC8P',
    officialUrl: 'https://www.radiolink.com/en/rc8p',
    asset: 'gyro.gif',
  },
  {
    slug: 't12d',
    model: 'T12D',
    officialUrl: 'https://www.radiolink.com/en/t12d',
    asset: 'language.gif',
  },
  {
    slug: 'r16f',
    model: 'R16F',
    officialUrl: 'https://www.radiolink.com/r16f',
    asset: 'subsidiary.gif',
  },
  {
    slug: 'r12f',
    model: 'R12F',
    officialUrl: 'https://www.radiolink.com/r12f',
    asset: 'subsidiary.gif',
  },
  {
    slug: 'r8fg',
    model: 'R8FG',
    officialUrl: 'https://www.radiolink.com/r8fg',
    asset: 'gyro.gif',
  },
  {
    slug: 'r7fg',
    model: 'R7FG',
    officialUrl: 'https://www.radiolink.com/r7fg',
    asset: 'gyro.gif',
  },
  {
    slug: 'r6fg',
    model: 'R6FG',
    officialUrl: 'https://www.radiolink.com/r6fg',
    asset: 'gyro.gif',
  },
]) {
  test(`${product.model} product page keeps official flow and public-review boundaries`, async () => {
    const html = await route(`radiolink/${product.slug}/index.html`);

    assert.match(html, new RegExp(`>${product.model}<`));
    assert.match(html, /data-standard-product-page/);
    assert.match(html, /data-product-section="features"/);
    assert.match(html, /data-product-section="specifications"/);
    assert.match(html, /data-product-section="package"/);
    assert.match(html, /data-product-section="videos"/);
    assert.match(html, /data-product-section="faq"/);
    if (['r16f', 'r12f', 'r8fg', 'r7fg', 'r6fg'].includes(product.slug)) {
      assert.match(html, />対応するRadiolink送信機</);
      assert.doesNotMatch(html, /data-product-section="certificates"/);
    }
    assert.match(html, new RegExp(product.officialUrl.replaceAll('/', '\\/')));
    assert.match(
      html,
      new RegExp(`/assets/radiolink/${product.slug}/${product.asset}`),
    );
    if (product.slug === 't12d') {
      assert.match(html, />地上距離</);
      assert.match(html, />空中距離</);
      assert.doesNotMatch(html, />標準モード</);
      assert.doesNotMatch(html, />長距離モード</);
    }
    if (product.slug === 'rc8p')
      assert.ok(html.includes(`href="${publicationBase}/manuals/rc8p/"`));
    else assert.doesNotMatch(html, new RegExp(`/manuals/${product.slug}/`));
    assert.doesNotMatch(html, />情報源</);
    assert.doesNotMatch(html, /メーカー確認中/);
    assert.doesNotMatch(html, /公式公開情報を基に作成しています/);
    assert.doesNotMatch(html, /"@type":"(?:Offer|AggregateRating)"/);
  });
}

test('support and product update routes are distinct public targets', async () => {
  const support = await route('support/index.html');
  const updates = await route('radiolink/updates/index.html');

  assert.match(support, /RC8X サポート/);
  assert.match(support, /href="https:\/\/line\.me\/R\/ti\/p\/%40662zyrsb"/);
  assert.ok(support.includes(`href="${publicationBase}/radiolink/rc8x/"`));
  assert.ok(support.includes(`href="${publicationBase}/manuals/rc8x/"`));
  assert.doesNotMatch(support, /構成サンプル|公開中のFAQはありません/);
  assert.match(updates, /Radiolink更新情報/);
  assert.match(updates, /data-content-kind="product_update"/);
});

test('manuals category provides a public entry point without review language', async () => {
  const category = await route('manuals/index.html');
  const manual = await route('manuals/rc8x/index.html');
  const chapterOne = await route('manuals/rc8x/chapter-01/index.html');
  const chapterTwo = await route('manuals/rc8x/chapter-02/index.html');

  assert.match(category, /data-manual-index/);
  assert.ok(category.includes(`href="${publicationBase}/manuals/rc8x/"`));
  assert.match(category, /日本語完全版の取扱説明書を掲載しています。/);
  for (const html of [category, manual, chapterOne, chapterTwo]) {
    assert.doesNotMatch(
      html,
      /メーカー確認|公開前レビュー|確認中の主な項目|公開status/,
    );
  }
});

test('insights index exposes all editorial topics', async () => {
  const html = await route('insights/index.html');
  const topics = [
    '航空・ドローン',
    'RC技術',
    '法規・制度',
    '業界動向',
    '技術解説',
    '導入事例',
  ];

  assert.match(html, /data-editorial-index/);
  for (const topic of topics) {
    assert.match(html, new RegExp(`data-topic-label="${topic}"`));
  }
  assert.equal((html.match(/<article class=/g) ?? []).length, 90);
  assert.match(
    html,
    /how-to-change-radiolink-t8fb-stick-mode-joystick-calibration/,
  );
  assert.match(html, /how-to-set-t16d-t12d-to-control-a560/);
  assert.doesNotMatch(
    html,
    /data-insights-empty|公開サンプル|検証用|航空機のエンジンが停止/,
  );
});

test('WordPress insight batch emits sanitized static routes with local images and legacy canonicals', async () => {
  const contentImageReviews = (
    await Promise.all(
      [
        'wordpress-phase6-review-batch3',
        'wordpress-phase6-review-batch4',
        'wordpress-phase6-completion-review',
      ].map(
        async (batch) =>
          JSON.parse(
            await readFile(
              new URL(`./fixtures/${batch}.json`, import.meta.url),
              'utf8',
            ),
          ).articles,
      ),
    )
  ).flat();
  const articles = JSON.parse(
    await readFile(
      new URL('../src/data/wordpress-insights.json', import.meta.url),
      'utf8',
    ),
  );

  for (const article of articles) {
    const html = await route(
      `insights/${decodeURIComponent(article.slug)}/index.html`,
    );
    const legacyHtml = await route(
      new URL(article.canonical).pathname.slice(1),
    );
    assert.equal(
      legacyHtml,
      html,
      `exact legacy alias for ${article.contract.id}`,
    );
    assert.match(
      html,
      new RegExp(
        `<link rel="canonical" href="${manualCanonical(article.canonical, rc4gsManual)}"`,
      ),
    );
    if (!article.hero) {
      assert.equal(article.hero, null);
      if (article.body_assets.length === 0) assert.doesNotMatch(html, /<img\b/);
    } else {
      assert.ok(html.includes(`src="${publicationBase}${article.hero.src}"`));
      const reviewed = contentImageReviews.find(
        (item) => item.id === article.contract.id,
      );
      if (reviewed?.featured_image_review)
        assert.ok(
          html.includes(
            `alt="${reviewed.source_record._embedded['wp:featuredmedia'][0]?.alt_text || reviewed.featured_image_review.alt}"`,
          ),
        );
      else
        assert.match(
          html,
          article.contract.id === 1
            ? /<img[^>]+alt="Radiolinkロゴ"/
            : /<img[^>]+alt(?:="")?(?:\s|>)/,
        );
    }
    if (!article.content_html.includes('<iframe'))
      assert.doesNotMatch(html, /<iframe\b/);
    else assert.match(html, /https:\/\/www\.youtube\.com\/embed\//);
    assert.doesNotMatch(html, /happinesea\.com\/wp-(?:json|content)/);
    assert.doesNotMatch(
      // The reviewed first-party Google head bootstrap is not CMS article markup.
      html.replace(/<head>[\s\S]*?<\/head>/, (head) =>
        head.replace(
          /<script[^>]*data-google-publication[^>]*>[\s\S]*?<\/script>/g,
          '',
        ),
      ),
      /<script[^>]*>[^<]*(?:alert|adsbygoogle)|<object|<embed|javascript:/i,
    );
    assert.doesNotMatch(html, /記事内広告掲載候補/);
  }
});

test('WordPress publication validation report records the approved batch scope', async () => {
  const report = JSON.parse(
    await readFile(
      new URL(
        '../src/data/wordpress-publication-validation.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );

  const manifest = JSON.parse(
    await readFile(
      new URL('../src/data/wordpress-insight-manifest.json', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(report.expected_count, manifest.expected_count);
  assert.equal(report.received_count, manifest.expected_count);
  assert.deepEqual(
    report.article_ids,
    manifest.articles.map(({ id }) => id),
  );
  assert.equal(report.validation.status, 'passed');
  assert.equal(report.validation.remote_runtime_dependency, false);
});

test('non-published insight route stays available without internal copy', async () => {
  const html = await route('insights/aircraft-engine-stop/index.html');

  assert.match(html, /この記事は現在お読みいただけません。/);
  assert.ok(html.includes(`href="${publicationBase}/insights/"`));
  assert.doesNotMatch(html, /公開サンプル|検証用|構成サンプル|記事画像準備中/);
  assert.doesNotMatch(html, /"@type":"TechArticle"/);
});

test('Starlight manual retains navigation features under the project base', async () => {
  const index = await route('manuals/rc8x/index.html');
  const next = await route('manuals/rc8x/chapter-01/index.html');

  assert.match(index, /<html lang="ja"/);
  assert.match(index, /data-has-sidebar/);
  assert.match(index, /data-has-toc/);
  assert.match(index, /<main/);
  assert.match(index, /<site-search/);
  assert.match(index, /class="sidebar /);
  assert.match(index, /right-sidebar/);
  assert.match(index, /pagination-links/);
  assert.match(index, /sl-menu-button/);
  assert.match(index, /happinesea/);
  assert.ok(index.includes(`href="${publicationBase}/"`));
  assert.ok(
    index.includes(`href="${publicationBase}/manuals/rc8x/chapter-01/"`),
  );
  assert.ok(next.includes(`href="${publicationBase}/manuals/rc8x/"`));
  const productHref = index.match(/href="([^"]+)">RC8X商品ページへ戻る/)?.[1];
  assert.equal(
    new URL(
      productHref,
      `https://happinesea.com${publicationBase}/manuals/rc8x/`,
    ).pathname,
    `${publicationBase}/radiolink/rc8x/`,
  );
});

test('RC8X manual chapters place official figures and videos in relevant sections', async () => {
  for (const path of [
    'manuals/rc8x/chapter-01/index.html',
    'manuals/rc8x/chapter-02/index.html',
  ]) {
    const html = await route(path);
    assert.match(html, /data-source-figure=/);
    assert.match(html, /data-manual-figure(?:=|\s|>)/);
    assert.ok(
      html.includes(`${publicationBase}/assets/radiolink/rc8x/full-manual/`),
    );
    assert.match(html, /data-manual-video(?:=|\s|>)/);
    assert.match(html, /youtube-nocookie\.com\/embed\//);
  }
});

test('all public routes emit project-base canonical and Open Graph URLs', async () => {
  const routes = [
    'index.html',
    'radiolink/index.html',
    'radiolink/rc8x/index.html',
    'radiolink/r16f/index.html',
    'radiolink/r12f/index.html',
    'radiolink/r8fg/index.html',
    'radiolink/r7fg/index.html',
    'radiolink/r6fg/index.html',
    'radiolink/updates/index.html',
    'support/index.html',
    'insights/index.html',
    'insights/aircraft-engine-stop/index.html',
    'manuals/index.html',
    'manuals/rc8x/index.html',
    'manuals/rc8x/chapter-01/index.html',
    'manuals/rc8x/chapter-02/index.html',
  ];

  for (const path of routes) {
    const html = await route(path);
    assert.match(html, /<title>[^<]*happinesea hobby[^<]*<\/title>/, path);
    const origin = publicationBase
      ? 'https://happinesea.github.io/happinesea-site/'
      : 'https://happinesea.com/';
    const canonical =
      path === 'radiolink/index.html'
        ? 'https://happinesea.com/radiolink'
        : origin + path.replace(/index\.html$/, '');
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}"`), path);
    assert.ok(
      html.includes(`<meta property="og:url" content="${canonical}"`),
      path,
    );
    for (const [, value] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      if (value.startsWith('/')) {
        assert.ok(
          publicationBase
            ? value.startsWith(publicationBase + '/')
            : !value.startsWith('/happinesea-site/'),
          `${path}: ${value}`,
        );
      }
    }
  }
});

test('robots and sitemap use the selected publication origin', async () => {
  const robots = await route('robots.txt');
  const sitemap = await route('sitemap-index.xml');

  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  const base =
    process.env.PUBLICATION_MODE === 'production'
      ? 'https://happinesea.com/'
      : 'https://happinesea.github.io/happinesea-site/';
  assert.equal(
    robots,
    `User-agent: *\nAllow: /\nSitemap: ${base}sitemap-index.xml\n`,
  );
  assert(sitemap.includes(`<loc>${base}sitemap-0.xml</loc>`));
  await assert.rejects(access(new URL('../CNAME', import.meta.url)));
});

test('structured data contains only backed product and article types', async () => {
  const product = await route('radiolink/rc8x/index.html');
  const unpublishedArticle = await route(
    'insights/aircraft-engine-stop/index.html',
  );

  assert.match(product, /"@type":"Product"/);
  assert.match(product, /"@type":"BreadcrumbList"/);
  assert.doesNotMatch(unpublishedArticle, /"@type":"TechArticle"/);
  assert.doesNotMatch(product, /"offers"|"aggregateRating"|"review"/);
});
