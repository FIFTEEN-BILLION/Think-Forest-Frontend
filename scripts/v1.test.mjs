import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

// Same in-memory loader as path.test.mjs: compile the pure API v1 modules only (no React).
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/app/src/api/v1');
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
const client = load(resolve(root, 'client.ts'));
const endpoints = load(resolve(root, 'endpoints.ts'));
const chat = load(resolve(root, 'chat.ts'));
const { greetingProcessingNotice } = load(resolve(root, 'greeting.ts'));
const { createV1Client, parseV1Error, V1Error } = client;

const json = (status, body, headers = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
const user = { id: 'usr_1', role: 'CHILD', needsFirstGreeting: true };
const tokens = (accessToken) => ({ accessToken, expiresIn: 3600, refreshExpiresIn: 2592000, user });

test('guest login uses the public endpoint without sharing a device key or existing bearer token', async () => {
  const calls = [];
  const guestUser = { id: 'guest-unique', role: 'GUEST', needsFirstGreeting: false };
  const client = createV1Client({
    fetch: async (url, init) => {
      calls.push({ url, init });
      return json(200, { ...tokens('guest-token'), user: guestUser });
    },
  });
  client.acceptTokens(tokens('old-token'));
  await endpoints.guestLogin(client);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/auth\/guest$/);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.credentials, 'same-origin');
  assert.equal(new Headers(calls[0].init.headers).get('Authorization'), null);
  assert.deepEqual(JSON.parse(calls[0].init.body), {});
  assert.deepEqual(client.getSession().user, guestUser);
});

test('guest entry keeps activity destinations and redirects account-only destinations home', () => {
  const guest = { role: 'GUEST', needsFirstGreeting: false };
  for (const path of [
    '/profile',
    '/data?tab=export',
    '/guardian/invite/abc',
    '/story-share?story=1',
  ]) {
    assert.equal(chat.postLoginPath(guest, path), '/');
  }
  assert.equal(chat.postLoginPath(guest, '/talk?topic=topic_ice_cup'), '/talk?topic=topic_ice_cup');
  assert.equal(
    chat.postLoginPath({ role: 'GUARDIAN', needsFirstGreeting: false }, '/profile'),
    '/profile',
  );
});

test('greeting shows backend AI, fallback and consent status without pretending all turns use AI', () => {
  assert.equal(greetingProcessingNotice(), null);
  assert.equal(greetingProcessingNotice({ mode: 'RULES', reason: 'guided_step' }), null);
  assert.match(greetingProcessingNotice({ mode: 'AI' }), /백엔드 AI/);
  assert.match(
    greetingProcessingNotice({ mode: 'RULES', reason: 'child_data_mode_off' }),
    /보호자 동의/,
  );
  assert.match(
    greetingProcessingNotice({ mode: 'RULES', reason: 'ai_error:timeout' }),
    /AI 응답을 받지 못/,
  );
  assert.match(
    greetingProcessingNotice({ mode: 'RULES', reason: 'unverified_extraction' }),
    /확실하지 않은/,
  );
});

test('first greeting completion sends the reviewed profile revision', async () => {
  const calls = [];
  const client = {
    request: async (path, options) => {
      calls.push({ path, ...options });
      return { status: 'COMPLETED' };
    },
  };
  await endpoints.completeFirstGreeting(client, 'fgs_1', 4, 'confirm-once');
  assert.deepEqual(calls, [
    {
      path: '/first-greeting/sessions/fgs_1/complete',
      body: { trigger: 'BUTTON', profileRevision: 4 },
      idempotencyKey: 'confirm-once',
    },
  ]);
});
const noLock = (_name, task) => task();

/** Mock fetch: routes by path, records calls. */
function mockFetch(handler) {
  const calls = [];
  const fetch = async (url, init) => {
    const call = {
      url,
      path: url.replace(/^\/api\/v1/, '').split('?')[0],
      method: init.method,
      headers: init.headers,
      body: init.body ? JSON.parse(init.body) : undefined,
      credentials: init.credentials,
    };
    calls.push(call);
    return handler(call, calls);
  };
  return { fetch, calls };
}

// ---------- error parsing ----------

test('parseV1Error reads the spec error envelope', () => {
  const error = parseV1Error(
    409,
    JSON.stringify({
      error: {
        code: 'CONVERSATION_NOT_READY',
        message: '조금 더 이야기한 뒤 마칠 수 있어요.',
        details: { missingDimensions: ['ALTERNATIVE'] },
        requestId: 'req_1',
      },
    }),
  );
  assert.ok(error instanceof V1Error);
  assert.equal(error.status, 409);
  assert.equal(error.code, 'CONVERSATION_NOT_READY');
  assert.equal(error.message, '조금 더 이야기한 뒤 마칠 수 있어요.');
  assert.deepEqual(error.details, { missingDimensions: ['ALTERNATIVE'] });
  assert.equal(error.requestId, 'req_1');
});

