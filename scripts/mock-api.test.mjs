import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/app/src');
const modules = new Map();
function load(path) {
  if (modules.has(path)) return modules.get(path).exports;
  const module = { exports: {} };
  modules.set(path, module);
  const code = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const require = (id) =>
    id.startsWith('.') ? load(resolve(dirname(path), `${id}.ts`)) : createRequire(path)(id);
  new Function('require', 'module', 'exports', code)(require, module, module.exports);
  return module.exports;
}
const { createMockApiClient } = load(resolve(root, 'api/mock/client.ts'));
const { createApiClient } = load(resolve(root, 'api/client.ts'));
const { createV1Client } = load(resolve(root, 'api/v1/client.ts'));
const { createV1Fetch } = load(resolve(root, 'api/v1/transport.ts'));
const v1 = load(resolve(root, 'api/v1/endpoints.ts'));
const json = (body, method = 'POST', headers = {}) => ({
  method,
  body: JSON.stringify(body),
  headers,
});
const request = (client, path, options) => client(`api/v1/${path}`, options);
function memory() {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test('merged v1 auth and guardian screens share the mock transport without network', async (t) => {
  t.mock.method(globalThis, 'fetch', () => {
    throw new Error('Network must not be used');
  });
  const api = createMockApiClient();
  const client = createV1Client({ fetch: createV1Fetch(api, '/api/v1') });
  assert.equal((await client.refresh()).user.id, 'mock-user');
  const me = await v1.getAccountMe(client);
  const profileId = me.profiles[0].id;
  assert.equal((await v1.getProfileSettings(client, profileId)).settings.profileId, profileId);
  assert.deepEqual(await v1.listConsents(client, profileId), []);
  assert.deepEqual(await v1.listGuardianChildren(client), []);
  assert.deepEqual(await v1.listLegalDocuments(client), []);
  assert.ok((await v1.getProgressReport(client, { profileId, period: '7d' })).timeline.length);
  assert.deepEqual((await v1.listNotifications(client, {})).items, []);
  await v1.logout(client);
  assert.equal(client.getSession(), null);
  assert.equal(await client.refresh(), null);
  await v1.devLogin(client, { deviceKey: 'merge-test', nickname: '새싹' });
  assert.equal((await v1.getAccountMe(client)).user.id, 'mock-user');
});

test('v1 raw voice requests cannot bypass the mock transport', async (t) => {
  t.mock.method(globalThis, 'fetch', () => {
    throw new Error('Network must not be used');
  });
  const client = createV1Client({ fetch: createV1Fetch(createMockApiClient(), '/api/v1') });
  await client.refresh();
  await assert.rejects(v1.synthesizeSpeech(client, { text: '예시' }), (e) => e.status === 501);
  await assert.rejects(v1.transcribeRecording(client, new Blob(['test'])), (e) => e.status === 501);
});

test('v1 transport uses the configured backend and preserves headers and binary responses', async (t) => {
  const seen = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    seen.push({ url, init });
    if (String(url).endsWith('/speech/synthesis'))
      return new Response(new Blob(['audio'], { type: 'audio/mpeg' }));
    return Response.json({ ok: true });
  });
  const base = 'https://api.example.test/api/v1';
  const client = createV1Client({
    baseUrl: base,
    fetch: createV1Fetch(createApiClient('https://api.example.test/api'), base),
  });
  await client.request('/profiles/example', {
    method: 'PATCH',
    headers: { 'If-Match': '"2"' },
    body: { nickname: '예시' },
  });
  assert.equal(seen[0].url, `${base}/profiles/example`);
  assert.equal(seen[0].init.credentials, 'include');
  assert.equal(seen[0].init.headers.get('If-Match'), '"2"');
  assert.equal(await (await v1.synthesizeSpeech(client, { text: '예시' })).text(), 'audio');
});

test('mock fills all main screens without network access and returns independent snapshots', async (t) => {
  t.mock.method(globalThis, 'fetch', () => {
    throw new Error('Network must not be used');
  });
  const api = createMockApiClient();
  for (const path of [
    'auth/token/refresh',
    'me',
    'home',
    'stories',
    'books',
    'wordbook',
    'community/stories',
    'activities',
    'activity-sessions',
    'profiles',
    'profiles/mock-profile/settings',
    'guardian-links',
    'guardian/share-requests',
    'guardian/safety-events',
    'legal-documents',
    'consents',
    'notifications',
    'notification-settings',
    'reports/progress',
    'guardian/consultations/eligibility',
    'guardian/consultations',
    'data/overview',
    'service-info',
  ]) {
    assert.ok(await request(api, path), path);
  }
  const home = await request(api, 'home');
  assert.ok(home.recommendations.length && home.recentWords.length);
  const stories = await request(api, 'stories');
  stories.items[0].title = 'must not leak';
  assert.notEqual((await request(api, 'stories')).items[0].title, 'must not leak');
});

