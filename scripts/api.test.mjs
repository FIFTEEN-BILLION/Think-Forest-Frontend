import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(
  readFileSync(new URL('../packages/app/src/api/client.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const module = { exports: {} };
new Function('module', 'exports', source)(module, module.exports);
const { createApiClient, resolveApiUrl, ApiError } = module.exports;

test('API addresses work with the local proxy and a separately configured backend', () => {
  assert.equal(resolveApiUrl('/api', '/api/v1/me'), '/api/v1/me');
  assert.equal(
    resolveApiUrl('http://localhost:8000/', 'api/v1/me'),
    'http://localhost:8000/api/v1/me',
  );
  assert.equal(resolveApiUrl('/api/', 'families'), '/api/families');
  assert.equal(
    resolveApiUrl('https://example.test/api', '/api/v1/speech/stream'),
    'https://example.test/api/v1/speech/stream',
  );
});

test('JSON mutations preserve authentication, cookies and optimistic version headers', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url, '/api/v1/profiles/p');
    assert.equal(init.headers.get('Authorization'), 'Bearer test-token');
    assert.equal(init.headers.get('If-Match'), '"2"');
    assert.equal(init.credentials, 'include');
    assert.equal(init.method, 'PATCH');
    assert.equal(init.body, '{"nickname":"별"}');
    return Response.json({ version: 3 });
  });
  assert.deepEqual(
    await createApiClient('/api')('api/v1/profiles/p', {
      method: 'PATCH',
      credentials: 'include',
      headers: { Authorization: 'Bearer test-token', 'If-Match': '"2"' },
      body: '{"nickname":"별"}',
    }),
    { version: 3 },
  );
});

test('recording uploads leave multipart boundaries to the browser', async (t) => {
  const form = new FormData();
  form.append('file', new Blob(['audio'], { type: 'audio/webm' }), 'voice.webm');
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    assert.equal(init.body, form);
    assert.equal(init.headers.has('Content-Type'), false);
    return Response.json({ text: '생각했어요' });
  });
  assert.equal(
    (await createApiClient('/api')('api/v1/speech/transcriptions', { method: 'POST', body: form }))
      .text,
    '생각했어요',
  );
});

test('audio and ZIP downloads are binary; deletes accept empty responses', async (t) => {
  for (const mime of ['audio/mpeg', 'application/zip']) {
    t.mock.method(
      globalThis,
      'fetch',
      async () =>
        new Response(new Uint8Array([0, 128, 255]), { headers: { 'Content-Type': mime } }),
    );
    const result = await createApiClient('/api')('api/v1/download');
    assert.ok(result instanceof Blob);
    assert.deepEqual([...new Uint8Array(await result.arrayBuffer())], [0, 128, 255]);
  }
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }));
  assert.equal(await createApiClient('/api')('api/v1/entry', { method: 'DELETE' }), undefined);
});

test('permission and version failures remain available to screen error handling', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ error: { code: 'VERSION_CONFLICT' } }, { status: 412 }),
  );
  await assert.rejects(createApiClient('/api')('api/v1/entry'), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 412);
    assert.equal(JSON.parse(error.body).error.code, 'VERSION_CONFLICT');
    return true;
  });
});
