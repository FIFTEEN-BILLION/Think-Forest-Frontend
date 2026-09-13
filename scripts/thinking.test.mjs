import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

// Same in-memory loader as village.test.mjs: compile the pure domain modules only.
const root = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../packages/app/src/features/village',
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
const learning = load(resolve(root, 'lib/learning.ts'));
const storage = load(resolve(root, 'lib/storage.ts'));
const thinking = load(resolve(root, 'lib/thinking.ts'));
const { initialData } = load(resolve(root, 'data/mock.ts'));
const { createDraft, transition, toRecord, readyToComplete, gateSize } = learning;

// Build v2 drafts directly so these tests do not depend on createDraft's default version.
function thinkingDraft(min) {
  const d = createDraft('lab', 'first-inquiry', min);
  delete d.inquiry;
  d.thinking = thinking.emptyThinking();
  return d;
}

const BASE = { lightHeight: 'mid', stickHeight: 'short', distance: 'near', brightness: 'dim' };
// Mirrors backend L = d × h / (H − h).
const V = { low: 4, mid: 6, high: 9, short: 1, tall: 2, near: 2, far: 4 };
const len = (s) => (V[s.distance] * V[s.stickHeight]) / (V[s.lightHeight] - V[s.stickHeight]);

function send(draft, event) {
  const result = transition(draft, event);
  assert.equal(result.error, undefined, result.error);
  return result.draft;
}
const next = (d) => send(d, { type: 'advance' });
function experiment(d, change, prediction = 'same') {
  const compare = { ...BASE, ...change };
  const id = `exp-${d.thinking.experiments.length}`;
  d = send(d, {
    type: 'think-experiment',
    id,
    compare,
    prediction,
    baseLength: len(BASE),
    compareLength: len(compare),
  });
  return send(d, { type: 'think-observe', id });
}
function atFriend() {
  let d = thinkingDraft(15);
  d = send(d, { type: 'think-predict', prediction: 'shorter' });
  d = send(d, { type: 'think-reason', value: '한낮에 그림자가 작았어.', origin: 'example' });
  d = send(d, { type: 'think-confidence', when: 'before', value: 2 });
  d = next(d);
  d = send(d, {
    type: 'think-interpret',
    claims: [{ variable: 'lightHeight', effect: 'shorter' }],
    restatement: '빛을 높이면 그림자가 짧아질 거라고 생각했구나.',
    friendBeliefId: 'brightness_longer',
    friendLine: '나는 빛이 밝으면 그림자가 길어진다고 생각해!',
    friendVariable: 'brightness',
    source: 'fallback',
  });
  return send(d, { type: 'think-restatement', confirmed: true });
}
function atTeach() {
  let d = next(atFriend());
  d = experiment(d, { brightness: 'bright' });
  d = experiment(d, { lightHeight: 'high' }, 'shorter');
  return next(d);
}
const exchange = (convinced, cardIds = ['exp-0']) => ({
  message: '밝기만 바꿨는데 그림자 길이가 똑같았어!',
  cardIds,
  convinced,
  helpLevel: convinced ? null : 'probe',
  reply: convinced ? '생각을 바꿀게!' : '어떤 카드에서 봤어?',
  source: 'fallback',
});
function completed() {
  let d = atTeach();
  d = send(d, { type: 'think-teach', exchange: exchange(false, []) });
  d = send(d, { type: 'think-teach', exchange: exchange(true) });
  d = send(d, { type: 'think-judge', judgment: 'keep' });
  d = send(d, { type: 'think-final', field: 'finalReason', value: '빛만 높였더니 짧아졌어.' });
  d = send(d, { type: 'think-confidence', when: 'after', value: 3 });
  d = send(d, {
    type: 'think-challenge',
    challenge: {
      id: 'tall_stick',
      line: '막대기만 크게 바꾸면, 그림자는 그대로일 거야.',
      base: BASE,
      compare: { ...BASE, stickHeight: 'tall' },
      baseLength: 0.4,
      compareLength: 1,
      friendPrediction: 'same',
      confounded: false,
      friendCorrect: false,
      source: 'fallback',
    },
    finalClaims: [{ variable: 'lightHeight', effect: 'shorter' }],
  });
  d = send(d, { type: 'think-challenge-judge', judgment: 'disagree' });
  d = send(d, { type: 'think-challenge-observe' });
  return next(d);
}

test('thinking drafts need no minimum length but still need a prediction and confidence', () => {
  let d = thinkingDraft(25);
  assert.equal(d.thinking.version, 2);
  assert.equal(d.inquiry, undefined);
  assert.ok(transition(d, { type: 'advance' }).error);
  d = send(d, { type: 'think-predict', prediction: 'unknown' });
  d = send(d, { type: 'think-skip-reason', skipped: true });
  assert.ok(transition(d, { type: 'advance' }).error, 'confidence is still required');
  d = send(d, { type: 'think-confidence', when: 'before', value: 1 });
  assert.equal(next(d).step, 1);
});

