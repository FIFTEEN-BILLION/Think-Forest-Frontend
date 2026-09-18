import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

// Compile the actual pure domain modules in memory; no browser or added test dependency.
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
const learning = load(resolve(root, 'lib/learning.ts'));
const storage = load(resolve(root, 'lib/storage.ts'));
const { initialData } = load(resolve(root, 'data/mock.ts'));
const { safeNext } = load(resolve(root, 'lib/navigation.ts'));
const { createDraft, transition, guard, toRecord, readyToComplete, scoreAnswers } = learning;
const essay = '단서를 보니 다른 것 같아요. 왜냐하면 직접 비교해서 확인했기 때문이에요.';
function send(draft, event) {
  const result = transition(draft, event);
  assert.equal(result.error, undefined);
  return result.draft;
}
const next = (d) => send(d, { type: 'advance' });
const write = (d) => send(d, { type: 'text', text: essay });
const { requestInquiryQuestion, emptyInquiry } = load(resolve(root, 'lib/inquiry.ts'));
const field = (d, field, value) => send(d, { type: 'inquiry-field', field, value });
// Drafts saved before the thinking engine keep the v1 inquiry shape.
function legacyDraft() {
  const d = createDraft('lab', 'first-inquiry', 15);
  delete d.thinking;
  d.inquiry = emptyInquiry();
  return d;
}

test('new first inquiry drafts start the thinking engine; legacy drafts stay readable', () => {
  const d = createDraft('lab', 'first-inquiry', 15);
  assert.equal(d.thinking.version, 2);
  assert.equal(d.inquiry, undefined);
  assert.equal(storage.isDraft(legacyDraft()), true);
});
function inquiryAtObservation() {
  let d = legacyDraft();
  d = field(d, 'initial', '빛을 올리면 그림자가 길어질 것 같아요.');
  d = field(d, 'reason', '빛이 멀리 퍼지기 때문이에요.');
  d = next(d);
  d = send(d, { type: 'inquiry-question', question: '내가 말한 뜻이 맞을까?' });
  d = send(d, { type: 'inquiry-confirm', confirmed: true });
  return next(d);
}
function inquiryAtJudgment() {
  let d = inquiryAtObservation();
  for (const condition of ['low', 'high']) {
    d = send(d, { type: 'inquiry-select', condition });
    d = send(d, { type: 'inquiry-observe' });
  }
  return next(d);
}

test('first inquiry keeps questions and observations closed until both thought and reason exist', () => {
  let d = legacyDraft();
  assert.ok(transition(d, { type: 'advance' }).error);
  d = field(d, 'initial', essay);
  d = field(d, 'reason', ' \n ');
  assert.ok(guard(d));
  assert.equal(send(d, { type: 'inquiry-question', question: 'bypass' }).inquiry.question, '');
  assert.deepEqual(send(d, { type: 'inquiry-observe' }).inquiry.observed, []);
  d = field(d, 'reason', '낮에 본 그림자를 떠올렸어요.');
  d = next(d);
  assert.equal(d.step, 1);
  assert.ok(guard(d));
  d = send(d, { type: 'inquiry-question', question: '무슨 뜻일까?' });
  assert.ok(guard(d));
  d = send(d, { type: 'inquiry-confirm', confirmed: true });
  d = field(d, 'meaning', '내 뜻을 조금 고쳤어요.');
  assert.equal(d.inquiry.confirmed, false);
  assert.equal(d.inquiry.initial, essay);
});

test('selecting a condition is separate from viewing its result, and one result is insufficient', () => {
  let d = inquiryAtObservation();
  d = send(d, { type: 'inquiry-select', condition: 'low' });
  assert.deepEqual(d.inquiry.observed, []);
  assert.ok(guard(d));
  d = send(d, { type: 'inquiry-observe' });
  d = send(d, { type: 'inquiry-observe' });
  assert.deepEqual(d.inquiry.observed, ['low']);
  assert.ok(guard(d));
  assert.throws(() => toRecord(d));
  d = send(d, { type: 'inquiry-select', condition: 'high' });
  assert.ok(guard(d));
  d = send(d, { type: 'inquiry-observe' });
  assert.equal(next(d).step, 3);
});

