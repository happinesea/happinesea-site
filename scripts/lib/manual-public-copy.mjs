import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import sanitizeHtml from 'sanitize-html';

const operationalSafety =
  'この説明書に手順が掲載されていない操作・設定・接続は実行せず、お使いの機器に対応するメーカーの説明書を参照してください。';

const completeProcedure =
  '操作・設定・接続の手順がすべて掲載されていない場合は実行しないでください。手順を飛ばさず、お使いの機器に対応するメーカーの説明書を参照してください。';

const noticeHeadings = new Set(['原典確認待ち', '確認待ちの手順について']);

const readerNotices = new Map([
  [
    'この箇所は原典の記載または適用条件に確認が必要なため、操作・接続の案内を保留しています。確認が取れるまで、この箇所を根拠に機器を操作・接続しないでください。',
    operationalSafety,
  ],
  [
    '保留表示を含む一連の操作・接続手順は実行しないでください。手順番号を飛ばして進めず、確認が取れるまで参照用として扱ってください。',
    completeProcedure,
  ],
  [
    '確認待ちの行は操作案内を保留しています。確認が取れるまで機器を操作・接続しないでください。',
    completeProcedure,
  ],
  [
    '飛行後、具体的にいつバッテリーを取り外すかは、原典の記載から確認できていません。以下の注意9は、機体と送信機の電源を切る順序を示します。',
    '注意9は機体と送信機の電源を切る順序を示しています。バッテリーを取り外す時点は、お使いの機器に対応するメーカーの説明書を参照してください。',
  ],
  [
    '受信機の版・製造日とLED表示、対応プロトコルの適用条件が未確認のため、関連する操作と図を保留しています。確認が取れるまで、この箇所を根拠に機器を設定・接続しないでください。',
    'LED表示やプロトコルに基づいて設定・接続する前に、お使いの受信機の版・製造日に対応するメーカーの説明書を参照してください。',
  ],
  [
    '受信機の版・製造日と対応プロトコルの適用条件が未確認のため、関連する設定手順と図を保留しています。確認が取れるまで、この箇所を根拠に機器を設定・接続しないでください。',
    '設定・接続の前に、お使いの受信機の版・製造日に対応するメーカーの説明書で、適用されるプロトコルを確認してください。',
  ],
  [
    '使用するファームウェアと音声ファイルの適用条件が未確認のため、設定手順と図を保留しています。確認が取れるまで、この箇所を根拠に機器を設定・接続しないでください。',
    '音声を設定する前に、ファームウェアの版に対応するメーカーの説明書で使用できる音声ファイルを確認してください。',
  ],
  [
    '信号喪失時のスロットル出力の電気的な意味が未確認のため、設定手順と図を保留しています。確認が取れるまで、この箇所を根拠に機器を設定・接続しないでください。',
    '信号を失ったときのスロットル出力とフェイルセーフ設定は、お使いの受信機の型番・版に対応するメーカーの説明書を参照してください。',
  ],
  [
    '適用するファームウェア、配布パッケージ、音声フォルダーの条件が未確認のため、ダウンロード、削除・コピー、更新操作と関連画面の案内を保留しています。確認が取れるまで、この箇所を根拠に機器を設定・接続しないでください。',
    'ファイルのダウンロード・削除・コピーや更新を行う前に、お使いの機器の版に対応するメーカーの配布パッケージと説明書を参照してください。',
  ],
  [
    '使用するファームウェアと音声フォルダーの対応関係が未確認のため、USB接続、コピー先の指定と関連画面の案内を保留しています。確認が取れるまで、この箇所を根拠に機器を設定・接続しないでください。',
    'USB接続して音声をコピーする前に、ファームウェアの版に対応するメーカーの説明書で接続とコピー先を確認してください。',
  ],
  [
    '前節の音声ファイル操作に依存するため、終了・音声選択操作と関連画面の案内を保留しています。確認が取れるまで、この箇所を根拠に機器を設定・接続しないでください。',
    '音声ファイルのコピー、USBモードの終了、音声選択は、お使いの機器に対応するメーカーの説明書に従ってください。',
  ],
]);

