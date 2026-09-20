import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const parts = read('packages/app/src/components/GuardianParts.tsx');
const parent = read('packages/app/src/screens/ParentScreens.tsx');
const css = read('packages/app/src/styles/guardian.css');
const routes = [
  '/profile',
  '/guardian/consent',
  '/guardian/links',
  '/guardian/share',
  '/guardian/report',
  '/guardian/safety',
  '/guardian/consultation',
  '/tech',
  '/data',
];

function load(source, overrides = {}) {
  const module = { exports: {} };
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('require', 'module', 'exports', js)(
    (id) => overrides[id] ?? (id === 'react' || id === 'react/jsx-runtime' ? require(id) : {}),
    module,
    module.exports,
  );
  return module.exports;
}

test('guardian navigation lists all nine screens and identifies the active screen', () => {
  const { GuardianNav } = load(parts, {
    'react-router-dom': {
      NavLink: ({ to, className, children }) =>
        createElement(
          'a',
          {
            href: to,
            className: className({ isActive: to === '/profile' }),
            'aria-current': to === '/profile' ? 'page' : undefined,
          },
          children,
        ),
    },
  });
  const html = renderToStaticMarkup(createElement(GuardianNav));
  assert.match(html, /aria-label="보호자 화면"/);
  assert.equal((html.match(/<a /g) ?? []).length, 9);
  for (const route of routes) assert.ok(html.includes(`href="${route}"`));
  assert.match(html, /class="chip active" aria-current="page"/);
});

test('only protected parent routes receive the compact workspace and a single common nav', () => {
  const { ProtectedParentScreen } = load(parent, {
    '../providers/BackendProvider': { useBackend: () => ({ scopeId: 'test' }) },
    '../components/GuardianParts': {
      GuardianProvider: ({ children }) => children,
      GuardianNav: () => createElement('nav', { 'aria-label': '보호자 화면' }),
    },
    'react-router-dom': { Outlet: () => createElement('div', null, '현재 화면') },
  });
  const html = renderToStaticMarkup(createElement(ProtectedParentScreen));
  assert.match(html, /class="guardian-workspace"/);
  assert.match(html, /class="guardian-content"/);
  assert.equal((html.match(/<nav /g) ?? []).length, 1);
  assert.equal((parent.match(/<GuardianNav \/>/g) ?? []).length, 1);
  assert.equal((parts.match(/<GuardianNav \/>/g) ?? []).length, 0);
  const router = read('apps/web/src/router.tsx');
  const guardianRoutes = router.slice(router.indexOf('ProtectedParentScreen }),'));
  for (const route of routes) assert.ok(guardianRoutes.includes(`'${route.slice(1)}'`));
});

test('guardian typography, controls, tables and mobile sizing are scoped away from child screens', () => {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, selector] of withoutComments.matchAll(/([^{}]+)\{/g)) {
    if (selector.trim().startsWith('@')) continue;
    assert.ok(selector.includes('.guardian-workspace'), selector);
  }
  assert.match(css, /\.guardian-workspace p \{[^}]*font-size: 14px;/);
  assert.match(css, /\.guardian-workspace \.table-wrap \{[^}]*overflow-x: auto;/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*font-size: 16px;/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*min-height: 44px;/);
  assert.match(css, /focus-visible/);
});

test('danger confirmations and sharing review requirements remain intact', () => {
  assert.equal((parent.match(/className="panel guardian-danger-zone"/g) ?? []).length, 2);
  assert.match(parent, /f.get\('confirmation'\) !== 'DELETE'/);
  assert.match(parent, /삭제 예약 취소/);
  const share = read('packages/app/src/screens/guardian/ShareApprovalScreen.tsx');
  assert.match(share, /disabled=\{busy \|\| !read\}/);
  assert.match(share, /open=\{pending\}/);
  assert.match(share, /approveShareRequest\(client, request.id, version/);
});