test('parseV1Error falls back for non-JSON bodies and uses the header request id', () => {
  const gateway = parseV1Error(502, '<html>Bad Gateway</html>', 'req_hdr');
  assert.equal(gateway.code, 'HTTP_502');
  assert.equal(gateway.requestId, 'req_hdr');
  assert.deepEqual(gateway.details, {});
  assert.ok(gateway.message.length > 0);
  assert.equal(parseV1Error(401, '').code, 'UNAUTHORIZED');
  assert.equal(parseV1Error(400, '{"detail":"x"}').code, 'HTTP_400');
});

// ---------- client ----------

test('request sends same-origin credentials, bearer token and Idempotency-Key', async () => {
  const { fetch, calls } = mockFetch((call) =>
    call.path === '/auth/dev/login' ? json(200, tokens('jat_a')) : json(200, { ok: true }),
  );
  const api = createV1Client({ fetch, lock: noLock });
  await endpoints.devLogin(api, { deviceKey: 'device-key-1' });
  await endpoints.startFirstGreeting(api, 'idem-1');
  assert.equal(calls[0].headers.Authorization, undefined);
  assert.equal(calls[0].credentials, 'same-origin');
  assert.equal(calls[1].url, '/api/v1/first-greeting/sessions');
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[1].headers.Authorization, 'Bearer jat_a');
  assert.equal(calls[1].headers['Idempotency-Key'], 'idem-1');
});

test('401 triggers a single shared refresh and each request retries once', async () => {
  let refreshes = 0;
  const { fetch, calls } = mockFetch(async (call) => {
    if (call.path === '/auth/token/refresh') {
      refreshes += 1;
      await new Promise((r) => setTimeout(r, 10));
      return json(200, tokens('jat_new'));
    }
    return call.headers.Authorization === 'Bearer jat_new'
      ? json(200, { path: call.path })
      : json(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } });
  });
  const api = createV1Client({ fetch, lock: noLock });
  api.acceptTokens(tokens('jat_old'));
  const seen = [];
  api.subscribe((session) => seen.push(session?.accessToken ?? null));

  const results = await Promise.all([
    api.request('/me'),
    api.request('/home'),
    api.request('/topics'),
  ]);
  assert.deepEqual(
    results.map((r) => r.path),
    ['/me', '/home', '/topics'],
  );
  assert.equal(refreshes, 1);
  assert.equal(calls.filter((c) => c.path === '/me').length, 2);
  assert.equal(api.getSession().accessToken, 'jat_new');
  assert.deepEqual(seen, ['jat_new']);
});

test('refresh rejected with 401 clears the session and surfaces UNAUTHORIZED without looping', async () => {
  const { fetch, calls } = mockFetch(() =>
    json(401, { error: { code: 'UNAUTHORIZED', message: 'no' } }),
  );
  const api = createV1Client({ fetch, lock: noLock });
  api.acceptTokens(tokens('jat_old'));
  const seen = [];
  api.subscribe((session) => seen.push(session));
  await assert.rejects(api.request('/me'), (error) => error.status === 401);
  assert.equal(api.getSession(), null);
  assert.deepEqual(seen, [null]);
  assert.deepEqual(
    calls.map((c) => c.path),
    ['/me', '/auth/token/refresh'],
  );
});

test('a retried request that still gets 401 does not refresh again', async () => {
  let refreshes = 0;
  const { fetch } = mockFetch((call) => {
    if (call.path === '/auth/token/refresh') {
      refreshes += 1;
      return json(200, tokens(`jat_${refreshes}`));
    }
    return json(401, { error: { code: 'UNAUTHORIZED', message: 'still no' } });
  });
  const api = createV1Client({ fetch, lock: noLock });
  await assert.rejects(api.request('/me'), (error) => error.code === 'UNAUTHORIZED');
  assert.equal(refreshes, 1);
});

test('refresh network failure keeps the session; auth:false requests never refresh', async () => {
  const { fetch, calls } = mockFetch((call) => {
    if (call.path === '/auth/token/refresh') throw new TypeError('Failed to fetch');
    return json(401, { error: { code: 'UNAUTHORIZED', message: 'x' } });
  });
  const api = createV1Client({ fetch, lock: noLock });
  api.acceptTokens(tokens('jat_old'));
  await assert.rejects(api.request('/me'), (error) => error.code === 'NETWORK_ERROR');
  assert.equal(api.getSession().accessToken, 'jat_old');
  calls.length = 0;
  await assert.rejects(api.request('/auth/dev/login', { body: {}, auth: false }), { status: 401 });
  assert.deepEqual(
    calls.map((c) => c.path),
    ['/auth/dev/login'],
  );
});

