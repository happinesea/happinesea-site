/* global window, document */

export function googleServiceFlags(env) {
  const production = env.PUBLICATION_MODE === 'production';
  return {
    analytics: production && env.ANALYTICS_ENABLED === 'true',
    adsense: production && env.ADSENSE_ENABLED === 'true',
  };
}

// Serialized into the common head: do not request Google on local/preview origins.
export function startGoogleService(id, service) {
  if (window.location.origin !== 'https://happinesea.com') return;
  const loaderId = `publication-${service}-loader`;
  if (document.getElementById(loaderId)) return;
  const script = document.createElement('script');
  script.id = loaderId;
  script.async = true;
  if (service === 'analytics') {
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };
    window.gtag('js', new Date());
    window.gtag('config', id);
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  } else {
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${id}`;
    script.crossOrigin = 'anonymous';
  }
  document.head.append(script);
}

export function updateGooglePrivacy(html, flags) {
  const previous =
    '<p>Google AnalyticsおよびGoogle AdSenseは現在導入していません。今後導入する場合は、実際に利用するサービス、Cookieや取得情報等を確認し、本ポリシーを見直して必要事項を追記します。</p>';
  if (html.split(previous).length !== 2)
    throw new Error('privacy supplement drift');
  const analytics = flags.analytics
    ? '本番公開サイトでは、利用状況の把握とサイトの改善のためにGoogle Analytics 4を利用しています。'
    : '現在、この公開サイトではGoogle Analytics 4によるアクセス解析を行っていません。';
  const adsense = flags.adsense
    ? '本番公開サイトでは、広告配信のためにGoogle AdSenseを利用しています。'
    : '現在、この公開サイトではGoogle AdSenseによる広告配信を行っていません。';
  return html.replace(
    previous,
    `<p>${analytics}${adsense}</p>
<p>これらのサービスを利用する際、Googleなどの第三者がCookie等の技術を使用して、サイトの利用状況を測定したり、当サイトや他のサイトへのアクセスに基づく広告を表示したりする場合があります。サービスの情報の取扱いと広告・アクセス解析の詳細は、Googleの規約、ポリシーおよび各サービスの設定に従います。</p>
<p>詳しくは<a href="https://policies.google.com/privacy?hl=ja">Googleのプライバシーポリシー</a>および<a href="https://policies.google.com/technologies/partner-sites?hl=ja">Googleのサービスを使用するサイトでの情報の取扱い</a>をご確認ください。Googleのパーソナライズ広告の設定は<a href="https://myadcenter.google.com/">マイ アド センター</a>で管理できます。Cookieの設定は、ご利用のブラウザーでも変更できます。</p>`,
  );
}