const publicCopy = new Map([
  [
    '受信機の版・製造日による適用条件の確認待ちです。',
    '受信機の版・製造日によって異なります。',
  ],
  ['原典の項目名・単位の対応を確認中', '—'],
  ['原典に単位の記載がないため確認中', '—'],
  [
    '2.4インチ、320 × 240ピクセル（色数は原典確認中）',
    '2.4インチ、320 × 240ピクセル',
  ],
  [
    '訂正前の日本語PDFは、このページでの配布を保留しています。',
    '訂正前の日本語PDFの代わりに、このページの説明をご利用ください。',
  ],
  [
    'バインドボタンの「in one second」は押下時間の表現が曖昧。1秒間という暫定訳とし実機未確認。',
    '原典の「in one second」だけでは、バインドボタンの押下時間を特定できません。受信機の取扱説明書に従ってください。',
  ],
  [
    'バインド操作の原文「press the binding button in one second」は押下時間／タイミングが曖昧です。暫定訳では「1秒以内に」を保持しました。モーターを制御する受信機操作のため、正式な押下条件の確認まで該当手順をHOLDします。',
    '原典ではバインドボタンの押下時間とタイミングを特定できません。この説明だけで受信機を操作せず、対応機器のメーカー説明書を参照してください。',
  ],
  ['アーム（実行保留）', 'この説明書にアーム操作の手順は掲載していません。'],
  [
    'Gensace B6の概要（原典本文見出し）。ただし同頁に掲載された画像は「IMARS mini」と表示された別機種の充電器です。画像がGensace B6を示すとは扱わず、製品同定と使用説明への適合確認まで図版を保留します。',
    '原典の充電器写真と製品名は一致しません。使用中の充電器の型番を確かめ、対応するメーカー説明書を参照してください。',
  ],
  [
    '「servo anti-shake rudder」の具体的機能は不明。原文の範囲で暫定訳。',
    '原典は「servo anti-shake rudder」の詳しい動作を説明していません。',
  ],
  [
    '原典の感度調整ボタン表記はDec(-)とInc(-)です。Incの符号を推測で訂正せず原表記を保持しています。実機表示は未確認です。',
    '原典の感度調整ボタン表記はDec(-)とInc(-)です。',
  ],
  [
    'FCC915は原典記載の周波数帯です。日本国内での使用可否は未確認です。',
    'FCC915は原典記載の周波数帯です。国内で使用する前に、お使いの機器が日本の電波法令に適合することを確かめてください。',
  ],
  [
    '文書版・発行日・対象SU04 Revisionは不明です。写真のMini Pix V1.0や基板上の版表示をSU04の文書版として確定しません。写真SR05とSU04との製品Identity未確認は、別項目su04-ri08のHOLDとして扱います。',
    '原典にはSU04と異なる名称の製品写真が含まれています。接続前に実機の型番を確かめ、対応するメーカー説明書を参照してください。',
  ],
  [
    '自動タイミング進角：モーターの進角を動的に調整します。原典は適用例を「racing/flower flying」と記載しています（意味確認待ち）。',
    '自動タイミング進角：モーターの進角を動的に調整します。原典の適用例「racing/flower flying」だけでは対象を特定できません。',
  ],
  [
    'サブIDの原典画面にはFHSS V2.1が表示されていますが、この図はサブID表示の説明用です。確認待ちのプロトコルやチャンネル数を推奨・確定する根拠にはしないでください。',
    'この原典図はサブID表示の例です。画面上のFHSS V2.1の表記から、対応プロトコルやチャンネル数を判断しないでください。',
  ],
  [
    'サブIDの画面にはFHSS V2.1と表示されていますが、原典のサブID表示例として保持しています。確認待ちのプロトコルや利用可能チャンネル数を確定する根拠にしないでください。',
    'この原典図はサブID表示の例です。画面上のFHSS V2.1の表記から、対応プロトコルや利用可能チャンネル数を判断しないでください。',
  ],
  [
    '原典表記：0.25hz～10mhzの範囲で設定可能（周波数単位の表記は確認待ち）',
    '原典表記：0.25hz～10mhz（設定には使用しないでください）',
  ],
  [
    '原典のTime Pulseは0.25hz～10mhzと小文字で記載されています。MHz／mHzへの読み替えを推測で確定せず、原表記を保持しています。周波数単位は確認待ちのため、この値を機器設定へ転用しないでください。本書の基地局・移動局の設定手順では、このタイムパルス値を使用していません。',
    '原典のTime Pulseは「0.25hz～10mhz」と記されており、周波数単位を特定できません。この値を機器設定に使用しないでください。本書の基地局・移動局の設定手順では、この値を使用しません。',
  ],
  [
    '原典の概要では「Acrobat Mode」、操作説明では「Gyro Mode」と表記されています。両者の対応関係は確認保留です。',
    '原典の概要では「Acrobat Mode」、操作説明では「Gyro Mode」と表記されており、両者が同じモードかどうかは原典から判断できません。',
  ],
  [
    '電源仕様「4.8-15.0V」と「2-4S LiPO」の整合、および対応受信機のR8EF重複は未確認です。使用電源は実機の表示とメーカーのV2資料で確認してください。',
    '原典には電源仕様として「4.8-15.0V」と「2-4S LiPO」が併記され、対応受信機の一覧ではR8EFが重複しています。使用電源は実機の表示とメーカーのV2資料で確認してください。',
  ],
  [
    '末尾の電源投入順序は安全上の確認が必要です。送信機をOFFにして受信機をONにする記述を、そのまま実行しないでください。「R6GF」とR6FGの表記、受信機図のV2表記と組合せの適用範囲も未確認です。',
    '送信機をOFFにして受信機をONにするという原典の記述を、そのまま実行しないでください。原典の「R6GF」とR6FGの表記や受信機図のV2表記だけでは、適用する機器の組み合わせを特定できません。',
  ],
  [
    '原文の画面名「ARARM」とALARMの対応は未確認です。実機の表示を確認してください。',
    '原典の画面名は「ARARM」です。実機の表示を確認してください。',
  ],
  [
    '原文の画面名「ARARM」とALARMの対応は未確認です。テレメトリーの対応条件は旧記事の記載を保持しています。',
    '原典の画面名は「ARARM」です。テレメトリーを使う際は、お使いの機器の表示と対応条件を確認してください。',
  ],
  [
    '低電圧警告後の「4分以内」は保証時間ではありません。記載の根拠は未確認です。',
    '低電圧警告後に「4分以内」使用できることを保証する記述ではありません。',
  ],
  [
    '原文の「EAP」と「EPA」、4C-UP/DWNの説明、ボタン「終了」の実機表記は未確認です。',
    '原典には「EAP」と「EPA」の表記があります。4C-UP/DWNの設定や終了操作は実機の表示と対応するメーカー資料を参照してください。',
  ],
  [
    '設定項目「MODEL」と図の「MODE」、5種類のカーブの説明、およびボタン「終了」の実機表記は未確認です。',
    '原典の設定項目は「MODEL」、図は「MODE」と表記されています。カーブの選択と終了操作は実機の表示と対応するメーカー資料を参照してください。',
  ],
  [
    'STMの手順で設定項目「ABP」が指定されています。STMとABPの対応は未確認です。',
    '原典のSTM手順では設定項目として「ABP」を挙げていますが、両者の対応は説明されていません。',
  ],
  [
    'ACCELの本文見出しが「スロットルスピード」となっています。機能名の対応は未確認です。',
    'ACCELの原典見出しは「スロットルスピード」です。設定時は実機の表示を確認してください。',
  ],
  [
    '原文のUI名「Streering D/R」の実機表記は未確認です。推測で画面名を変更していません。',
    '原典では画面名を「Streering D/R」と表記しています。設定時は実機の表示を確認してください。',
  ],
  [
    '原文の「3チャンネルおよび3チャンネル」、ch4とCH4の表記、スイッチ/ボリュームの対応は未確認です。推測で番号やUI表記を修正していません。',
    '原典には「3チャンネルおよび3チャンネル」とあり、ch4とCH4の両方が表記されています。スイッチやボリュームの割り当ては実機の表示を確認してください。',
  ],
  [
    'バッテリー種類の説明（LiFe、Ni-MH）とMODEの表示（Li2S、Li3、Ni4S）の対応は未確認です。使用電源は実機とメーカーのV2資料で確認してください。',
    '原典のバッテリー種類の説明（LiFe、Ni-MH）とMODEの表示（Li2S、Li3、Ni4S）だけでは、対応関係を特定できません。使用電源は実機とメーカーのV2資料で確認してください。',
  ],
  [
    '::: note\n注：この「離すと直ちにブレーキがかかる」という説明は本節の原文を保持しています。一方、2.4.3と2.5.2の原文はForward 100: Brake 0ではブレーキ側が動作しないと説明しています。これらの記載を同じ動作条件とみなせるかは未確認で、ブレーキの動作をこの記載だけで保証することはできません。\n:::',
    '注：本節の原典では「離すと直ちにブレーキがかかる」と説明する一方、2.4.3と2.5.2ではForward 100: Brake 0ではブレーキ側が動作しないと説明しています。ブレーキの動作を本節の記載だけで判断しないでください。',
  ],
]);

