import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBackend } from '../providers/BackendProvider';
import { useServerQuery } from './useServerApi';
import { serverKeys } from '../api/serverKeys';
import { ApiError } from '../api/client';
import { json } from '../api/requestOptions';
import type { ChatSession } from '../types/conversation';

/** Opening a conversation is a mutation; subsequent reads share its canonical cache entry. */
export function useConversation({
  greeting,
  existing,
  topic,
}: {
  greeting: boolean;
  existing: string | null;
  topic: string;
}) {
  const backend = useBackend();
  const cache = useQueryClient();
  const prefix = greeting ? 'first-greeting/sessions' : 'conversations';
  const [sessionId, setSessionId] = useState(existing);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const started = useRef(false);
  const storageKey = `jjcp-active-${backend.me?.user.id}-${prefix}-${topic}`;
  const query = useServerQuery<ChatSession>(sessionId ? `${prefix}/${sessionId}` : null);
  const start = useMutation({
    mutationKey: [...serverKeys.user(backend.me?.user.id), 'start-conversation', prefix, topic],
    mutationFn: async () => {
      const remembered = sessionStorage.getItem(storageKey);
      if (remembered) {
        try {
          const session = await cache.fetchQuery({
            queryKey: serverKeys.resource(backend.me?.user.id, `${prefix}/${remembered}`),
            queryFn: ({ signal }) =>
              backend.request<ChatSession>(`${prefix}/${remembered}`, { signal }),
            staleTime: 0,
          });
          if (['ACTIVE', 'READY_TO_FINISH'].includes(session.status)) return session;
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 404) throw error;
        }
        sessionStorage.removeItem(storageKey);
      }
      const options = json(greeting ? {} : { topicId: topic, inputMode: 'TEXT', locale: 'ko-KR' });
      options.headers = { ...options.headers, 'Idempotency-Key': idempotencyKey };
      return backend.request<ChatSession>(prefix, options);
    },
    onSuccess: (result) => {
      const id = result.sessionId ?? result.conversationId!;
      cache.setQueryData(serverKeys.resource(backend.me?.user.id, `${prefix}/${id}`), result);
      sessionStorage.setItem(storageKey, id);
      setSessionId(id);
    },
  });
  const { mutate } = start;
  useEffect(() => {
    if (!existing && !started.current && backend.me?.user.role === 'CHILD') {
      started.current = true;
      mutate();
    }
  }, [existing, backend.me?.user.role, mutate]);
  return {
    data: query.data,
    error: start.error ?? query.error,
    setData: query.setData,
    retry: () => (sessionId ? query.refetch() : mutate()),
  };
}
