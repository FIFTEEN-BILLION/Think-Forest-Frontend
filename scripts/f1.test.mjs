import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

// Same in-memory loader as v1.test.mjs: compile the pure modules only (no React, no browser).
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
const { V1Error } = load(resolve(root, 'api/v1/client.ts'));
const { stepMissingReasons } = load(resolve(root, 'api/v1/endpoints.ts'));
const sync = load(resolve(root, 'features/village/components/ActivitySync.ts'));
const catalog = load(resolve(root, 'features/village/components/ActivityCatalog.ts'));

// ---------- 서버가 알려 준 단계 조건 ----------

test('stepMissingReasons reads the conditions the server sent back', () => {
  const error = new V1Error(409, 'ACTIVITY_STEP_NOT_READY', '조건이 부족해요.', {
    step: 2,
    missing: ['LAB_OBSERVATIONS', 'MIN_TEXT'],
    conditions: [
      { code: 'LAB_OBSERVATIONS', message: '30 이하와 70 이상의 두 조건을 모두 관찰해 주세요.' },
      { code: 'MIN_TEXT', message: '공백을 빼고 15자 이상, 내 생각을 먼저 적어 주세요.' },
    ],
  });
  assert.deepEqual(stepMissingReasons(error), [
    '30 이하와 70 이상의 두 조건을 모두 관찰해 주세요.',
    '공백을 빼고 15자 이상, 내 생각을 먼저 적어 주세요.',
  ]);
});

test('stepMissingReasons falls back to the message when details carry no conditions', () => {
  const error = new V1Error(409, 'ACTIVITY_STEP_NOT_READY', '조금 더 적어 주세요.', {});
  assert.deepEqual(stepMissingReasons(error), ['조금 더 적어 주세요.']);
  assert.deepEqual(stepMissingReasons(new Error('네트워크')), []);
});

// ---------- 로컬 사건 → 서버 사건 ----------

test('toServerEvent maps every local event the server can store', () => {
  assert.deepEqual(sync.toServerEvent({ type: 'text', text: '내 생각' }), {
    type: 'TEXT',
    value: '내 생각',
  });
  assert.deepEqual(sync.toServerEvent({ type: 'hint' }), { type: 'HINT' });
  assert.deepEqual(sync.toServerEvent({ type: 'lab-value', value: 80 }), {
    type: 'LAB_VALUE',
    value: 80,
  });
  assert.deepEqual(sync.toServerEvent({ type: 'observation', field: 'a', value: '밝았어요' }), {
    type: 'OBSERVATION',
    field: 'A',
    value: '밝았어요',
  });
  assert.deepEqual(sync.toServerEvent({ type: 'approve' }), { type: 'APPROVE' });
  assert.deepEqual(sync.toServerEvent({ type: 'emotion', emotion: '고마워요' }), {
    type: 'EMOTION',
    value: '고마워요',
  });
  assert.deepEqual(sync.toServerEvent({ type: 'scene', direction: -1 }), {
    type: 'SCENE',
    value: -1,
  });
  assert.deepEqual(sync.toServerEvent({ type: 'choice', choice: 1 }), { type: 'CHOICE', value: 1 });
});

test('toServerEvent drops what the server has no place for', () => {
  // 단계 이동은 사건이 아니라 별도 API 다.
  assert.equal(sync.toServerEvent({ type: 'advance' }), null);
  // 서버 관찰 칸은 LOW_LIGHT·HIGH_LIGHT·A·B 뿐이라 출처는 이 기기에만 남는다.
  assert.equal(sync.toServerEvent({ type: 'observation', field: 'source', value: '책' }), null);
  assert.equal(sync.toServerEvent({ type: 'think-predict', prediction: 'longer' }), null);
});

// ---------- 단계 넘기기 직전에 올릴 사건 ----------

