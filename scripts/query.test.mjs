import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const source = ts.transpileModule(
    readFileSync(new URL(`../packages/app/src/api/${name}.ts`, import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (id) => (id.startsWith('./') ? load(id.slice(2)) : require(id)),
    module,
    module.exports,
  );
  modules.set(name, module.exports);
  return module.exports;
}
const { serverKeys } = load('serverKeys');
const { replaceAccount } = load('serverCache');
const { createQueryClient } = load('queryClient');

test('same query filters share a cache entry, while accounts and filters stay isolated', (t) => {
  const cache = createQueryClient();
  t.after(() => cache.clear());
  cache.setQueryData(serverKeys.resource('child', 'records?kind=STORY&cursor=abc'), {
    items: ['mine'],
  });
  assert.deepEqual(
    cache.getQueryData(serverKeys.resource('child', '/records?cursor=abc&kind=STORY')),
    { items: ['mine'] },
  );
  assert.equal(
    cache.getQueryData(serverKeys.resource('guardian', 'records?kind=STORY&cursor=abc')),
    undefined,
  );
  assert.equal(
    cache.getQueryData(serverKeys.resource('child', 'records?kind=ACTIVITY&cursor=abc')),
    undefined,
  );
});

test('mutation invalidation refreshes all views belonging to the current account only', async (t) => {
  const cache = createQueryClient();
  t.after(() => cache.clear());
  const home = serverKeys.resource('child', 'home');
  const shelf = serverKeys.resource('child', 'records');
  const guardian = serverKeys.resource('guardian', 'guardian/children');
  for (const key of [home, shelf, guardian, serverKeys.me]) cache.setQueryData(key, {});
  await cache.invalidateQueries({ queryKey: serverKeys.user('child') });
  assert.equal(cache.getQueryState(home).isInvalidated, true);
  assert.equal(cache.getQueryState(shelf).isInvalidated, true);
  assert.equal(cache.getQueryState(guardian).isInvalidated, false);
  assert.equal(cache.getQueryState(serverKeys.me).isInvalidated, false);
});

test('account replacement cancels old requests before removing their cached records', async (t) => {
  const cache = createQueryClient();
  t.after(() => cache.clear());
  const oldKey = serverKeys.resource('child', 'home');
  cache.setQueryData(serverKeys.resource('child', 'words'), { items: ['private'] });
  let finish;
  let aborted = false;
  const pending = cache
    .fetchQuery({
      queryKey: oldKey,
      queryFn: ({ signal }) => {
        signal.addEventListener('abort', () => {
          aborted = true;
        });
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
    })
    .catch(() => undefined);
  const guardian = { user: { id: 'guardian', role: 'GUARDIAN' }, profile: null };
  await replaceAccount(cache, guardian);
  finish({ nickname: 'old child' });
  await pending;
  assert.equal(aborted, true);
  assert.equal(cache.getQueryData(oldKey), undefined);
  assert.equal(cache.getQueryData(serverKeys.resource('child', 'words')), undefined);
  assert.deepEqual(cache.getQueryData(serverKeys.me), guardian);
  await replaceAccount(cache, null);
  assert.equal(cache.getQueryData(serverKeys.me), null);
});
