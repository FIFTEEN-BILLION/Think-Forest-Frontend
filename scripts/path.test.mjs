import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

// Same in-memory loader as thinking.test.mjs: compile the pure domain modules only.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/app/src');
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
const path = load(resolve(root, 'lib/path.ts'));
const { FIRST_MAP } = load(resolve(root, 'data/pathMaps.ts'));
const learning = load(resolve(root, 'lib/learning.ts'));
const storage = load(resolve(root, 'lib/storage.ts'));
const { initialData } = load(resolve(root, 'data/mock.ts'));

const leaf = (op, extra = {}) => ({ op, count: null, until: null, dir: null, ...extra });
const step = (op, extra = {}) => ({
  ...leaf(op),
  sensor: null,
  state: null,
  then: [],
  else: [],
  body: [],
  ...extra,
});
const straight = step('move', { until: 'blocked' });
const right = step('turn', { dir: 'right' });
const left = step('turn', { dir: 'left' });
const forward = (count) => step('move', { count });
// "쭉 가서 오른쪽으로 돌아서 쭉 가"
const SEQUENCE = [straight, right, straight];
// "우체국 갈 때까지: 앞이 막히면 오른쪽으로 돌고, 아니면 한 칸 가"
const LOOP = [
  step('repeat', {
    body: [
      {
        ...step('if', { sensor: 'front', state: 'blocked' }),
        body: undefined,
        then: [leaf('turn', { dir: 'right' })],
        else: [leaf('move', { count: 1 })],
      },
    ],
  }),
];

function send(draft, event) {
  const result = learning.transition(draft, event);
  assert.equal(result.error, undefined, result.error);
  return result.draft;
}
const turn = (text, kind = 'program') => ({
  id: `t-${text}`,
  text,
  origin: 'example',
  kind,
  heard: [],
  tikiLine: '알겠어!',
  source: 'fallback',
  clarify: null,
  chosen: null,
});
const react = (runId, challenge = null) => ({
  type: 'path-react',
  runId,
  tikiLine: '티키 반응',
  question: null,
  source: 'fallback',
  challenge,
});

test('티키 does exactly what it is told: splash, bump, end or arrive', () => {
  assert.ok(path.hasPath(FIRST_MAP));
  assert.equal(path.runProgram(FIRST_MAP, SEQUENCE).outcome, 'arrived');
  const splash = path.runProgram(FIRST_MAP, [forward(3)]);
  assert.equal(splash.outcome, 'splashed');
  assert.deepEqual(splash.cells, [22, 17, 12, 7]);
  assert.equal(splash.stopLabel, '1번째 말: 앞으로 3칸');
  assert.equal(path.runProgram(FIRST_MAP, [left, forward(3)]).outcome, 'bumped');
  const ended = path.runProgram(FIRST_MAP, [straight]);
  assert.equal(ended.outcome, 'ended');
  assert.equal(ended.stopCell, 12);
  assert.equal(path.runProgram(FIRST_MAP, [forward(2), right, forward(2)]).outcome, 'arrived');
});

test('conditions and repeat use what 티키 senses, with loop and stop guards', () => {
  assert.equal(path.runProgram(FIRST_MAP, LOOP).outcome, 'arrived');
  const spin = [step('repeat', { body: [step('turn', { dir: 'right' })] })];
  assert.equal(path.runProgram(FIRST_MAP, spin).outcome, 'loop');
  assert.equal(path.runProgram(FIRST_MAP, [step('stop'), straight]).outcome, 'ended');
});

test('program validation and normalisation', () => {
  assert.ok(path.isProgram(SEQUENCE));
  assert.ok(path.isProgram(LOOP));
  assert.equal(path.isProgram([step('turn')]), false);
  assert.equal(path.isProgram(Array(9).fill(straight)), false);
  assert.equal(path.isProgram([step('if', { sensor: 'up', state: 'open' })]), false);
  const partial = [{ op: 'move', count: 2 }];
  assert.ok(path.isProgram(partial));
  assert.deepEqual(path.normalizeProgram(partial)[0], forward(2));
  assert.match(
    path.programText(LOOP),
    /우체국에 갈 때까지 반복: 만약 앞이 막혀 있으면 오른쪽으로 돌기, 아니면 앞으로 1칸/,
  );
});

test('challenge candidates always keep a road and beat the current words', () => {
  const found = path.challengeCandidates(FIRST_MAP, SEQUENCE, [FIRST_MAP]);
  assert.ok(found.length >= 1 && found.length <= 4);
  for (const c of found) {
    assert.ok(path.hasPath(c.map), c.id);
    assert.notEqual(path.runProgram(c.map, SEQUENCE).outcome, 'arrived');
    assert.ok(c.summary.length <= 60);
  }
  const again = path.challengeCandidates(FIRST_MAP, SEQUENCE, [FIRST_MAP, found[0].map]);
  assert.ok(again.every((c) => c.id !== found[0].id));
});