const draft = (over = {}) => ({
  id: 'draft-1',
  track: 'lab',
  activityId: 'custom',
  title: '',
  startedAt: '',
  updatedAt: '',
  min: 15,
  step: 0,
  text: '',
  answers: [],
  followup: '',
  hints: 0,
  lab: {
    mode: 'custom',
    topic: '',
    value: 50,
    low: false,
    high: false,
    a: '',
    b: '',
    source: '',
    prediction: '',
  },
  theater: { keyword: '', story: null, scene: 0, choice: null, emotion: '', approved: false },
  ...over,
});

test('preAdvanceEvents sends the lab topic the screen edits directly', () => {
  const d = draft({ lab: { ...draft().lab, topic: '그림자' } });
  assert.deepEqual(sync.preAdvanceEvents(d), [{ type: 'TOPIC', value: '그림자' }]);
});

test('preAdvanceEvents skips the topic for the prepared lab activities', () => {
  const d = draft({ activityId: 'shadow', lab: { ...draft().lab, mode: 'shadow' } });
  assert.deepEqual(sync.preAdvanceEvents(d), []);
});

test('preAdvanceEvents sends the theater keyword before the script is made', () => {
  const d = draft({
    track: 'theater',
    activityId: 'kindness',
    theater: { ...draft().theater, keyword: '배려' },
  });
  assert.deepEqual(sync.preAdvanceEvents(d), [{ type: 'KEYWORD', value: '배려' }]);
});

test('preAdvanceEvents pushes the latest sentence on a writing step', () => {
  const d = draft({ track: 'forest', activityId: 'honey', step: 1, text: '발자국을 봤어요' });
  assert.deepEqual(sync.preAdvanceEvents(d), [{ type: 'TEXT', value: '발자국을 봤어요' }]);
});

test('preAdvanceEvents sends nothing on a step with no input of its own', () => {
  const d = draft({ track: 'forest', activityId: 'honey', step: 0 });
  assert.deepEqual(sync.preAdvanceEvents(d), []);
});

// ---------- 서버 세션을 쓰지 않는 활동 ----------

test('the two missions with their own engine stay on this device', () => {
  assert.equal(sync.isLocalOnlyActivity('first-inquiry'), true);
  assert.equal(sync.isLocalOnlyActivity('path-teaching'), true);
  assert.equal(sync.isLocalOnlyActivity('honey'), false);
  assert.equal(sync.isLocalOnlyActivity('kindness'), false);
});

// ---------- 모험 목록 ----------

const serverItem = {
  id: 'honey',
  track: 'forest',
  area: '사고력',
  place: '이야기 숲',
  title: '사라진 꿀단지의 단서',
  subtitle: '단서를 모아요',
  level: '보통',
  tags: ['동물', '단서 찾기'],
  description: '설명',
  estimatedMinutes: 12,
  minCharacters: 15,
};

test('serverEntry and localEntry produce the same shape', () => {
  const fromServer = catalog.serverEntry(serverItem);
  const fromLocal = catalog.localEntry({
    id: 'honey',
    track: 'forest',
    title: '사라진 꿀단지의 단서',
    subtitle: '단서를 모아요',
    duration: 12,
    level: '보통',
    tags: ['동물', '단서 찾기'],
    description: '설명',
  });
  assert.deepEqual(Object.keys(fromServer).sort(), Object.keys(fromLocal).sort());
  assert.equal(fromServer.minutes, 12);
  assert.equal(fromServer.fromServer, true);
  assert.equal(fromLocal.fromServer, false);
});

test('filterCatalog narrows by track and search text', () => {
  const entries = [
    catalog.serverEntry(serverItem),
    catalog.serverEntry({
      ...serverItem,
      id: 'shadow',
      track: 'lab',
      title: '그림자',
      subtitle: '조건을 바꿔요',
      tags: ['빛'],
    }),
  ];
  assert.deepEqual(
    catalog.filterCatalog(entries, 'lab', '').map((e) => e.id),
    ['shadow'],
  );
  assert.deepEqual(
    catalog.filterCatalog(entries, null, '단서').map((e) => e.id),
    ['honey'],
  );
  assert.deepEqual(
    catalog.filterCatalog(entries, null, '빛').map((e) => e.id),
    ['shadow'],
  );
  assert.equal(catalog.filterCatalog(entries, null, '  ').length, 2);
});
