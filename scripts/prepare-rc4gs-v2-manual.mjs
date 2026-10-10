// One-time publication copy: does not modify the source articles or their migration gates.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  fetchJson,
  fetchPublishedPosts,
  stableReviewedHtml,
  htmlText,
  sanitizeArticleHtml,
  reviewedArticleHtml,
} from './lib/wordpress-publication.mjs';
import { sha256, verifyRc4gsManual } from './lib/rc4gs-v2-manual.mjs';

const articles = JSON.parse(
  await readFile('src/data/wordpress-insights.json', 'utf8'),
);
const publicationManifest = JSON.parse(
  await readFile('src/data/wordpress-insight-manifest.json', 'utf8'),
);
const aliases = JSON.parse(
  await readFile('src/data/cutover-compatibility.json', 'utf8'),
).aliases;
const downloads = JSON.parse(
  await readFile('src/data/static-downloads.json', 'utf8'),
);
const legacy = JSON.parse(
  await readFile('src/data/legacy-compatibility.json', 'utf8'),
);
const [index] = await fetchJson(
  'https://cms.happinesea.com/wp-json/wp/v2/pages?slug=rc4gs-manual',
);
assert.equal(index.id, 921);
assert.equal(index.status, 'publish');
const [category] = await fetchJson(
  'https://cms.happinesea.com/wp-json/wp/v2/categories?slug=rc4gs-manual',
);
assert.equal(category.id, 20);
const archive = await fetchJson(
  'https://cms.happinesea.com/wp-json/wp/v2/posts?categories=20&per_page=100&_fields=id,link,title',
);
const order = [
  199, 196, 160, 1050, 1054, 175, 234, 121, 129, 185, 100, 30, 92, 85, 77, 70,
  62, 54, 169, 47, 1058, 1075, 1082, 1086, 39, 10, 850, 191, 854, 863,
];
// Firmware 160 and ATL 47 are linked by the index but live outside category 20.
assert.deepEqual(
  archive.map((x) => x.id).sort((a, b) => a - b),
  [...order.filter((id) => ![160, 47].includes(id)), 188].sort((a, b) => a - b),
);
const live = await fetchPublishedPosts(
  'https://cms.happinesea.com/wp-json/wp/v2/posts',
  [...order, 188],
);
const styleEdits = [
  ['押下して', '押して'],
  ['押下し', '押し'],
  ['押下すると', '押すと'],
  ['ヂュアルレート', 'デュアルレート'],
  ['ヂューティ比', 'デューティ比'],
  ['スロットルスアクセレーション', 'スロットルアクセレーション'],
  ['ブレキー戻り量', 'ブレーキ戻り量'],
  ['早くあなります', '速くなります'],
  ['アンテナ―', 'アンテナ'],
  ['成るべく', 'なるべく'],
  ['ご確認してください', '確認してください'],
  ['ご注意をしてください', '注意してください'],
  ['ご参考してください', '参考にしてください'],
  ['に参考してください', 'を参照してください'],
  ['メーカー出荷の常態', 'メーカー出荷の状態'],
  ['コピー＆ペスト', 'コピー＆ペースト'],
  ['ステアリンチャンネル', 'ステアリングチャンネル'],
  ['ステアリンを', 'ステアリングを'],
  ['現れてで警告します', '表示されて警告します'],
  ['RC4GSが10件', 'RC4GSは10件'],
  ['RC4GSが最大10件', 'RC4GSは最大10件'],
  ['R6FGがRadiolink', 'R6FGはRadiolink'],
  ['現時点、', '元記事の公開時点では、'],
  ['標準に付属しております', '標準で付属しています'],
  [
    '以下はR6FG各部位の名称とスペックとなります',
    '以下にR6FGの各部の名称と仕様を示します',
  ],
  ['設定されました', '設定されます'],
  ['点滅になり', '点滅し'],
  ['設定完了します', '設定が完了します'],
  ['画面に遷移ます', '画面に移ります'],
  ['初期画面へもどして', '初期画面に戻して'],
  ['画面に遷移し', '画面に移り'],
  ['画面へ遷移', '画面に移動'],
  ['事は可能です', 'ことができます'],
  ['使う事により', '使うことにより'],
  ['折れ曲がる事はできるようになります', '曲がれるようになります'],
  [
    'この機能はステアリングの操作する際の真ん中と左右の感度の設定します',
    'この機能は、ステアリング操作時の中央付近と左右の感度を設定します',
  ],
  [
    'この設定がサーボの最大角度に影響しません',
    'この設定はサーボの最大角度に影響しません',
  ],
  ['単一通常のRCカー', '通常のRCカー'],
  [
    'スロットルトリガーを引いたり離したりして、車が左右に回して',
    'スロットルトリガーを引いたり離したりしながら、車を左右に回して',
  ],
  [
    'これ以上、受信機の使い方の説明となります',
    '以上が受信機の使い方の説明です',
  ],
  ['電圧が4.6Vに下回ると', '電圧が4.6Vを下回ると'],
  ['アラーム音を聞こえたら', 'アラーム音が聞こえたら'],
  ['アラーム音が鳴らします', 'アラーム音が鳴ります'],
  ['機能を対応します', '機能に対応します'],
  ['ご参照して、', '参照して、'],
  ['両辺からはみだすように', '両側から外へ出るように'],
  ['真直ぐように保つ事', 'まっすぐに保つこと'],
  ['心掛けして、', '心掛けて、'],
  ['高性能R/Cシステムとなります', '高性能R/Cシステムです'],
  ['妨害に強いことは特徴であります', '妨害に強いことが特徴です'],
  ['各部位の名称', '各部の名称'],
  ['送信機しか対応しません', '送信機のみに対応します'],
  [
    '通常の動作モードが緑のLEDが点灯します。ジャイロ機能が動作しない。',
    '通常の動作モードでは緑のLEDが点灯し、ジャイロ機能は動作しません。',
  ],
  ['ジャイロモードが動作する時に', 'ジャイロモードが動作するときは'],
  ['ON/OFFの切替えるには', 'ON/OFFを切り替えるには'],
  ['3回連続おして', '3回連続で押して'],
  ['ジャイロ機能ONにすることで', 'ジャイロ機能をONにすることで'],
  ['ジャイロも機能をします', 'ジャイロも機能します'],
  ['ステアリングを動かないで', 'ステアリングを動かさずに'],
  ['アンテナがなるべく', 'アンテナをなるべく'],
  ['少なくとも12mmで離すこと', '少なくとも12mm離すこと'],
  ['受信機の正しく動作させるために', '受信機を正しく動作させるために'],
  [
    '電源をONにして、送信機に以下の内容でLCD画面が表示されます。',
    '電源をONにすると、送信機のLCD画面に以下の内容が表示されます。',
  ],
  [
    '電源をONにして、送信機以下の内容でLCD画面が表示されます。',
    '電源をONにすると、送信機のLCD画面に以下の内容が表示されます。',
  ],
  ['当文書は', '本マニュアルは'],
  ['設定する必要な場合', '設定する必要がある場合'],
  ['値が点滅が停止し', '値の点滅が停止し'],
  ['図に画面に表示する', '図の画面に表示される'],
  ['7段階の設定できます', '7段階で設定できます'],
  ['アイドルアップ機能がエンジンカー', 'アイドルアップ機能はエンジンカー'],
  ['の設定はできます', 'の設定ができます'],
  ['舵角を減らしたときは', '舵角を減らしたいときは'],
  ['1つのユニット(1⇒1)を対応します', '1つのユニット(1⇒1)に対応します'],
  ['ステアリングを回ったら', 'ステアリングを回すと'],
  ['前進と左右に曲がるには', '前進と左右への旋回には'],
  ['後退の左右に曲がるを実現するには', '後退時の左右への旋回を実現するには'],
  ['先進・後退設定', '前進・後退設定'],
  ['英数字符号が使用できます', '英数字と記号を使用できます'],
  ['ローバッテリーの表示が表示されて', 'ローバッテリーの表示で'],
  ['送信機からできなくなる。', '送信機からできなくなります。'],
  ['MIXがOFFに設定した場合', 'MIXがOFFに設定されている場合'],
  [
    'リセット機能は送信機に保存されるデータはすべて消して',
    'リセット機能は送信機に保存されているデータをすべて消去して',
  ],
];
const openItems = {
  199: '電源仕様「4.8-15.0V」と「2-4S LiPO」の整合、および対応受信機のR8EF重複は未確認です。使用電源は実機の表示とメーカーのV2資料で確認してください。',
  196: '末尾の電源投入順序は安全上の確認が必要です。送信機をOFFにして受信機をONにする記述を、そのまま実行しないでください。「R6GF」とR6FGの表記、受信機図のV2表記と組合せの適用範囲も未確認です。',
  175: '低電圧警告後の「4分以内」は保証時間ではありません。記載の根拠は未確認です。',
  234: '言語拡張の予定は旧記事当時の記載であり、現在の提供状況を保証するものではありません。',
  129: '原文の「EAP」と「EPA」、4C-UP/DWNの説明、ボタン「終了」の実機表記は未確認です。',
  185: 'STEXPの手順に「EAP」、初期値に「100％」とありますが、同じ節の初期値「0%」と整合しません。確認が取れるまでこの手順で設定しないでください。',
  30: '設定項目「MODEL」と図の「MODE」、5種類のカーブの説明、およびボタン「終了」の実機表記は未確認です。',
  54: 'REVの項目説明と操作がサブトリムの記述になっており、仕様確認が必要です。確認が取れるまでこの手順で設定しないでください。',
  47: 'ATLの手順がD/Rの記述になっています。確認が取れるまでこの手順で設定しないでください。',
  85: 'STMの手順で設定項目「ABP」が指定されています。STMとABPの対応は未確認です。',
  1050: '原文の画面名「ARARM」とALARMの対応は未確認です。実機の表示を確認してください。',
  1054: '原文の画面名「ARARM」とALARMの対応は未確認です。テレメトリーの対応条件は旧記事の記載を保持しています。',
  1082: 'ステアリングの説明が「スロットルチャンネル」となっていますが、図はSTです。確認が取れるまで該当手順で設定しないでください。',
  1086: 'PMIX2の本文のマスター/スレーブと図のMST/SLVが逆です。確認が取れるまで該当手順で設定しないでください。',
  39: '原文の「3チャンネルおよび3チャンネル」、ch4とCH4の表記、スイッチ/ボリュームの対応は未確認です。推測で番号やUI表記を修正していません。',
  169: '原文のUI名「Streering D/R」の実機表記は未確認です。推測で画面名を変更していません。',
  77: 'ACCELの本文見出しが「スロットルスピード」となっています。機能名の対応は未確認です。',
  850: 'バッテリー種類の説明（LiFe、Ni-MH）とMODEの表示（Li2S、Li3、Ni4S）の対応は未確認です。使用電源は実機とメーカーのV2資料で確認してください。',
};
const changes = [];
const sections = order.map((id, position) => {
  const article = articles.find((x) => x.contract.id === id);
  assert(article, `missing publication ${id}`);
  const post = live.find((x) => x.id === id);
  const mapping = publicationManifest.articles.find((entry) => entry.id === id);
  const normalized = sanitizeArticleHtml(
    reviewedArticleHtml(post.content.rendered, mapping.content_review),
    new Map(article.body_assets.map((asset) => [asset.source_url, asset])),
    { preserveAnchors: true, imageReviews: mapping.body_image_reviews },
  );
  assert.equal(
    stableReviewedHtml(normalized),
    stableReviewedHtml(article.contract.content),
    `live normalized source drift ${id}`,
  );
  const chapter = position < 5 ? 1 : 2;
  const number =
    chapter === 1
      ? `1.${position + 1}`
      : position < 21
        ? `2.${position - 4}`
        : position < 24
          ? `2.16.${position - 20}`
          : `2.${position - 7}`;
  let title = htmlText(article.title)
    .replace(/^RC4GS取扱説明書：\s*(?:\d+(?:\.\d+)*．)?/, '')
    .replace(/^RC4GS/, 'RC4GS');
  if (id === 160) title = 'RC4GSファームウェアアップグレード手順';
  if (id === 1082)
    title = '混合制御（ミックスコントロール）設定前の受信機の準備';
  title = title.replaceAll('ヂュアルレート', 'デュアルレート');
  let content = article.content_html;
  for (const [from, to] of styleEdits) {
    let count = 0;
    content = content
      .split(/(<[^>]*>)/g)
      .map((part) => {
        if (part.startsWith('<')) return part;
        count += part.split(from).length - 1;
        return part.replaceAll(from, to);
      })
      .join('');
    if (count)
      changes.push({ id, from, to, count, type: 'STYLE_OR_TERMINOLOGY_ONLY' });
  }
  return {
    id,
    chapter,
    number,
    title,
    target: `/manuals/rc4gs-v2/chapter-0${chapter}/#s-${number.replaceAll('.', '-')}`,
    source_url: post.link,
    source_sha256: sha256(article.content_html),
    source_rest_sha256: sha256(stableReviewedHtml(post.content.rendered)),
    content_html: content,
    publication_sha256: sha256(content),
    assets: article.body_assets,
    caution: openItems[id] ?? null,
  };
});
const mappings = [];
const add = (url, target, id, anchors) => {
  const path = new URL(url).pathname.replace(/\/$/, '');
  if (!mappings.some((x) => x.legacy_path === path))
    mappings.push({
      legacy_path: path,
      source_id: id,
      target,
      ...(anchors ? { anchors } : {}),
    });
};
for (const section of sections) {
  const article = articles.find((x) => x.contract.id === section.id);
  const anchors =
    section.id === 196
      ? Object.fromEntries(
          ['1-2-1', '1-2-2', '1-2-3'].map((key) => [`s-${key}`, `#s-${key}`]),
        )
      : undefined;
  add(article.canonical, section.target, section.id, anchors);
  for (const alias of aliases.filter((x) => x.canonical === article.canonical))
    add(alias.legacy_url, section.target, section.id, anchors);
  add(
    `https://happinesea.com${article.route}`,
    section.target,
    section.id,
    anchors,
  );
}
// The authoritative index uses these two historical news paths; current REST uses the manual category.
add(
  'https://happinesea.com/news/202006281075.html',
  sections.find((x) => x.id === 1075).target,
  1075,
);
add(
  'https://happinesea.com/news/202006281086.html',
  sections.find((x) => x.id === 1086).target,
  1086,
);
for (const match of index.content.rendered.matchAll(
  /href="(https:\/\/happinesea\.com[^"#]+)"/g,
)) {
  assert(
    mappings.some((x) => x.legacy_path === new URL(match[1]).pathname),
    `unmapped index link ${match[1]}`,
  );
}
add(index.link, '/manuals/rc4gs-v2/', 921);
const oldIndex = articles.find((x) => x.contract.id === 188);
add(oldIndex.canonical, '/manuals/rc4gs-v2/', 188);
add(`https://happinesea.com${oldIndex.route}`, '/manuals/rc4gs-v2/', 188);
for (const page of legacy.pages.filter(
  (x) => x.type === 'verified_manual_alias',
)) {
  if (/rc4gs-manual\/?$/.test(page.target_route))
    add(
      `https://happinesea.com${page.target_route}`,
      '/manuals/rc4gs-v2/',
      921,
    );
}
add('https://happinesea.com/rc4gs-manual', '/manuals/rc4gs-v2/', 921);
for (const page of legacy.pages.filter((item) =>
  /^\/category\/radiolink-support\/rc4gs-manual(?:\/page\/\d+)?$/.test(
    item.target_route,
  ),
)) {
  add(page.canonical, '/manuals/rc4gs-v2/', 921);
}
const cover = { ...articles.find((x) => x.contract.id === 196).hero };
cover.localized_sha256 = sha256(await readFile(`public${cover.src}`));
const allAssets = new Map();
for (const section of sections)
  for (const asset of section.assets) {
    allAssets.set(asset.src, {
      ...asset,
      localized_sha256: sha256(await readFile(`public${asset.src}`)),
    });
  }