test('the friend speaks only after the child commits, and going back clears the friend', () => {
  let d = thinkingDraft(15);
  d = send(d, {
    type: 'think-interpret',
    claims: [],
    restatement: 'x',
    friendBeliefId: 'brightness_longer',
    friendLine: 'bypass',
    friendVariable: 'brightness',
    source: 'ai',
  });
  assert.equal(d.thinking.friendLine, '');
  d = atFriend();
  assert.equal(d.thinking.friendLine.length > 0, true);
  d = send(d, { type: 'think-back' });
  assert.equal(d.step, 0);
  assert.equal(d.thinking.friendLine, '');
  assert.equal(d.thinking.prediction, 'shorter');
});

test('confounded designs get an escalating help ladder and do not satisfy the fair tests', () => {
  let d = next(atFriend());
  d = experiment(d, { brightness: 'bright', lightHeight: 'high' });
  assert.equal(d.thinking.experiments[0].feedback, 'probe');
  d = experiment(d, { brightness: 'bright', stickHeight: 'tall' });
  assert.equal(d.thinking.experiments[1].feedback, 'hint');
  assert.match(transition(d, { type: 'advance' }).error, /빛의 밝기만/);
  d = experiment(d, { brightness: 'bright' });
  assert.equal(d.thinking.experiments[2].feedback, null);
  assert.match(transition(d, { type: 'advance' }).error, /빛의 높이만/);
  d = experiment(d, { lightHeight: 'low' }, 'longer');
  assert.equal(next(d).step, 3);
});

test('an unobserved experiment blocks new designs and nothing can be added without a change', () => {
  let d = next(atFriend());
  assert.ok(
    transition(d, {
      type: 'think-experiment',
      id: 'a',
      compare: BASE,
      prediction: 'same',
      baseLength: 0.4,
      compareLength: 0.4,
    }).error,
  );
  d = send(d, {
    type: 'think-experiment',
    id: 'a',
    compare: { ...BASE, distance: 'far' },
    prediction: 'longer',
    baseLength: 0.4,
    compareLength: 0.8,
  });
  const blocked = transition(d, {
    type: 'think-experiment',
    id: 'b',
    compare: { ...BASE, brightness: 'bright' },
    prediction: 'same',
    baseLength: 0.4,
    compareLength: 0.4,
  });
  assert.ok(blocked.error);
  assert.equal(blocked.draft, d);
});

test('teaching needs observed cards; three failed attempts open the next part', () => {
  let d = atTeach();
  assert.ok(transition(d, { type: 'think-teach', exchange: exchange(false, ['nope']) }).error);
  assert.ok(
    transition(d, { type: 'think-judge', judgment: 'change' }).draft.thinking.judgment === null,
  );
  for (let i = 0; i < 3; i++) d = send(d, { type: 'think-teach', exchange: exchange(false) });
  assert.equal(thinking.teachDone(d.thinking), true);
  d = send(d, { type: 'think-judge', judgment: 'change' });
  assert.equal(d.thinking.judgment, 'change');
  const skills = thinking.deriveSkills(d.thinking);
  assert.equal(skills.find((s) => s.skill === 'evidence').level, 'notShown');
});

test('completion stores thinking skills without any score and survives storage', () => {
  const d = completed();
  assert.equal(d.step, 4);
  assert.ok(readyToComplete(d));
  const record = toRecord(d);
  assert.equal(record.rubric, undefined);
  const level = Object.fromEntries(record.thinking.skills.map((s) => [s.skill, s.level]));
  assert.deepEqual(level, {
    predict: 'independent',
    fairTest: 'independent',
    evidence: 'afterProbe',
    revise: 'independent',
    transfer: 'independent',
  });
  const data = initialData(false);
  data.resume = d;
  data.sessions = [record];
  const restored = storage.decode(JSON.stringify(data));
  assert.deepEqual(restored.resume.thinking, d.thinking);
  assert.deepEqual(restored.sessions[0].thinking, record.thinking);
  data.sessions = [{ ...record, rubric: { observe: 1, reason: 1, express: 1 } }];
  data.resume = { ...d, thinking: { ...d.thinking, origin: 'child' } };
  const rejected = storage.decode(JSON.stringify(data));
  assert.equal(rejected.sessions.length, 0, 'a scored thinking record is malformed');
  assert.equal(rejected.resume, null, 'child origin is not accepted in storage');
});

test('thinking records never tune the writing gate', () => {
  const data = initialData(false);
  data.settings.autoTune = true;
  data.settings.gate = '보통';
  data.sessions = [toRecord(completed())];
  assert.equal(gateSize(data), 15);
});

test('confounded challenge accepts "cannot tell" or "disagree" but not "agree"', () => {
  const ch = { confounded: true, friendCorrect: false, judgment: 'unsure' };
  assert.equal(thinking.challengeCorrect(ch), true);
  assert.equal(thinking.challengeCorrect({ ...ch, judgment: 'agree' }), false);
  assert.equal(
    thinking.challengeCorrect({ ...ch, confounded: false, friendCorrect: true, judgment: 'agree' }),
    true,
  );
});
