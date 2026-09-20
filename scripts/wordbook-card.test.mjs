import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(
  new URL('../packages/app/src/components/WordbookCard.tsx', import.meta.url),
  'utf8',
);
const module = { exports: {} };
new Function(
  'require',
  'module',
  'exports',
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText,
)(
  (id) =>
    id === '../api/requestOptions' ? { errorMessage: (error) => error.message } : require(id),
  module,
  module.exports,
);
const { WordbookCard } = module.exports;
const word = {
  id: 'word-1',
  word: '관찰',
  reading: '관찰',
  meaning: '자세히 살펴보는 것',
  example: '구름을 관찰했어요.',
  mySentence: '나뭇잎을 관찰했어요.',
  status: 'FAMILIAR',
  updatedAt: '2026-09-20T00:00:00Z',
};
function render(overrides = {}, busy = false) {
  return renderToStaticMarkup(
    createElement(WordbookCard, {
      word: { ...word, ...overrides },
      busy,
      async onSave() {},
      async onDelete() {
        return true;
      },
    }),
  );
}

test('card always shows my sentence and opens a closed, labelled modal for editing', () => {
  const html = render();
  assert.match(html, /<h2>관찰<\/h2>/);
  assert.match(html, /자세히 살펴보는 것/);
  const card = html.split('<dialog')[0];
  assert.match(card, /<blockquote[^>]*>[\s\S]*나뭇잎을 관찰했어요/);
  assert.doesNotMatch(card, /구름을 관찰했어요/);
  assert.doesNotMatch(html, /<details/);
  assert.match(card, /aria-haspopup="dialog"/);
  assert.match(html, /<dialog[^>]*aria-labelledby=/);
  assert.doesNotMatch(html, /<dialog[^>]*\bopen(?:=|>)/);
  assert.match(html, /<textarea[^>]*>나뭇잎을 관찰했어요\.<\/textarea>/);
  assert.match(html, /<option value="FAMILIAR" selected="">/);
  assert.match(html, /type="submit"[^>]*>저장/);
  assert.match(html, /type="button"[^>]*>단어 삭제/);
});

test('all learning states and empty fields render without losing controls', () => {
  for (const [status, label] of [
    ['NEW', '새 단어'],
    ['PRACTICING', '연습 중'],
    ['FAMILIAR', '알아요'],
  ]) {
    const html = render({ status, reading: null, example: '', mySentence: null }, true);
    assert.ok(html.includes(label));
    assert.match(html, new RegExp(`<option value="${status}" selected="">`));
    assert.equal((html.match(/disabled=""/g) ?? []).length, 5);
    assert.doesNotMatch(html, /<blockquote>/);
  }
});

test('empty and whitespace-only sentences show the example without saving it as input', () => {
  for (const mySentence of [null, '', '   ']) {
    const html = render({ mySentence });
    const card = html.split('<dialog')[0];
    assert.match(card, /<small>예문<\/small><p>구름을 관찰했어요\.<\/p>/);
    assert.match(html, /placeholder="구름을 관찰했어요\."/);
    assert.doesNotMatch(html, /<textarea[^>]*>구름을 관찰했어요\.<\/textarea>/);
  }
});

test('word cards have four, three, two and single-column responsive layouts', () => {
  const css = readFileSync(
    new URL('../packages/app/src/styles/server.css', import.meta.url),
    'utf8',
  );
  const rules = [...css.matchAll(/\.api-page \.word-pocket-grid \{([^}]+)\}/g)].map(
    (match) => match[1],
  );
  assert.equal(rules.length, 4);
  [4, 3, 2].forEach((columns, index) =>
    assert.ok(rules[index].includes(`repeat(${columns}, minmax(0, 1fr))`)),
  );
  assert.match(rules[3], /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(rules[0], /align-items: start/);
});
