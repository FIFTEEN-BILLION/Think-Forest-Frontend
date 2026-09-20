import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(path) {
  const module = { exports: {} };
  new Function(
    'require',
    'module',
    'exports',
    ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
  )(
    (name) => {
      if (!name.startsWith('.')) return require(name);
      const base = resolve(dirname(path), name);
      return load(existsSync(`${base}.tsx`) ? `${base}.tsx` : `${base}.ts`);
    },
    module,
    module.exports,
  );
  return module.exports;
}
const { StoryReader, journeyEntries } = load(
  fileURLToPath(new URL('../packages/app/src/components/StoryReader.tsx', import.meta.url)),
);
const idea = '공기 속 수증기가 차가운 컵에 닿은 것 같아';
const journey = {
  initialIdea: idea,
  evidence: [idea, idea],
  alternatives: ['빈 컵도 차갑게 해 볼까?'],
  finalReflection: idea,
};

test('repeated journey quotes render once with all their stage labels', () => {
  const entries = journeyEntries(journey);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].text, idea);
  assert.deepEqual(entries[0].labels, ['처음 떠올린 생각', '생각의 단서', '마지막에 남긴 생각']);
  assert.deepEqual(entries[1].labels, ['다르게 바라본 생각']);
  assert.equal(journey.evidence.length, 2);
});

test('reader keeps edited body paragraphs and includes alternatives and guest guidance', () => {
  const html = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(StoryReader, {
        detail: {
          story: {
            title: '나만의 물방울 이야기',
            category: 'SCIENCE',
            createdAt: '2026-09-20T23:00:00Z',
            body: '일부러 반복한 문장.\n\n일부러 반복한 문장.',
            thoughtJourney: journey,
          },
          wordsUsed: [],
        },
        guest: true,
        actions: null,
        management: createElement('button', null, '기록 삭제'),
      }),
    ),
  );
  assert.equal((html.match(/<p>일부러 반복한 문장\.<\/p>/g) ?? []).length, 2);
  assert.equal((html.match(new RegExp(idea, 'g')) ?? []).length, 1);
  assert.match(html, /빈 컵도 차갑게 해 볼까/);
  assert.match(html, /2026년 9월 21일/);
  assert.match(html, /공유는 정식 계정에서/);
  assert.match(html, /<details[^>]*><summary>이야기 관리<\/summary>/);
});

test('empty activity journeys do not invent a change in thought', () => {
  assert.deepEqual(
    journeyEntries({ initialIdea: '', evidence: [], alternatives: [], finalReflection: '' }),
    [],
  );
});