allAssets.set(cover.src, cover);
const manual = {
  version: '0.1',
  product: 'RC4GS V2',
  source_index: index.link,
  source_index_sha256: sha256(index.content.rendered),
  source_archive: category.link,
  reviewed_at: new Date().toISOString(),
  cover,
  sections,
  mappings,
  changes,
  open_items: Object.entries(openItems).map(([id, reason]) => ({
    id: Number(id),
    status: 'TECHNICAL_CONFIRMATION_REQUIRED',
    reason,
  })),
  downloads: downloads.files.filter((file) => /rc4gs/i.test(file.target_route)),
  assets: [...allAssets.values()],
  redirect_activation: 'OWNER_PUBLICATION_CHECK_REQUIRED',
};
verifyRc4gsManual(manual, articles);
await mkdir('src/data/manuals', { recursive: true });
await writeFile(
  'src/data/manuals/rc4gs-v2.json',
  JSON.stringify(manual, null, 2) + '\n',
);
await mkdir('docs/qa', { recursive: true });
await writeFile(
  'docs/qa/rc4gs-v2-url-map.md',
  '# RC4GS V2 URL対応表\n\n301は未有効化。公開確認後にownerが設定する。クエリはそのまま保持、旧hashは確認済み対応のみ変換する。\n\n| Source ID | 旧path | 新route |\n|---|---|---|\n' +
    mappings
      .map((x) => `| ${x.source_id} | ${x.legacy_path} | ${x.target} |`)
      .join('\n') +
    '\n',
);
console.log(
  JSON.stringify({
    sections: sections.length,
    unique_images: allAssets.size,
    mappings: mappings.length,
    wording_changes: changes.length,
    technical_open_items: manual.open_items.length,
  }),
);