test('refresh runs inside the cross-tab lock', async () => {
  const locked = [];
  const { fetch } = mockFetch(() => json(200, tokens('jat_x')));
  const api = createV1Client({
    fetch,
    lock: (name, task) => {
      locked.push(name);
      return task();
    },
  });
  await Promise.all([api.refresh(), api.refresh()]);
  assert.deepEqual(locked, ['jjcp-auth-refresh']);
});

test('list endpoints join statuses and normalize page shapes', async () => {
  const { fetch, calls } = mockFetch((call) =>
    call.path === '/conversations'
      ? json(200, { items: [{ conversationId: 'cnv_1', status: 'ACTIVE' }], nextCursor: 'c2' })
      : json(200, { topics: [{ id: 'topic_a', title: 'A', category: 'SCIENCE' }] }),
  );
  const api = createV1Client({ fetch, lock: noLock });
  const conversations = await endpoints.listConversations(api, {
    status: ['ACTIVE', 'READY_TO_FINISH'],
  });
  assert.equal(
    new URL(calls[0].url, 'http://x').searchParams.get('status'),
    'ACTIVE,READY_TO_FINISH',
  );
  assert.equal(conversations.nextCursor, 'c2');
  const topics = await endpoints.listTopics(api, { recommended: true });
  assert.match(calls[1].url, /recommended=true/);
  assert.equal(topics.items[0].id, 'topic_a');
  assert.deepEqual(endpoints.toPage([1, 2], 'x'), { items: [1, 2], nextCursor: null });
  assert.equal(
    endpoints.kakaoAuthorizeUrl(
      '/login?returnTo=%2Ftalk',
      'https://preview.example.com/auth/kakao/callback',
    ),
    '/api/v1/auth/kakao/authorize?returnTo=%2Flogin%3FreturnTo%3D%252Ftalk&redirectUri=https%3A%2F%2Fpreview.example.com%2Fauth%2Fkakao%2Fcallback',
  );
});

test('Kakao code exchange sends code, state and redirectUri then accepts service tokens', async () => {
  const response = { ...tokens('jat_kakao'), returnTo: '/talk' };
  const { fetch, calls } = mockFetch(() => json(200, response));
  const api = createV1Client({ fetch, lock: noLock });
  const result = await endpoints.exchangeKakaoCode(api, {
    code: 'authorization-code',
    state: 'oauth-state',
    redirectUri: 'http://localhost:5173/auth/kakao/callback',
  });
  assert.equal(result.returnTo, '/talk');
  assert.equal(api.getSession().accessToken, 'jat_kakao');
  assert.equal(calls[0].path, '/auth/kakao/exchange');
  assert.deepEqual(calls[0].body, {
    code: 'authorization-code',
    state: 'oauth-state',
    redirectUri: 'http://localhost:5173/auth/kakao/callback',
  });
});

// ---------- chat helpers ----------

test('mergeMessages dedupes by id, replaces in place and keeps order', () => {
  const a = { id: 'm1', role: 'ASSISTANT', content: '자기소개해볼까?' };
  const b = { id: 'm2', role: 'USER', content: '나는 별' };
  const merged = chat.mergeMessages([a], [b, { ...a, content: '수정됨' }, null, b]);
  assert.deepEqual(
    merged.map((m) => [m.id, m.content]),
    [
      ['m1', '수정됨'],
      ['m2', '나는 별'],
    ],
  );
  // Replaying the same response (idempotent retry) adds nothing.
  assert.equal(chat.mergeMessages(merged, [b]).length, 2);
});

test('buildMessageRequest follows the current interaction', () => {
  const choice = {
    type: 'SINGLE_CHOICE',
    questionId: 'q_1',
    options: [{ id: 'SEEN', label: '응' }],
  };
  assert.deepEqual(chat.buildMessageRequest('c1', choice, { optionId: 'SEEN' }), {
    clientMessageId: 'c1',
    questionId: 'q_1',
    input: { type: 'SINGLE_CHOICE', optionId: 'SEEN' },
  });
  assert.equal(chat.buildMessageRequest('c1', choice, { optionId: 'NOPE' }), null);
  assert.equal(chat.buildMessageRequest('c1', null, { optionId: 'SEEN' }), null);
  assert.equal(chat.buildMessageRequest('c1', null, { text: '   ' }), null);
  assert.deepEqual(chat.buildMessageRequest('c2', null, { text: ' 안녕 ' }), {
    clientMessageId: 'c2',
    input: { type: 'TEXT', text: '안녕' },
  });
  assert.equal(
    chat.buildMessageRequest('c3', { type: 'TEXT', questionId: 'q_2', options: [] }, { text: '응' })
      .questionId,
    'q_2',
  );
});

