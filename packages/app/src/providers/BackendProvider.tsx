import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/ApiClientProvider';
import { ApiError } from '../api/client';
import { errorMessage, json } from '../api/requestOptions';
import { replaceAccount } from '../api/serverCache';
import { serverKeys } from '../api/serverKeys';
import type { Me, Token } from '../types/backend';

type Request = <T>(path: string, options?: RequestInit) => Promise<T>;
interface Backend {
  devLoginEnabled: boolean;
  me: Me | null;
  loading: boolean;
  error: string;
  demo: boolean;
  setDemo: (value: boolean) => void;
  request: Request;
  login: (role: 'CHILD' | 'GUARDIAN') => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  invalidate: () => Promise<void>;
}
const Context = createContext<Backend | null>(null);

/** Context exposes the authenticated transport; TanStack Query owns all account data. */
export function BackendProvider({
  children,
  devLoginEnabled = false,
}: PropsWithChildren<{ devLoginEnabled?: boolean }>) {
  const api = useApiClient();
  const cache = useQueryClient();
  // Credentials remain in memory, outside both the query cache and browser storage.
  const token = useRef('');
  const refresh = useRef<Promise<string> | null>(null);
  const [demo, setDemo] = useState(false);
  const renew = useCallback(async () => {
    if (!refresh.current) {
      refresh.current = api<Token>('api/v1/auth/token/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
        .then((r) => {
          token.current = r.accessToken;
          return r.accessToken;
        })
        .finally(() => {
          refresh.current = null;
        });
    }
    return refresh.current;
  }, [api]);
  const request = useCallback<Request>(
    async <T,>(path: string, options: RequestInit = {}) => {
      const perform = () => {
        const headers = new Headers(options.headers);
        if (token.current) headers.set('Authorization', `Bearer ${token.current}`);
        return api<T>(`api/v1/${path.replace(/^\//, '')}`, {
          ...options,
          headers,
          credentials: 'include',
        });
      };
      try {
        return await perform();
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error;
        try {
          await renew();
        } catch (refreshError) {
          if (refreshError instanceof ApiError && refreshError.status === 401) {
            token.current = '';
            await replaceAccount(cache, null);
          }
          throw refreshError;
        }
        return perform();
      }
    },
    [api, cache, renew],
  );
  const account = useQuery<Me | null>({
    queryKey: serverKeys.me,
    queryFn: async () => {
      try {
        if (!token.current) await renew();
        return await request<Me>('me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: Infinity,
  });
  const refreshMe = useCallback(async () => {
    await cache.fetchQuery({
      queryKey: serverKeys.me,
      queryFn: () => request<Me>('me'),
      staleTime: 0,
    });
  }, [cache, request]);
  const login = useMutation({
    mutationKey: ['auth', 'login'],
    mutationFn: async (role: 'CHILD' | 'GUARDIAN') => {
      const key = `jjcp-device-${role.toLowerCase()}`;
      let deviceKey = localStorage.getItem(key);
      if (!deviceKey) {
        deviceKey = crypto.randomUUID();
        localStorage.setItem(key, deviceKey);
      }
      const result = await api<Token>('api/v1/auth/dev/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceKey, nickname: role === 'CHILD' ? '새싹' : '보호자' }),
      });
      token.current = result.accessToken;
      const me = await request<Me>('me');
      if (role === 'GUARDIAN' && me.user.role !== 'GUARDIAN') {
        await request('auth/guardian/enroll', json({ intent: role }));
        return request<Me>('me');
      }
      return me;
    },
    onSuccess: async (me) => {
      await replaceAccount(cache, me);
      setDemo(false);
    },
  });
  const logout = useMutation({
    mutationKey: ['auth', 'logout'],
    mutationFn: () => request('auth/logout', json({})),
    onSuccess: async () => {
      token.current = '';
      await replaceAccount(cache, null);
      login.reset();
    },
  });
  const failure = login.error ?? logout.error ?? account.error;
  return (
    <Context.Provider
      value={{
        devLoginEnabled,
        me: account.data ?? null,
        loading: account.isPending || login.isPending || logout.isPending,
        error: failure ? errorMessage(failure) : '',
        demo,
        setDemo,
        request,
        refreshMe,
        login: async (role) => {
          logout.reset();
          try {
            await login.mutateAsync(role);
          } catch {
            /* Render mutation error. */
          }
        },
        logout: async () => {
          try {
            await logout.mutateAsync();
          } catch {
            /* Render mutation error. */
          }
        },
        invalidate: () =>
          cache.invalidateQueries({ queryKey: serverKeys.user(account.data?.user.id) }),
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useBackend() {
  const context = useContext(Context);
  if (!context) throw new Error('BackendProvider is required');
  return context;
}
