import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { verifySitemap } from '../scripts/lib/sitemap.mjs';
import { manualCanonical } from '../scripts/lib/rc4gs-v2-manual.mjs';
const rc4gsManual = JSON.parse(
  await readFile(
    new URL('../src/data/manuals/rc4gs-v2.json', import.meta.url),
    'utf8',
  ),
);

const route = (path) =>
  readFile(new URL(`../dist/${path}`, import.meta.url), 'utf8');

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
          html.includes(`src="/happinesea-site${image.src}"`),
          `body image base missing: ${path} ${image.src}`,
        );
      assert.doesNotMatch(html, /src="\/assets\/insights\/wordpress\//);
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
  assert.match(html, /href="\/happinesea-site\/drawinglibrary\/"/);
  assert.match(html, /href="\/happinesea-site\/drone-rc-glossary\/"/);
  assert.doesNotMatch(
    html,
    /業界・技術|Products &amp; Support|Industry &amp; Technology|日本代理店/,
  );
  assert.match(html, /data-home-resource="manuals"/);
  assert.match(html, /data-home-resource="support"/);
  assert.match(html, /data-home-resource="updates"/);
  assert.match(html, /href="\/happinesea-site\/manuals\/"/);
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
    /href="\/happinesea-site\/radiolink\/(?:turbo-pix|at10-ii)\/"/,
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
  assert.match(html, /href="\/happinesea-site\/manuals\/rc8x\/"/);
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
    assert.doesNotMatch(html, new RegExp(`/manuals/${product.slug}/`));
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
  assert.match(support, /href="\/happinesea-site\/radiolink\/rc8x\/"/);
  assert.match(support, /href="\/happinesea-site\/manuals\/rc8x\/"/);
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
  assert.match(category, /href="\/happinesea-site\/manuals\/rc8x\/"/);
  assert.match(category, /現在は概要、第1章、第2章を掲載しています。/);
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
      assert.match(html, new RegExp(`/happinesea-site${article.hero.src}`));
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
      html,
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
  assert.match(html, /href="\/happinesea-site\/insights\/"/);
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
  assert.match(index, /href="\/happinesea-site\/"/);
  assert.match(index, /href="\/happinesea-site\/manuals\/rc8x\/chapter-01\/"/);
  assert.match(next, /href="\/happinesea-site\/manuals\/rc8x\/"/);
  const productHref = index.match(/href="([^"]+)">RC8X商品ページへ戻る/)?.[1];
  assert.equal(
    new URL(
      productHref,
      'https://happinesea.github.io/happinesea-site/manuals/rc8x/',
    ).pathname,
    '/happinesea-site/radiolink/rc8x/',
  );
});

test('RC8X manual chapters place official figures and videos in relevant sections', async () => {
  for (const path of [
    'manuals/rc8x/chapter-01/index.html',
    'manuals/rc8x/chapter-02/index.html',
  ]) {
    const html = await route(path);
    assert.match(html, /data-manual-section=/);
    assert.match(html, /data-manual-figure(?:=|\s|>)/);
    assert.match(html, /\/happinesea-site\/assets\/radiolink\/rc8x\/manual\//);
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
    assert.match(
      html,
      path === 'radiolink/index.html'
        ? /<link rel="canonical" href="https:\/\/happinesea\.com\/radiolink"/
        : /<link rel="canonical" href="https:\/\/happinesea\.github\.io\/happinesea-site\//,
      path,
    );
    assert.match(
      html,
      path === 'radiolink/index.html'
        ? /<meta property="og:url" content="https:\/\/happinesea\.com\/radiolink"/
        : /<meta property="og:url" content="https:\/\/happinesea\.github\.io\/happinesea-site\//,
      path,
    );
    for (const [, value] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      if (value.startsWith('/')) {
        assert.ok(value.startsWith('/happinesea-site/'), `${path}: ${value}`);
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
