import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(
  readFileSync(new URL('../packages/app/src/audio/voiceCapture.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const module = { exports: {} };
new Function('module', 'exports', source)(module, module.exports);
const { createSpeechEndDetector } = module.exports;
const audio = (ms, level = 0) => new Float32Array(ms * 16).fill(level);

test('speech stops after 1.5 seconds of silence, once only', () => {
  const detect = createSpeechEndDetector();
  assert.equal(detect(audio(500, 0.1)), null);
  assert.equal(detect(audio(1490)), null);
  assert.equal(detect(audio(10)), 'silence');
  assert.equal(detect(audio(1000)), null);
});
test('natural pauses and quiet microphone noise do not end speech early', () => {
  const detect = createSpeechEndDetector();
  assert.equal(detect(audio(7000, 0.002)), null);
  assert.equal(detect(audio(400, 0.08)), null);
  assert.equal(detect(audio(1200, 0.002)), null);
  assert.equal(detect(audio(600, 0.08)), null);
  assert.equal(detect(audio(1400)), null);
  assert.equal(detect(audio(100)), 'silence');
});
test('empty microphone and short clicks stop without uploading empty speech', () => {
  const detect = createSpeechEndDetector();
  assert.equal(detect(audio(50, 0.1)), null);
  assert.equal(detect(audio(7950)), 'no-speech');
});
test('continuous sound is capped and empty frames do not change state', () => {
  const detect = createSpeechEndDetector();
  assert.equal(detect(audio(0)), null);
  assert.equal(detect(audio(58000, 0.1)), null);
  assert.equal(detect(audio(1000, 0.1)), 'limit');
});
