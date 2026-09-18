import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

// v1.test.mjs 와 같은 메모리 로더. 음성의 순수 모듈(PCM 변환, WS 상태 기계)만 컴파일한다.
const root = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../packages/app/src/features/village/voice',
);
const cache = new Map();
function load(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const require = (id) =>
    id.startsWith('.') ? load(resolve(dirname(path), `${id}.ts`)) : createRequire(path)(id);
  new Function('require', 'module', 'exports', source)(require, module, module.exports);
  return module.exports;
}
const pcm = load(resolve(root, 'pcm.ts'));
const protocol = load(resolve(root, 'protocol.ts'));

// ---------- PCM 변환 ----------

test('48kHz 를 16kHz 로 내리면 표본 수가 3분의 1이 된다', () => {
  const resampler = pcm.createResampler(48000);
  const input = new Float32Array(4800); // 0.1초
  const out = resampler.process(input);
  // 블록 끝 한 표본은 다음 블록의 보간 짝으로 남긴다.
  assert.ok(Math.abs(out.length - 1600) <= 1, `got ${out.length}`);
});

test('블록을 나눠 넣어도 전체 표본 수가 유지된다(경계에서 잃지 않는다)', () => {
  const whole = pcm.createResampler(44100);
  const split = pcm.createResampler(44100);
  const input = new Float32Array(44100);
  for (let i = 0; i < input.length; i += 1) input[i] = Math.sin(i / 20);
  const once = whole.process(input).length;
  let piecewise = 0;
  for (let offset = 0; offset < input.length; offset += 1024)
    piecewise += split.process(input.subarray(offset, offset + 1024)).length;
  assert.equal(piecewise, once);
});

test('선형 보간이 가운데 값을 만든다', () => {
  const resampler = pcm.createResampler(32000); // ratio 2
  const out = resampler.process(new Float32Array([0, 1, 0, 1, 0, 1]));
  assert.equal(out[0], 0);
  assert.equal(out[1], 0);
  assert.equal(out[2], 0);
});

test('같은 표본율이면 값이 그대로 지나간다', () => {
  const resampler = pcm.createResampler(16000);
  const out = resampler.process(new Float32Array([0.5, -0.25, 0.75, 0]));
  assert.equal(out[0], 0.5);
  assert.ok(Math.abs((out[1] ?? 0) + 0.25) < 1e-6);
});

test('s16le 로 부호화하고 범위를 넘는 값은 잘라 낸다', () => {
  const buffer = pcm.encodePcm16(new Float32Array([0, 1, -1, 2, -2, 0.5]));
  const view = new DataView(buffer);
  assert.equal(buffer.byteLength, 12);
  assert.equal(view.getInt16(0, true), 0);
  assert.equal(view.getInt16(2, true), 32767);
  assert.equal(view.getInt16(4, true), -32767);
  assert.equal(view.getInt16(6, true), 32767); // 2 → 1 로 자른다
  assert.equal(view.getInt16(8, true), -32767);
  assert.equal(view.getInt16(10, true), 16384);
  // little-endian 인지 바이트 순서로 확인한다(32767 = 0xFF 0x7F).
  assert.equal(new Uint8Array(buffer)[2], 0xff);
  assert.equal(new Uint8Array(buffer)[3], 0x7f);
});

test('조각 버퍼는 40ms(1280바이트)씩 내보내고 남은 꼬리는 flush 로 낸다', () => {
  const frames = pcm.createFrameBuffer();
  assert.equal(frames.push(new Float32Array(320)).length, 0);
  const out = frames.push(new Float32Array(1000));
  assert.equal(out.length, 2); // 1320 표본 → 640짜리 두 조각
  assert.equal(out[0].byteLength, 1280);
  assert.equal(pcm.pcmDurationMs(out[0].byteLength), 40);
  const tail = frames.flush();
  assert.equal(tail.length, 1);
  assert.equal(tail[0].byteLength, 80); // 남은 40 표본
  assert.equal(frames.flush().length, 0);
});

test('peakLevel 이 무음과 소리를 가른다', () => {
  assert.equal(pcm.peakLevel(new Float32Array(100)), 0);
  assert.ok(Math.abs(pcm.peakLevel(new Float32Array([0.01, -0.3, 0.2])) - 0.3) < 1e-6);
});

// ---------- WebSocket 규약 ----------

const { initialVoiceState, parseServerFrame, reduceVoice } = protocol;
const listening = () =>
  reduceVoice(reduceVoice(initialVoiceState, { type: 'PREPARE' }), { type: 'OPEN' });
const frame = (state, body) => reduceVoice(state, { type: 'FRAME', frame: parseServerFrame(body) });

test('서버 프레임을 읽고 모르는 모양은 버린다', () => {
  assert.equal(parseServerFrame('{"type":"NOPE"}'), null);
  assert.equal(parseServerFrame('not json'), null);
  assert.equal(parseServerFrame(new ArrayBuffer(4)), null);
  assert.deepEqual(parseServerFrame('{"type":"PARTIAL_TRANSCRIPT","sequence":3,"text":"가"}'), {
    type: 'PARTIAL_TRANSCRIPT',
    sequence: 3,
    text: '가',
    stablePrefix: '',
  });
});

