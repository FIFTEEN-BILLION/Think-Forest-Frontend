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
const chat = load('api/v1/chat.ts', { './client': load('api/v1/client.ts') });
const setup = load('api/consentSetup.ts', { './v1/chat': chat });
const documents = ['privacy_child', 'ai_conversation'].map((id) => ({
  id,
  title: id,
  version: 'v2',
  body: '문서 전문',
  summary: '요약',
  draft: true,
  draftNotice: '법률 검토 전 초안',
}));
const granted = documents.map((doc) => ({
  documentId: doc.id,
  documentVersion: doc.version,
  current: true,
  status: 'GRANTED',
}));

function render(
  name,
  consents,
  {
    manage = false,
    loading = false,
    error = null,
    role = 'GUEST',
    ready = true,
    needsFirstGreeting = true,
    pathname = '/first-talk',
    scopeId = 'own',
    search = '',
  } = {},
) {
  const module = load('screens/OnboardingScreen.tsx', {
    '../api/consentSetup': setup,
    'react-router-dom': {
      Link: ({ to, children }) => createElement('a', { href: to }, children),
      Navigate: ({ to }) => createElement('a', { href: to }, 'redirect'),
      useNavigate: () => () => {},
      useLocation: () => ({ pathname, search }),
    },
    '../api/requestOptions': { json: () => ({}) },
    '../providers/BackendProvider': {
      useBackend: () => ({
        profileId: 'own-profile',
        scopeId,
        useApi: true,
        me: { user: { role, needsFirstGreeting } },
      }),
    },
    '../hooks/useServerApi': {
      useAction: () => ({ busy: false, message: '' }),
      useServerQuery: (path) => ({
        error,
        data: loading
          ? undefined
          : path === 'first-greeting/readiness'
            ? { available: ready, message: '지금은 AI 대화를 쉬고 있어요.' }
            : { items: path === 'legal-documents' ? documents : consents },
      }),
    },
    '../components/Icon': { Icon: () => null },
    '../components/QueryFeedback': {
      Wait: () => createElement('p', {}, 'loading-or-error'),
      Message: () => null,
    },
  });
  return renderToStaticMarkup(createElement(module[name], { manage }, 'AI_SESSION'));
}

test('first login gates regular and guest users before any child screen mounts', () => {
  for (const role of ['CHILD', 'GUARDIAN', 'GUEST']) {
    for (const consents of [
      [],
      granted.slice(0, 1),
      [{ ...granted[0], current: false }, granted[1]],
      [{ ...granted[0], documentVersion: 'v1' }, granted[1]],
    ]) {
      const html = render('OnboardingGate', consents, { role });
      assert.doesNotMatch(html, /AI_SESSION/);
      assert.match(html, /\/welcome\?next=%2Ffirst-talk/);
    }
    assert.equal(render('OnboardingGate', granted, { role }), 'AI_SESSION');
  }
  assert.doesNotMatch(render('OnboardingGate', granted, { loading: true }), /AI_SESSION/);
  assert.doesNotMatch(
    render('OnboardingGate', granted, { error: new Error('offline') }),
    /AI_SESSION/,
  );
});

test('consent form shows separate unchecked purposes and guardian confirmation', () => {
  for (const role of ['CHILD', 'GUARDIAN', 'GUEST']) {
    const html = render('ConsentSetup', [], { role });
    assert.match(html, /시작 순서/);
    assert.match(html, /보호자이며/);
    assert.match(html, /<button[^>]*disabled/);
    assert.equal((html.match(/type="checkbox"/g) ?? []).length, 3);
    assert.doesNotMatch(html, /checked=""/);
    assert.match(html, /법률 검토 전 초안/);
    assert.match(html, role === 'GUEST' ? /동의하지 않고 기본 체험하기/ : /나중에 할게요/);
  }
});

test('strict first greeting checks both consent and AI readiness before mounting chat', () => {
  assert.doesNotMatch(render('FirstGreetingGate', []), /AI_SESSION/);
  assert.match(render('FirstGreetingGate', granted, { ready: false }), /첫인사를 잠시 기다려/);
  assert.doesNotMatch(render('FirstGreetingGate', granted, { ready: false }), /AI_SESSION/);
  assert.equal(render('FirstGreetingGate', granted), 'AI_SESSION');
});

test('guest deferral is scoped and cannot bypass consent for first greeting', () => {
  setup.deferGuest('jjcp-consent-later:deferred:privacy_child:v2,ai_conversation:v2');
  assert.equal(render('OnboardingGate', [], { scopeId: 'deferred' }), 'AI_SESSION');
  assert.doesNotMatch(render('FirstGreetingGate', [], { scopeId: 'deferred' }), /AI_SESSION/);
  assert.doesNotMatch(render('OnboardingGate', [], { scopeId: 'other' }), /AI_SESSION/);
  assert.doesNotMatch(
    render('OnboardingGate', [], { scopeId: 'deferred', role: 'GUARDIAN' }),
    /AI_SESSION/,
  );
});

test('completed regular users can use basic features after AI withdrawal but not restart AI greeting', () => {
  const options = { role: 'GUARDIAN', needsFirstGreeting: false };
  assert.equal(render('OnboardingGate', granted.slice(0, 1), options), 'AI_SESSION');
  assert.doesNotMatch(render('FirstGreetingGate', granted.slice(0, 1), options), /AI_SESSION/);
  assert.doesNotMatch(render('OnboardingGate', [], options), /AI_SESSION/);
});

test('consent management retains withdrawal and successful setup preserves the intended route', () => {
  const html = render('ConsentSetup', granted, { manage: true });
  assert.match(html, /동의 철회하기/);
  assert.match(html, /href="\/first-talk"/);
  assert.match(
    render('ConsentSetup', granted, { search: '?next=%2Fshelf' }),
    /\/first-talk\?next=%2Fshelf/,
  );
  assert.equal(setup.setupReturnTo('https://evil.example'), '/');
  assert.equal(setup.setupReturnTo('/welcome?next=/welcome'), '/');
  assert.equal(setup.setupReturnTo('/auth/kakao/callback'), '/');
  assert.equal(setup.consentSetupState(documents.slice(0, 1), granted).granted, false);
  assert.equal(
    setup.consentSetupState(documents, [{ ...granted[0], status: 'REVOKED' }, granted[1]]).granted,
    false,
  );
});
