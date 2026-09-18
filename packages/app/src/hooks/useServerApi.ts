import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBackend } from '../providers/BackendProvider';
import { errorMessage } from '../api/requestOptions';
import { serverKeys } from '../api/serverKeys';

export function useServerQuery<T>(path: string | null, poll = false) {
  const backend = useBackend();
  const cache = useQueryClient();
  const queryKey = serverKeys.resource(backend.scopeId, path);
  const query = useQuery<T>({
    queryKey,
    queryFn: ({ signal }) => backend.request<T>(path!, { signal }),
    enabled: !!backend.me && !!path,
    retry: false,
    refetchInterval: poll
      ? (query) => {
          const value = query.state.data as
            { status?: string; job?: { status: string } } | undefined;
          return ['QUEUED', 'RUNNING'].includes(value?.job?.status ?? value?.status ?? '')
            ? 3000
            : false;
        }
      : false,
  });
  return {
    ...query,
    setData: (value: T | ((previous: T | undefined) => T | undefined)) =>
      cache.setQueryData<T>(queryKey, value),
  };
}

export function useServerCache() {
  const { scopeId } = useBackend();
  const cache = useQueryClient();
  return {
    set: <T>(path: string, value: T) =>
      cache.setQueryData(serverKeys.resource(scopeId, path), value),
  };
}

/** Mutation owns pending/error; local state contains only the screen's success notice. */
export function useAction({ invalidate = true }: { invalidate?: boolean } = {}) {
  const backend = useBackend();
  const locked = useRef(false);
  const [notice, setNotice] = useState('');
  const mutation = useMutation({
    mutationKey: [...serverKeys.user(backend.scopeId), 'action'],
    mutationFn: (action: () => Promise<void>) => action(),
    onSuccess: () => (invalidate ? backend.invalidate() : undefined),
  });
  const run = async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setNotice('');
    try {
      await mutation.mutateAsync(action);
    } catch {
      /* The mutation's error is rendered by the caller. */
    } finally {
      locked.current = false;
    }
  };
  return {
    busy: mutation.isPending,
    message: mutation.error ? errorMessage(mutation.error) : notice,
    setMessage: setNotice,
    run,
  };
}
