import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

// F2 책장·단어·공유의 순수 도우미만 확인한다. React 없이 api/v1 모듈만 컴파일해 부른다.
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
const { V1Error } = load(resolve(root, 'client.ts'));
const f2 = load(resolve(root, 'endpoints.ts'));

const story = (over = {}) => ({
  id: 'sty_1',
  title: '컵 밖에서 만난 물방울',
  summary: '물방울이 어디에서 왔는지 알아본 이야기',
  category: 'SCIENCE',
  favorite: false,
  version: 2,
  sourceConversationId: 'cnv_1',
  createdAt: '2026-09-17T10:00:00Z',
  updatedAt: '2026-09-18T02:08:19Z',
  ...over,
});

const local = (over = {}) => ({
  id: 'rec_1',
  title: '그림자 탐구',
  text: '막대를 세우고 그림자를 재어 봤어요.',
  date: '2026-09-16',
  favorite: false,
  source: 'local',
  ...over,
});

test('storyListQuery 는 빈 조건을 빼고 favorite 은 켰을 때만 보낸다', () => {
  assert.deepEqual(f2.storyListQuery({}), {
    query: undefined,
    category: undefined,
    favorite: undefined,
    from: undefined,
    to: undefined,
    cursor: undefined,
    limit: undefined,
  });
  const built = f2.storyListQuery({
    query: '  물방울  ',
    category: 'SCIENCE',
    favorite: true,
    from: '2026-09-01',
    to: '2026-09-30',
    limit: 20,
  });
  assert.equal(built.query, '물방울');
  assert.equal(built.favorite, 'true');
  assert.equal(built.category, 'SCIENCE');
  assert.equal(built.limit, 20);
  assert.equal(f2.storyListQuery({ query: '   ' }).query, undefined);
  assert.equal(f2.storyListQuery({ favorite: false }).favorite, undefined);
});

test('isVersionConflict·conflictVersion 은 409 충돌만 알아본다', () => {
  const conflict = new V1Error(409, 'VERSION_CONFLICT', '다른 곳에서 먼저 고쳤어요.', {
    currentVersion: 7,
  });
  assert.equal(f2.isVersionConflict(conflict), true);
  assert.equal(f2.conflictVersion(conflict), 7);
  assert.equal(
    f2.isVersionConflict(new V1Error(409, 'BOOK_COMPLETED', '이미 완성한 책이에요.')),
    false,
  );
  assert.equal(f2.isVersionConflict(new V1Error(400, 'INVALID_INPUT', 'x')), false);
  assert.equal(f2.isVersionConflict(new Error('그냥 오류')), false);
  assert.equal(f2.conflictVersion(new Error('그냥 오류')), null);
  assert.equal(f2.conflictVersion(new V1Error(409, 'VERSION_CONFLICT', 'x')), null);
});

test('isServerStoryId 는 sty_ 로 시작하는 서버 이야기만 고른다', () => {
  assert.equal(f2.isServerStoryId('sty_abc'), true);
  assert.equal(f2.isServerStoryId('rec_abc'), false);
  assert.equal(f2.isServerStoryId(undefined), false);
  assert.equal(f2.isServerStoryId(null), false);
});

test('toShelfItem 은 서버 이야기를 책장 카드로 옮긴다', () => {
  const item = f2.toShelfItem(story());
  assert.equal(item.origin, 'server');
  assert.equal(item.date, '2026-09-18');
  assert.equal(item.version, 2);
  assert.equal(item.href, '/shelf/sty_1');
});

test('localShelfMatches 는 서버 검색 조건을 기기 기록에도 똑같이 건다', () => {
  const record = local({ text: '막대 그림자를 재어 봤어요', favorite: true, date: '2026-09-16' });
  assert.equal(f2.localShelfMatches(record, {}), true);
  assert.equal(f2.localShelfMatches(record, { query: '그림자' }), true);
  assert.equal(f2.localShelfMatches(record, { query: '물방울' }), false);
  assert.equal(f2.localShelfMatches(record, { favorite: true }), true);
  assert.equal(f2.localShelfMatches(local(), { favorite: true }), false);
  assert.equal(f2.localShelfMatches(record, { from: '2026-09-17' }), false);
  assert.equal(f2.localShelfMatches(record, { to: '2026-09-15' }), false);
  assert.equal(f2.localShelfMatches(record, { from: '2026-09-01', to: '2026-09-30' }), true);
  // 종류는 서버 이야기에만 있다. 종류를 고르면 기기 기록은 빠진다.
  assert.equal(f2.localShelfMatches(record, { category: 'SCIENCE' }), false);
});