for (const judgment of ['keep', 'change', 'explore']) {
  test(`first inquiry completes and restores the comparison for ${judgment}`, () => {
    let d = inquiryAtJudgment();
    d = send(d, { type: 'inquiry-judge', judgment });
    assert.ok(guard(d));
    if (judgment === 'keep') assert.equal(d.inquiry.final, d.inquiry.meaning);
    else
      d = field(
        d,
        'final',
        judgment === 'change'
          ? '빛을 높이니 그림자가 짧아졌어요.'
          : '막대기의 높이도 바꾸어 보고 싶어요.',
      );
    d = field(d, 'finalReason', '낮은 빛과 높은 빛에서 나온 그림자를 비교했어요.');
    d = next(d);
    assert.ok(readyToComplete(d));
    const record = toRecord(d);
    assert.equal(record.inquiry.judgment, judgment);
    assert.deepEqual(
      record.rubric,
      scoreAnswers([
        { question: '', text: `${d.inquiry.initial} ${d.inquiry.reason}` },
        { question: '', text: `${d.inquiry.final} ${d.inquiry.finalReason}` },
      ]),
    );
    assert.deepEqual(record.inquiry.observed, ['low', 'high']);
    assert.match(record.text, /빛을 낮게/);
    assert.match(record.text, /그림자가 짧아졌어요/);
    const data = initialData(false);
    data.resume = d;
    data.sessions = [record];
    const restored = storage.decode(JSON.stringify(data));
    assert.deepEqual(restored.resume.inquiry, d.inquiry);
    assert.deepEqual(restored.sessions[0].inquiry, record.inquiry);
    d.inquiry.observed = ['high'];
    assert.equal(readyToComplete(d), false);
  });
}

test('editing the first answer resets its question; malformed inquiry storage is rejected', () => {
  let d = inquiryAtObservation();
  d.step = 1;
  d = send(d, { type: 'inquiry-back' });
  assert.equal(d.step, 0);
  assert.equal(d.inquiry.question, '');
  assert.equal(d.inquiry.confirmed, false);
  assert.ok(d.inquiry.initial.length);
  assert.equal(
    storage.isDraft({ ...d, inquiry: { ...d.inquiry, observed: ['unexpected'] } }),
    false,
  );
  assert.equal(storage.isDraft({ ...d, inquiry: undefined }), false);
});

