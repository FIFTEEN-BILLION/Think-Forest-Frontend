import type { QueryClient } from '@tanstack/react-query';
import type { Me } from '../types/backend';
import { serverKeys } from './serverKeys';

/** Cancel before removal so a late response cannot repopulate the previous account's cache. */
export async function replaceAccount(cache: QueryClient, me: Me | null) {
  const resources = {
    predicate: (query: { queryKey: readonly unknown[] }) => query.queryKey[0] !== 'auth',
  };
  await cache.cancelQueries(resources);
  cache.removeQueries(resources);
  cache.setQueryData(serverKeys.me, me);
}
