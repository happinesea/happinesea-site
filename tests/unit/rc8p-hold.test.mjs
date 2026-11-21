import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (name) =>
  readFileSync(`src/content/docs/manuals/rc8p/${name}.mdx`, 'utf8');
const section = (text, id) =>
  text
    .split(`<span id="section-${id}"></span>`)[1]
    ?.split('<span id="section-')[0];

test('RC8P unresolved receiver, fail-safe and update operations remain withheld', () => {
  const receiver = read('chapter-01');
  const settings = read('chapter-02');
  for (const id of ['1.3.1', '1.3.2', '1.3.4', '1.3.5', '1.3.7']) {
    assert.match(section(receiver, id), /:::caution\[原典確認待ち\]/);
    assert.doesNotMatch(section(receiver, id), /<Manual(?:Figure|Video)/);
  }
  for (const id of ['2.5', '2.7', '2.8', '2.11', '2.15']) {
    assert.match(section(settings, id), /:::caution\[原典確認待ち\]/);
    assert.doesNotMatch(section(settings, id), /<ManualFigure/);
  }
  assert.doesNotMatch(settings, /CH8の左右を120|スロットル出力を停止|4096/);
  assert.match(section(settings, '2.11'), /制御不能に前進または後退/);
  assert.match(receiver, /入力電圧は5 Vを超えない/);
  assert.match(
    section(receiver, '1.3.5'),
    /電源投入時は自己チェックのためR8FGを動かさないでください/,
  );
  assert.match(receiver, /先に受信機と制御機器の電源を切り/);
  const firmware = read('chapter-03');
  assert.match(firmware, /:::caution\[原典確認待ち\]/);
  assert.match(firmware, /USB接続を外したり、RC8Pの電源を切ったりしない/);
  assert.doesNotMatch(
    firmware,
    /<ManualFigure|古いファームウェアを削除|最新パッケージをダウンロード/,
  );
  const sounds = read('chapter-04');
  assert.match(sounds, /WAV形式/);
  assert.match(sounds, /Include markers and other metadata/);
  assert.doesNotMatch(
    sounds,
    /フォルダーへコピーします|<ManualFigure[\s\S]*figureId="RC8P-P031/,
  );
  for (const name of [
    'index',
    'chapter-01',
    'chapter-02',
    'chapter-03',
    'chapter-04',
    'back-matter',
  ]) {
    assert.match(read(name), /^status: manufacturer_review$/m);
    assert.match(read(name), /noindex, nofollow/);
  }
});
