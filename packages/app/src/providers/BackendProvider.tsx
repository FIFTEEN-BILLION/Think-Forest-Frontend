import { createContext, useCallback, useContext, useRef } from 'react';
import type { PropsWithChildren } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/ApiClientProvider';
import { ApiError } from '../api/client';
import { errorMessage } from '../api/requestOptions';
import { replaceAccount } from '../api/serverCache';
import { serverKeys } from '../api/serverKeys';
import type { Me } from '../types/backend';
import { useAuth } from './AuthProvider';

type Request = <T>(path: string, options?: RequestInit) => Promise<T>;
interface Backend {
  devLoginEnabled: boolean;
  me: Me | null;
  loading: boolean;
  error: string;
  profileId: string;
  scopeId: string;
  request: Request;
  login: () => Promise<void>;
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
  const auth = useAuth();
  // 세션은 AuthProvider 의 v1 클라이언트 하나만 갖는다. 여기서 또 refresh 하면
  // 서버가 refresh 토큰을 돌려 발급할 때 서로의 세션을 끊는다.
  const token = useRef(auth.client.getSession()?.accessToken ?? '');
  const renew = useCallback(async () => {
    const session = await auth.client.refresh();
    if (!session) {
      token.current = '';
      throw new ApiError(401, '{"error":{"code":"UNAUTHORIZED"}}');
    }
    token.current = session.accessToken;
    return session.accessToken;
  }, [auth]);
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
        if (
          !(error instanceof ApiError) ||
          error.status !== 401 ||
          error.body.includes('REAUTH_REQUIRED')
        )
          throw error;
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
    enabled: auth.status !== 'loading',
    queryFn: async () => {
      if (auth.status === 'signedOut') return null;
      token.current = auth.client.getSession()?.accessToken ?? token.current;
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
    const previous = cache.getQueryData<Me | null>(serverKeys.me);
    const next = await request<Me>('me');
    const before = previous?.profiles.find((p) => p.isDefault)?.id;
    const after = next.profiles.find((p) => p.isDefault)?.id;
    // Cancel reads for the previous child before exposing the new profile.
    if (previous?.user.id !== next.user.id || before !== after) await replaceAccount(cache, next);
    else cache.setQueryData(serverKeys.me, next);
  }, [cache, request]);
  const login = useMutation({
    mutationKey: ['auth', 'login'],
    mutationFn: async () => {
      // 개발용 로그인도 v1 클라이언트를 거쳐야 세션이 한 벌로 유지된다.
      await auth.loginAsDev('새싹');
      token.current = auth.client.getSession()?.accessToken ?? '';
      return await request<Me>('me');
    },
    onSuccess: async (me) => {
      await replaceAccount(cache, me);
    },
  });
  const logout = useMutation({
    mutationKey: ['auth', 'logout'],
    mutationFn: () => auth.logout(),
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
        loading:
          auth.status === 'loading' || account.isPending || login.isPending || logout.isPending,
        error: failure ? errorMessage(failure) : '',
        profileId:
          account.data?.profiles.find((p) => p.isDefault)?.id ?? account.data?.profile?.id ?? '',
        scopeId: `${account.data?.user.id ?? ''}:${account.data?.profiles.find((p) => p.isDefault)?.id ?? ''}`,
        request,
        refreshMe,
        login: async () => {
          logout.reset();
          try {
            await login.mutateAsync();
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
          cache.invalidateQueries({
            predicate: (q) => q.queryKey[0] === 'server' && q.queryKey[1] !== 'auth',
          }),
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