test('PREPARE → OPEN → PARTIAL → STOP → FINAL 이 확정 문장으로 끝난다', () => {
  let state = listening();
  assert.equal(state.phase, 'listening');
  state = frame(
    state,
    '{"type":"PARTIAL_TRANSCRIPT","sequence":1,"text":"컵이","stablePrefix":"컵"}',
  );
  assert.equal(state.partial, '컵이');
  assert.equal(state.stablePrefix, '컵');
  state = reduceVoice(state, { type: 'STOP' });
  assert.equal(state.phase, 'finishing');
  state = frame(
    state,
    '{"type":"FINAL_TRANSCRIPT","streamId":"sts_1","text":" 컵이 차가워서요. ","confidence":0.9,"durationMs":1200}',
  );
  assert.equal(state.phase, 'done');
  assert.equal(state.finalText, '컵이 차가워서요.');
  assert.equal(state.partial, '', '확정된 뒤에는 자막을 지운다');
});

test('오래된 sequence 자막은 버린다', () => {
  let state = frame(listening(), '{"type":"PARTIAL_TRANSCRIPT","sequence":5,"text":"다섯"}');
  state = frame(state, '{"type":"PARTIAL_TRANSCRIPT","sequence":2,"text":"둘"}');
  assert.equal(state.partial, '다섯');
  state = frame(state, '{"type":"PARTIAL_TRANSCRIPT","sequence":6,"text":"여섯"}');
  assert.equal(state.partial, '여섯');
});

test('빈 FINAL 은 무음 오류로 본다', () => {
  const state = frame(listening(), '{"type":"FINAL_TRANSCRIPT","streamId":"s","text":"   "}');
  assert.equal(state.phase, 'error');
  assert.equal(state.errorCode, 'NO_SPEECH_DETECTED');
});

test('WARNING 은 듣기를 끊지 않고 안내만 바꾼다', () => {
  const state = frame(
    listening(),
    '{"type":"WARNING","code":"UTTERANCE_ENDING_SOON","retryable":true,"message":"곧 끝나요"}',
  );
  assert.equal(state.phase, 'listening');
  assert.equal(state.noticeKind, 'warning');
  assert.match(state.notice, /마무리/);
});

test('오류 코드마다 서로 다른 아이용 문장을 준다', () => {
  const codes = [
    'NO_SPEECH_DETECTED',
    'TICKET_INVALID',
    'UTTERANCE_TOO_LONG',
    'AI_TEMPORARILY_UNAVAILABLE',
    'STREAMING_UNAVAILABLE',
    'CONSENT_REQUIRED',
    'MIC_DENIED',
    'SILENT',
    'DISCONNECTED',
  ];
  const messages = codes.map((code) => protocol.voiceMessage(code));
  assert.equal(new Set(messages).size, codes.length, '메시지가 서로 겹치지 않아야 한다');
  messages.forEach((message) => assert.ok(message.length > 5));
  // 모르는 코드는 서버 문구를 쓰고, 그것도 없으면 글쓰기 안내로 떨어진다.
  assert.equal(protocol.voiceMessage('NEW_CODE', '서버가 준 말'), '서버가 준 말');
  assert.equal(protocol.voiceMessage('NEW_CODE'), protocol.VOICE_MESSAGES.TYPING_ONLY);
});

test('ERROR 프레임은 오류 상태로 끝내고 코드를 남긴다', () => {
  const state = frame(
    listening(),
    '{"type":"ERROR","code":"AI_TEMPORARILY_UNAVAILABLE","retryable":true,"message":"쉬는 중"}',
  );
  assert.equal(state.phase, 'error');
  assert.equal(state.errorCode, 'AI_TEMPORARILY_UNAVAILABLE');
  assert.ok(protocol.shouldRetryWithRecording(state.errorCode), '녹음 재시도로 이어져야 한다');
  assert.equal(protocol.shouldRetryWithRecording('CONSENT_REQUIRED'), false);
  assert.equal(protocol.shouldRetryWithRecording('NO_SPEECH_DETECTED'), false);
});

test('최종 문장을 받기 전에 끊기면 끊김 오류, 받은 뒤면 그대로 둔다', () => {
  assert.equal(reduceVoice(listening(), { type: 'CLOSED' }).errorCode, 'DISCONNECTED');
  const done = frame(listening(), '{"type":"FINAL_TRANSCRIPT","streamId":"s","text":"끝"}');
  assert.equal(reduceVoice(done, { type: 'CLOSED' }).phase, 'done');
});

test('끝난 뒤 늦게 온 프레임은 무시한다', () => {
  const done = frame(listening(), '{"type":"FINAL_TRANSCRIPT","streamId":"s","text":"끝"}');
  const late = frame(done, '{"type":"PARTIAL_TRANSCRIPT","sequence":99,"text":"늦은 자막"}');
  assert.equal(late.finalText, '끝');
  assert.equal(late.partial, '');
});

test('녹음 재시도 결과도 확정 문장으로 들어간다', () => {
  const state = reduceVoice(reduceVoice(listening(), { type: 'RECOVER' }), {
    type: 'RECOVERED',
    text: '녹음으로 들은 말',
  });
  assert.equal(state.phase, 'done');
  assert.equal(state.finalText, '녹음으로 들은 말');
});

test('접속권은 질의 문자열로 붙고 URL 로 안전하게 인코딩된다', () => {
  assert.equal(
    protocol.streamSocketUrl('wss://x/api/v1/speech/stream', 'stk_a+b/c'),
    'wss://x/api/v1/speech/stream?ticket=stk_a%2Bb%2Fc',
  );
  assert.equal(
    protocol.streamSocketUrl('wss://x/api/v1/speech/stream?trace=1', 'stk_1'),
    'wss://x/api/v1/speech/stream?trace=1&ticket=stk_1',
  );
});