test('mergeShelf 는 두 목록을 최근 순으로 합치고 저장 위치를 표시한다', () => {
  const items = f2.mergeShelf(
    [story(), story({ id: 'sty_2', updatedAt: '2026-09-10T00:00:00Z' })],
    [local(), local({ id: 'rec_2', source: 'mock', date: '2026-09-18' })],
  );
  assert.deepEqual(
    items.map((item) => [item.id, item.origin, item.date]),
    [
      ['sty_1', 'server', '2026-09-18'],
      ['rec_2', 'sample', '2026-09-18'],
      ['rec_1', 'local', '2026-09-16'],
      ['sty_2', 'server', '2026-09-10'],
    ],
  );
  // 같은 날이면 서버 기록이 먼저 온다.
  assert.equal(items[0].origin, 'server');
  assert.equal(f2.SHELF_ORIGIN_LABEL.local, '이 기기에만 있어요');
});

test('mergeShelf 는 조건을 기기 기록에도 적용한다', () => {
  const items = f2.mergeShelf([story()], [local()], { query: '물방울' });
  assert.deepEqual(
    items.map((item) => item.id),
    ['sty_1'],
  );
});

test('nextReviewLabel 은 다음 복습 날짜를 아이 말로 바꾼다 (점수 없음)', () => {
  const now = new Date('2026-09-18T00:00:00Z');
  assert.equal(f2.nextReviewLabel(null, now), '다시 만날 날은 아직 정하지 않았어요');
  assert.equal(f2.nextReviewLabel('그냥 글자', now), '다시 만날 날은 아직 정하지 않았어요');
  assert.equal(f2.nextReviewLabel('2026-09-17T00:00:00Z', now), '오늘 다시 만나 볼까요?');
  assert.equal(f2.nextReviewLabel('2026-09-19T00:00:00Z', now), '내일 다시 만나요');
  assert.equal(f2.nextReviewLabel('2026-09-21T00:00:00Z', now), '3일 뒤에 다시 만나요');
});

test('wordStatusLabel·wordStatusTone 은 세 상태를 모두 안다', () => {
  assert.equal(f2.wordStatusLabel('NEW'), '처음 만났어요');
  assert.equal(f2.wordStatusLabel('PRACTICING'), '연습 중이에요');
  assert.equal(f2.wordStatusLabel('FAMILIAR'), '이제 알아요');
  assert.equal(f2.wordStatusTone('FAMILIAR'), 'teal');
});

test('shareStatusText 는 보호자 승인 단계를 아이 말로 설명한다', () => {
  const pending = f2.shareStatusText('PENDING_GUARDIAN');
  assert.equal(pending.cancellable, true);
  assert.match(pending.help, /보호자/);
  assert.equal(f2.shareStatusText('PUBLISHED').cancellable, false);
  assert.equal(f2.shareStatusText('APPROVED').cancellable, false);
  assert.equal(f2.shareStatusText('CANCELLED').cancellable, false);
  assert.equal(f2.shareStatusText('REVOKED').label, '지금은 숨겨 뒀어요');
  assert.equal(f2.shareAudienceLabel('FAMILY'), '가족만');
});

test('applyRecommendation 은 추천을 한 번만 세고 0 아래로 내려가지 않는다', () => {
  const items = [
    { id: 'pub_1', recommendationCount: 3, recommendedByMe: false },
    { id: 'pub_2', recommendationCount: 0, recommendedByMe: false },
  ];
  const on = f2.applyRecommendation(items, 'pub_1', true);
  assert.deepEqual(on[0], { id: 'pub_1', recommendationCount: 4, recommendedByMe: true });
  // 이미 추천한 상태에서 또 추천해도 개수는 그대로다.
  assert.deepEqual(f2.applyRecommendation(on, 'pub_1', true)[0].recommendationCount, 4);
  assert.deepEqual(f2.applyRecommendation(on, 'pub_1', false)[0], {
    id: 'pub_1',
    recommendationCount: 3,
    recommendedByMe: false,
  });
  assert.equal(f2.applyRecommendation(items, 'pub_2', false)[1].recommendationCount, 0);
  assert.equal(f2.applyRecommendation(items, 'pub_없음', true)[0].recommendationCount, 3);
});

test('reorderStories 는 책 속 차례를 바꾸고 범위를 벗어나면 그대로 둔다', () => {
  const ids = ['a', 'b', 'c'];
  assert.deepEqual(f2.reorderStories(ids, 0, 1), ['b', 'a', 'c']);
  assert.deepEqual(f2.reorderStories(ids, 2, 0), ['c', 'a', 'b']);
  assert.deepEqual(f2.reorderStories(ids, 1, 1), ids);
  assert.deepEqual(f2.reorderStories(ids, -1, 0), ids);
  assert.deepEqual(f2.reorderStories(ids, 0, 3), ids);
  assert.deepEqual(ids, ['a', 'b', 'c']);
  assert.deepEqual(f2.bookStoryIds({ stories: [story(), story({ id: 'sty_2' })] }), [
    'sty_1',
    'sty_2',
  ]);
});

test('categoryLabel·categoryEmoji 는 모르는 값에도 기본을 준다', () => {
  assert.equal(f2.categoryLabel('SCIENCE'), '과학');
  assert.equal(f2.categoryEmoji('IMAGINATION'), '✨');
  assert.equal(f2.categoryLabel('WHAT'), '이야기');
  assert.equal(f2.categoryEmoji(null), '📖');
});