test('classifySendError maps spec codes to screen actions', () => {
  const kind = (status, code) => chat.classifySendError(new V1Error(status, code, 'm')).kind;
  assert.equal(kind(409, 'QUESTION_MISMATCH'), 'reload');
  assert.equal(kind(404, 'SESSION_NOT_FOUND'), 'reload');
  assert.equal(kind(503, 'AI_TEMPORARILY_UNAVAILABLE'), 'retry');
  assert.equal(kind(0, 'NETWORK_ERROR'), 'retry');
  assert.equal(kind(422, 'UNSAFE_CONTENT'), 'unsafe');
  assert.equal(kind(409, 'CONVERSATION_NOT_READY'), 'notReady');
  assert.equal(kind(409, 'FIRST_GREETING_NOT_READY'), 'notReady');
  assert.equal(kind(429, 'RATE_LIMITED'), 'wait');
  assert.equal(kind(401, 'UNAUTHORIZED'), 'signin');
  assert.equal(kind(400, 'INVALID_INPUT'), 'error');
  assert.equal(chat.classifySendError(new Error('x')).kind, 'error');
});

test('readiness helpers: finish only when ready and open, progress clamps', () => {
  assert.equal(chat.canFinish({ ready: true }, 'READY_TO_FINISH'), true);
  assert.equal(chat.canFinish({ ready: true }, 'COMPLETED'), false);
  assert.equal(chat.canFinish({ ready: false }, 'ACTIVE'), false);
  assert.equal(chat.canFinish(null, 'ACTIVE'), false);
  assert.equal(chat.progressValue({ progress: 140 }), 100);
  assert.equal(chat.progressValue({ progress: -3 }), 0);
  assert.equal(chat.progressValue({ progress: 59.6 }), 60);
  assert.equal(chat.progressValue(undefined), 0);
});

test('profile helpers: draft chips and local profile compatibility', () => {
  const draft = {
    nickname: '별',
    schoolOrGroup: '초등학교',
    gradeOrAgeBand: '2학년',
    interests: ['공룡'],
    interestDetails: [],
    growthGoal: null,
  };
  assert.deepEqual(
    chat.profileDraftChips(draft).map((c) => c.value),
    ['별', '초등학교 2학년', '공룡'],
  );
  const previous = { name: '지우', grade: '2학년', interests: ['우주'], goal: '질문하기' };
  assert.deepEqual(
    chat.toLocalProfile(
      {
        nickname: '별',
        gradeOrAgeBand: null,
        interests: ['공룡'],
        interestDetails: ['큰 이빨'],
        growthGoal: '궁금한 것을 질문하는 힘',
      },
      previous,
    ),
    { name: '별', grade: '2학년', interests: ['공룡', '큰 이빨'], goal: '궁금한 것을 질문하는 힘' },
  );
});

test('login params: safe returnTo, nested loginError, first-greeting redirect', () => {
  assert.equal(chat.safeReturnTo('//evil.com'), '/');
  assert.equal(chat.safeReturnTo('https://evil.com'), '/');
  assert.equal(chat.safeReturnTo('/login?returnTo=/talk'), '/');
  assert.equal(chat.safeReturnTo('/talk?topicId=topic_a'), '/talk?topicId=topic_a');
  assert.deepEqual(chat.parseLoginParams('?returnTo=%2Ftalk&loginError=ACCESS_DENIED'), {
    returnTo: '/talk',
    loginError: 'ACCESS_DENIED',
  });
  assert.deepEqual(chat.parseLoginParams('?returnTo=%2Ftalk?loginError=STATE_INVALID'), {
    returnTo: '/talk',
    loginError: 'STATE_INVALID',
  });
  assert.deepEqual(chat.parseLoginParams(''), { returnTo: '/', loginError: null });
  assert.equal(
    chat.postLoginPath({ needsFirstGreeting: true }, '/talk'),
    '/first-talk?next=%2Ftalk',
  );
  assert.equal(chat.postLoginPath({ needsFirstGreeting: true }, '/'), '/first-talk');
  assert.equal(chat.postLoginPath({ needsFirstGreeting: false }, '/talk'), '/talk');
});
