import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(path, overrides = {}) {
  const source = ts.transpileModule(
    readFileSync(new URL(`../packages/app/src/${path}`, import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
  ).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (id) => overrides[id] ?? require(id),
    module,
    module.exports,
  );
  return module.exports;
}
const { clearResetStorage } = load('api/debugReset.ts');

test('reset clears current-user drafts, preserves other accounts and unrelated storage', () => {
  const data = new Map([
    ['jjcp-active-usr_mine:prf_1-conversations-topic', 'old'],
    ['jjcp-quiz-usr_mine:prf_1', 'old'],
    ['jjcp-account-delete-usr_mine', 'old'],
    ['jjcp-active-usr_other:prf_2-conversations-topic', 'keep'],
    ['jjcp-quiz-usr_other:prf_2', 'keep'],
    ['jjcp-device-child', 'keep'],
    ['unrelated', 'keep'],
    ['jaram_village_react_v1', 'old'],
  ]);
  clearResetStorage(
    {
      get length() {
        return data.size;
      },
      key: (index) => [...data.keys()][index],
      removeItem: (key) => data.delete(key),
    },
    'usr_mine',
  );
  assert.deepEqual([...data.values()], ['keep', 'keep', 'keep', 'keep']);
});

test('reset button appears only in debug mode with a real API and authenticated user', () => {
  const backend = { debugMode: false, useApi: true, me: { user: { id: 'usr_mine' } } };
  const { DebugResetButton } = load('components/DebugResetButton.tsx', {
    '../providers/BackendProvider': { useBackend: () => backend },
    '../providers/AuthProvider': { useAuth: () => ({ client: {} }) },
    '@tanstack/react-query': { useQueryClient: () => ({}) },
    '../hooks/useServerApi': { useAction: () => ({ busy: false, message: '' }) },
    '../api/requestOptions': { json: () => ({}) },
    '../api/debugReset': { clearResetStorage },
  });
  const render = () => renderToStaticMarkup(createElement(DebugResetButton));
  assert.equal(render(), '');
  backend.debugMode = true;
  assert.match(render(), /내 정보 초기화/);
  backend.useApi = false;
  assert.equal(render(), '');
  backend.useApi = true;
  backend.me = null;
  assert.equal(render(), '');
});

test('Kakao callback remains reachable after reset without a signed-in session', () => {
  let pathname = '/auth/kakao/callback';
  const { BackendGate } = load('components/BackendGate.tsx', {
    '../screens/OnboardingScreen': { OnboardingGate: ({ children }) => children },
    '../api/v1/chat': load('api/v1/chat.ts', { './client': load('api/v1/client.ts') }),
    '../providers/BackendProvider': {
      useBackend: () => ({ me: null, loading: false, error: '' }),
    },
    'react-router-dom': {
      useLocation: () => ({ pathname, search: '?code=test&state=test' }),
      Navigate: () => createElement('span', {}, 'redirect'),
    },
    './QueryFeedback': { Wait: () => null },
  });
  const render = () => renderToStaticMarkup(createElement(BackendGate, {}, 'callback'));
  assert.equal(render(), 'callback');
  pathname = '/shelf';
  assert.match(render(), /redirect/);
});