test('real transport still sends requests and never replaces API errors with examples', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(url);
    return new Response('offline', { status: 503 });
  });
  await assert.rejects(createApiClient('/api')('api/v1/home'), (e) => e.status === 503);
  assert.deepEqual(calls, ['/api/v1/home']);
});

test('favorites, search, pagination and reload persist consistently', async () => {
  const storage = memory();
  const api = createMockApiClient(storage);
  const first = await request(api, 'stories?limit=1');
  assert.equal(first.items.length, 1);
  assert.equal(first.nextCursor, '1');
  await request(api, 'stories/mock-story-2/favorite', { method: 'PUT' });
  const reloaded = createMockApiClient(storage);
  const favorites = await request(reloaded, 'stories?favorite=true');
  assert.equal(favorites.items.length, 2);
  assert.equal((await request(reloaded, 'stories?query=없는제목')).items.length, 0);
  await request(
    reloaded,
    'wordbook/entries/mock-word-2',
    json({ status: 'FAMILIAR', mySentence: '물방울을 보았어요.' }, 'PATCH'),
  );
  assert.equal((await request(reloaded, 'wordbook?status=FAMILIAR')).items.length, 2);
});

test('conversation can be completed, restored and read from the same library', async () => {
  const storage = memory(),
    api = createMockApiClient(storage);
  const chat = await request(
    api,
    'conversations',
    json({ topicId: 'topic_ice_cup' }, 'POST', { 'Idempotency-Key': 'start-once' }),
  );
  const duplicate = await request(
    api,
    'conversations',
    json({ topicId: 'topic_ice_cup' }, 'POST', { 'Idempotency-Key': 'start-once' }),
  );
  assert.equal(chat.conversationId, duplicate.conversationId);
  await assert.rejects(
    request(api, `conversations/${chat.conversationId}/complete`, json({})),
    (e) => e.status === 422,
  );
  for (const text of [
    '차가운 컵에 물방울이 생겼어요.',
    '따뜻한 컵과 비교해 보았어요.',
    '공기 속의 물이 모인 것 같아요.',
  ]) {
    await request(api, `conversations/${chat.conversationId}/messages`, json({ input: { text } }));
  }
  const restored = createMockApiClient(storage);
  assert.equal(
    (await request(restored, `conversations/${chat.conversationId}`)).readiness.ready,
    true,
  );
  const done = await request(restored, `conversations/${chat.conversationId}/complete`, json({}));
  assert.match((await request(restored, `stories/${done.story.id}`)).story.body, /따뜻한 컵/);
});

test('activity enforces writing conditions and completes into the library', async () => {
  const api = createMockApiClient();
  let { session } = await request(api, 'activity-sessions', json({ activityId: 'honey' }));
  const path = `activity-sessions/${session.sessionId}`;
  ({ session } = await request(api, `${path}/advance`, json({})));
  await assert.rejects(request(api, `${path}/advance`, json({})), (e) => e.status === 422);
  for (let i = 0; i < 3; i++) {
    ({ session } = await request(
      api,
      path,
      json(
        {
          clientRevision: session.revision,
          event: { type: 'TEXT', value: '눈에 보이는 단서를 먼저 살펴보고 생각했어요.' },
        },
        'PATCH',
      ),
    ));
    assert.equal(session.missing.length, 0);
    ({ session } = await request(api, `${path}/advance`, json({})));
  }
  assert.equal(session.readyToComplete, true);
  const done = await request(api, `${path}/complete`, json({}));
  assert.equal(done.session.status, 'COMPLETED');
  assert.equal((await request(api, `stories/${done.story.id}`)).story.id, done.story.id);
});

test('logout and offline-only failures never escape to real services', async (t) => {
  t.mock.method(globalThis, 'fetch', () => {
    throw new Error('Network must not be used');
  });
  const api = createMockApiClient();
  await assert.rejects(request(api, 'speech/stream-tickets', json({})), (e) => e.status === 501);
  await request(api, 'auth/logout', json({}));
  await assert.rejects(request(api, 'auth/token/refresh', json({})), (e) => e.status === 401);
  await request(api, 'auth/dev/login', json({}));
  assert.equal((await request(api, 'me')).user.id, 'mock-user');
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    request(api, 'home', { signal: controller.signal }),
    (e) => e.name === 'AbortError',
  );
});