test('mock question adapter supports failure, retry, blank input and cancellation without a network', async () => {
  const signal = new AbortController().signal;
  await assert.rejects(requestInquiryQuestion('', '', { fail: false, signal }));
  await assert.rejects(requestInquiryQuestion(essay, essay, { fail: true, signal }));
  const question = await requestInquiryQuestion(essay, essay, { fail: false, signal });
  assert.ok(question.includes(essay));
  const controller = new AbortController();
  const pending = requestInquiryQuestion(essay, essay, { fail: false, signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});

test('whitespace cannot satisfy the writing gate; a rejected event leaves the draft unchanged', () => {
  let d = next(createDraft('forest', 'honey', 15));
  d = send(d, { type: 'text', text: '  내 생각 \n\t ' });
  assert.equal(learning.count(d.text), 3);
  const rejected = transition(d, { type: 'advance' });
  assert.ok(rejected.error);
  assert.equal(rejected.draft, d);
  assert.equal(d.answers.length, 0);
  assert.equal(d.followup, '');
  assert.throws(() => toRecord(d));
});

test('forest requires three separate responses and preserves exactly the child’s words', () => {
  let d = next(createDraft('forest', 'honey', 25));
  for (let i = 1; i <= 3; i++) {
    assert.equal(d.step, i);
    assert.ok(guard(d));
    d = next(write(d));
    assert.equal(d.text, '');
    assert.equal(d.answers.length, i);
    assert.ok(d.followup.includes(essay));
  }
  assert.ok(readyToComplete(d));
  const record = toRecord(d);
  assert.equal(record.id, d.id);
  assert.equal(record.source, 'local');
  assert.deepEqual(record.rubric, scoreAnswers(d.answers));
  assert.equal(next(d).step, 4);
});

test('lab requires prediction, two distinct conditions, explanation, and another reflection', () => {
  let d = createDraft('lab', 'shadow', 15);
  d = send(d, { type: 'lab-value', value: 10 });
  assert.equal(d.lab.low, false);
  d = next(d);
  assert.ok(guard(d));
  d = next(write(d));
  assert.equal(d.step, 2);
  assert.ok(guard(d));
  d = send(d, { type: 'lab-value', value: 30 });
  assert.ok(guard(d));
  d = send(d, { type: 'lab-value', value: 70 });
  assert.equal(guard(d), null);
  d = next(d);
  assert.throws(() => toRecord(d));
  d = next(write(d));
  assert.ok(guard(d));
  d = next(write(d));
  assert.ok(readyToComplete(d));
  assert.equal(toRecord(d).answers.length, 3);
});

test('custom topics route to supported simulations; other topics need two different observations', () => {
  const shadow = createDraft('lab', 'custom', 15);
  shadow.lab.topic = '빛과 그림자';
  assert.equal(next(shadow).lab.mode, 'shadow');
  const custom = createDraft('lab', 'custom', 15);
  custom.lab.topic = '나뭇잎';
  let d = next(write(next(custom)));
  d = send(d, { type: 'observation', field: 'a', value: '초록 잎' });
  d = send(d, { type: 'observation', field: 'b', value: '초록잎' });
  assert.ok(guard(d));
  d = send(d, { type: 'observation', field: 'b', value: '노란 잎' });
  assert.equal(guard(d), null);
});

test('theater requires preview approval, a real branch choice, final scene, emotion and writing', () => {
  let d = createDraft('theater', 'courage', 15, '용기');
  assert.ok(transition(d, { type: 'advance' }).draft.theater.story);
  d = next(d);
  assert.ok(guard(d));
  d = send(d, { type: 'approve' });
  d = next(d);
  assert.ok(guard(d));
  d = send(d, { type: 'scene', direction: 1 });
  assert.ok(transition(d, { type: 'scene', direction: 1 }).error);
  assert.ok(transition(d, { type: 'choice', choice: 9 }).error);
  d = send(d, { type: 'choice', choice: 1 });
  assert.equal(d.theater.story.scenes[2], d.theater.story.branches[1]);
  d = send(d, { type: 'scene', direction: 1 });
  d = next(d);
  d = write(d);
  assert.ok(guard(d));
  d = send(d, { type: 'emotion', emotion: '뿌듯했어요' });
  d = next(d);
  assert.ok(readyToComplete(d));
  assert.equal(toRecord(d).choice, 1);
});

test('blocked keywords cannot generate a story or an activity', () => {
  assert.ok(transition(createDraft('theater', 'kindness', 15, '폭 탄'), { type: 'advance' }).error);
  const d = createDraft('lab', 'custom', 15);
  d.lab.topic = '폭탄';
  assert.ok(transition(d, { type: 'advance' }).error);
});

test('example scores never tune the child’s writing gate', () => {
  const data = initialData();
  assert.equal(data.sessions.length, 9);
  data.sessions.forEach((s) => (s.rubric = { observe: 100, reason: 100, express: 100 }));
  assert.equal(learning.gateSize(data), 15);
  const actual = { ...data.sessions[0], source: 'local' };
  data.sessions.push(actual);
  assert.equal(learning.gateSize(data), 25);
  actual.rubric = { observe: 20, reason: 20, express: 20 };
  assert.equal(learning.gateSize(data), 8);
  data.settings.autoTune = false;
  data.settings.gate = '도전';
  assert.equal(learning.gateSize(data), 25);
});

test('storage round trip preserves a partially written draft and filters malformed records', () => {
  const data = initialData();
  data.resume = write(next(createDraft('forest', 'honey', 15)));
  assert.deepEqual(storage.decode(JSON.stringify(data)), data);
  data.sessions[0].emotion = { invalid: true };
  data.resume.min = -1;
  const decoded = storage.decode(JSON.stringify(data));
  assert.equal(decoded.sessions.length, 8);
  assert.equal(decoded.resume, null);
  assert.throws(() => storage.decode('{broken'));
  assert.throws(() => storage.decode(JSON.stringify({ ...initialData(), settings: {} })));
});

test('retention removes expired records, draft, diagnosis and dependent summary', () => {
  const data = initialData();
  const old = new Date(Date.now() - 100 * 86400000).toISOString();
  data.sessions[0].completedAt = old;
  data.resume = createDraft('forest', 'honey', 15);
  data.resume.updatedAt = old;
  data.diagnosis = { at: old, level: '보통', why: '', answers: [] };
  data.summary = {
    text: '',
    next: '',
    at: new Date().toISOString(),
    source: 'rule',
    includesMock: true,
    recordIds: [data.sessions[0].id],
  };
  const result = storage.prune(data);
  assert.equal(result.sessions.length, 8);
  assert.equal(result.resume, null);
  assert.equal(result.diagnosis, null);
  assert.equal(result.summary, null);
});

test('deleting data leaves an empty reloadable state without reseeding examples', () => {
  const memory = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) },
  });
  assert.equal(storage.loadData().data.sessions.length, 9);
  storage.clearData();
  const restored = storage.loadData();
  assert.equal(restored.storageError, '');
  assert.equal(restored.data.sessions.length, 0);
  assert.equal(restored.data.consent.done, false);
  assert.equal(restored.data.resume, null);
  delete globalThis.localStorage;
});

test('return navigation only permits existing internal destinations', () => {
  assert.equal(safeNext('https://example.com'), '/');
  assert.equal(safeNext('//example.com'), '/');
  assert.equal(safeNext('/adventures/forest/missing'), '/');
  assert.equal(safeNext('/adventures/forest/honey'), '/adventures/forest/honey');
  assert.equal(safeNext('/session/lab'), '/session/lab');
});

test('first-talk completion state (onboarding step 3 + server profile) survives a reload', () => {
  const data = initialData();
  const done = {
    ...data,
    profile: {
      name: '별',
      grade: '초등학교 2학년',
      interests: ['공룡', '큰 이빨'],
      goal: '질문하는 힘',
    },
    consent: {
      ...data.consent,
      done: true,
      guardian: '보호자 계정과 연결',
      noticeAt: new Date().toISOString(),
    },
    onboarding: { ...data.onboarding, step: 3, acknowledged: true, childPolicy: true },
  };
  assert.equal(storage.decode(JSON.stringify(done)).profile.name, '별');
  assert.throws(() =>
    storage.decode(JSON.stringify({ ...done, onboarding: { ...done.onboarding, step: 4 } })),
  );
});