function play() {
  let d = learning.createDraft('lab', 'path-teaching', 15);
  assert.ok(d.path);
  assert.equal(learning.guard(d), '티키를 우체국까지 한 번 보내 보자.');
  assert.ok(learning.transition(d, { type: 'path-run' }).error);
  d = send(d, { type: 'path-teach', turn: turn('앞으로 세 칸 가'), program: [forward(3)] });
  d = send(d, { type: 'path-predict', cell: 7 });
  d = send(d, { type: 'path-run' });
  assert.equal(d.path.runs[0].outcome, 'splashed');
  assert.equal(d.path.runs[0].predicted, 7);
  d = send(d, react('run-0'));
  d = send(d, { type: 'path-help' });
  d = send(d, {
    type: 'path-teach',
    turn: turn('쭉 가서 오른쪽으로 돌아서 쭉 가'),
    program: SEQUENCE,
  });
  d = send(d, { type: 'path-run' });
  assert.equal(d.path.runs[1].outcome, 'arrived');
  assert.equal(d.path.awaitingChallenge, true);
  assert.equal(learning.guard(d), '티키가 도전 지도를 고르고 있어.');
  const [candidate] = path.challengeCandidates(FIRST_MAP, SEQUENCE, d.path.maps);
  d = send(d, react('run-1', { map: candidate.map, line: '이번엔 이 지도야!' }));
  assert.equal(path.currentMap(d.path).id, candidate.map.id);
  assert.equal(learning.guard(d), null);
  return d;
}

test('talk, run, fix and take 티키의 도전 — skills come from events, never scores', () => {
  let d = play();
  const challengeMap = path.currentMap(d.path);
  const won = path.runProgram(challengeMap, LOOP).outcome === 'arrived';
  d = send(d, {
    type: 'path-teach',
    turn: turn('막히면 오른쪽으로 돌고 아니면 가'),
    program: LOOP,
  });
  d = send(d, { type: 'path-run' });
  d = send(d, { type: 'advance' });
  assert.equal(d.step, 1);
  assert.ok(learning.readyToComplete(d));
  const record = learning.toRecord(d);
  assert.equal(record.rubric, undefined);
  const skills = Object.fromEntries(record.path.skills.map((s) => [s.skill, s.level]));
  assert.equal(skills.predict, 'independent');
  assert.equal(skills.revise, 'afterProbe');
  assert.equal(skills.precise, 'afterProbe');
  assert.equal(skills.challenge, won ? 'independent' : 'notShown');
  assert.ok(record.path.skills.every((s) => !('score' in s)));
  assert.equal(record.answers[0].text, '앞으로 세 칸 가');
});

test('clarify choices set the program and count as precise words', () => {
  let d = learning.createDraft('lab', 'path-teaching', 15);
  const ask = {
    ...turn('우체국으로 가', 'clarify'),
    clarify: {
      question: '어떻게 갈까?',
      options: [
        { label: '쭉 앞으로', program: [straight] },
        { label: '오른쪽부터', program: [right, straight] },
      ],
    },
  };
  d = send(d, { type: 'path-teach', turn: ask, program: null });
  assert.equal(d.path.program.length, 0);
  d = send(d, { type: 'path-clarify', turnId: ask.id, label: '쭉 앞으로', program: [straight] });
  assert.equal(d.path.program.length, 1);
  const precise = path.derivePathSkills(d.path).find((s) => s.skill === 'precise');
  assert.equal(precise.level, 'independent');
});

test('no challenge left finishes the mission; drafts and records survive storage', () => {
  let d = learning.createDraft('lab', 'path-teaching', 15);
  d = send(d, { type: 'path-teach', turn: turn('반복'), program: LOOP });
  d = send(d, { type: 'path-run' });
  d = send(d, react('run-0'));
  assert.equal(d.path.noChallengeLeft, true);
  assert.ok(path.finished(d.path));
  assert.ok(learning.transition(d, { type: 'path-run' }).draft.path.runs.length === 1);
  const data = { ...initialData(), resume: d };
  const decoded = storage.decode(JSON.stringify(data));
  assert.equal(decoded.resume?.path?.runs.length, 1);
  d = send(d, { type: 'advance' });
  const record = learning.toRecord(d);
  assert.equal(record.path.skills.find((s) => s.skill === 'generalize').level, 'independent');
  assert.ok(storage.isSession(record));
  assert.equal(
    storage.isSession({ ...record, rubric: { observe: 1, reason: 1, express: 1 } }),
    false,
  );
  const honey = learning.createDraft('forest', 'honey', 15);
  assert.equal(storage.isDraft({ ...honey, path: d.path }), false);
  assert.ok(storage.isDraft(honey));
});