const textNode = (value) => ({ type: 'text', value });
const paragraph = (value) => ({
  type: 'element',
  tagName: 'p',
  properties: {},
  children: [textNode(value)],
});
const normalizedText = (node, ctx) =>
  ctx.textContent(node).replaceAll('\r\n', '\n').trim();

export function readerManualCopy(text) {
  return publicCopy.get(text) ?? text;
}

function withheldTableCell(node, ctx) {
  if (node.value === '"確認待ち"' && ctx.parent(node)?.name === 'td')
    ctx.replaceNode(node, textNode('—'));
}

export function manualPublicCopy() {
  return ({ fileURL }) => {
    if (!fileURL.pathname.includes('/src/content/docs/manuals/')) return;
    return {
      name: 'manual-public-copy',
      mdxTextExpression: withheldTableCell,
      mdxFlowExpression: withheldTableCell,
      element: [
        {
          filter: ['aside'],
          visit(node, ctx) {
            const title =
              node.properties?.ariaLabel ?? node.properties?.['aria-label'];
            if (!noticeHeadings.has(title)) return;
            const titleNode = node.children.find(
              (child) => child.tagName === 'p',
            );
            const content = node.children.find(
              (child) => child.tagName === 'div',
            );
            if (!titleNode || !content)
              throw new Error('Invalid manual safety notice');
            const text = readerNotices.get(normalizedText(content, ctx));
            if (!text) {
              throw new Error(
                'Manual review note requires a reader-facing safety notice',
              );
            }
            ctx.setProperty(node, 'aria-label', '安全上の注意');
            for (const child of titleNode.children)
              if (child.type === 'text') ctx.removeNode(child);
            ctx.appendChild(titleNode, textNode('安全上の注意'));
            for (const child of content.children) ctx.removeNode(child);
            ctx.appendChild(content, paragraph(text));
          },
        },
        {
          filter: ['p', 'td'],
          visit(node, ctx) {
            const text = publicCopy.get(normalizedText(node, ctx));
            if (text === undefined) return;
            for (const child of node.children) ctx.removeNode(child);
            ctx.appendChild(node, textNode(text));
          },
        },
      ],
    };
  };
}

const internalLabel =
  /\b(?:REVIEW_REQUIRED|WEB_HOLD|SECTION_HOLD|QA_REQUIRED|PASS_RENDERED_SCOPE|BLOCKED_EXTERNAL)\b|原典確認待ち|確認待ちの手順について|QA待ち|独立レビュー待ち|内部監査|制作メモ|実機未確認|適合確認まで図版を保留|別項目su04-ri08|原典確認中|項目名・単位の対応を確認中|暫定訳|推測で画面名を変更していません|推測で番号やUI表記を修正していません|旧記事の記載を保持しています|記載の根拠は未確認です/;

export function assertPublicManualCopy(html, name) {
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
  const leak = text.match(internalLabel) ?? html.match(/>確認待ち<\/td>/);
  if (leak) throw new Error(`Internal manual copy in ${name}: ${leak[0]}`);
}

export async function verifyBuiltManualCopy(directory) {
  const manuals = join(directory, 'manuals');
  for (const file of await readdir(manuals, { recursive: true })) {
    if (!file.endsWith('.html')) continue;
    assertPublicManualCopy(await readFile(join(manuals, file), 'utf8'), file);
  }
}
