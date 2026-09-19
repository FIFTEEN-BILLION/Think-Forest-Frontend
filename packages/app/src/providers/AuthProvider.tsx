import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { createV1Client, V1_BASE_URL } from '../api/v1/client';
import type { V1Client } from '../api/v1/client';
import { devLogin, kakaoAuthorizeUrl, logout as logoutRequest } from '../api/v1/endpoints';
import type { AuthUser } from '../api/v1/types';
import { useApiClient } from '../api/ApiClientProvider';
import { createV1Fetch } from '../api/v1/transport';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  client: V1Client;
  /** 호스트(웹 진입점)가 켠 경우에만 true */
  devLoginEnabled: boolean;
  loginWithKakao: (returnTo: string) => void;
  loginAsDev: (nickname?: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const DEVICE_KEY = 'jjcp-device-child';

// 같은 기기는 같은 개발용 사용자로 로그인하도록 기기 키를 보관한다. 저장소가 막혀도 동작한다.
let memoryDeviceKey = '';
function deviceKey() {
  try {
    const saved = localStorage.getItem(DEVICE_KEY);
    if (saved) return saved;
    const created = `web-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_KEY, created);
    return created;
  } catch {
    memoryDeviceKey ||= `web-${crypto.randomUUID()}`;
    return memoryDeviceKey;
  }
}

type AuthProviderProps = PropsWithChildren<{
  /** API v1 기본 경로. 웹은 같은 출처 프록시(`/api/v1`)를 쓴다. */
  baseUrl?: string;
  devLoginEnabled?: boolean;
}>;

export function AuthProvider({
  baseUrl = V1_BASE_URL,
  devLoginEnabled = false,
  children,
}: AuthProviderProps) {
  const api = useApiClient();
  const client = useMemo(
    () => createV1Client({ baseUrl, fetch: createV1Fetch(api, baseUrl) }),
    [api, baseUrl],
  );
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = client.subscribe((session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setStatus(session ? 'signedIn' : 'signedOut');
    });
    // 새로고침 뒤 HttpOnly refresh 쿠키로 세션을 되살린다. 실패하면 로그아웃 상태로 둔다.
    client
      .refresh()
      .catch(() => null)
      .then((session) => {
        if (active && !session) setStatus('signedOut');
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [client]);

  const loginWithKakao = useCallback(
    (returnTo: string) => window.location.assign(kakaoAuthorizeUrl(returnTo, client.baseUrl)),
    [client],
  );
  const loginAsDev = useCallback(
    async (nickname?: string) =>
      (await devLogin(client, { deviceKey: deviceKey(), ...(nickname ? { nickname } : {}) })).user,
    [client],
  );
  const logout = useCallback(() => logoutRequest(client), [client]);
  const updateUser = useCallback((patch: Partial<AuthUser>) => client.updateUser(patch), [client]);

  const value = useMemo(
    () => ({
      status,
      user,
      client,
      devLoginEnabled,
      loginWithKakao,
      loginAsDev,
      logout,
      updateUser,
    }),
    [status, user, client, devLoginEnabled, loginWithKakao, loginAsDev, logout, updateUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value)
    throw new Error('useAuth 는 AuthProvider(또는 AppProviders) 안에서만 쓸 수 있습니다.');
  return value;
}
