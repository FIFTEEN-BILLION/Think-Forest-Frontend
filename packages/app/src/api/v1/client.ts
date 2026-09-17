// JJCP API v1 HTTP 클라이언트. React 에 의존하지 않는 순수 모듈이라 node 테스트에서 바로 불러 쓴다.
// - access token 은 메모리에만 둔다. refresh token 은 서버가 HttpOnly 쿠키로 관리한다.
// - 401 이면 refresh 를 한 번만(동시 요청끼리 공유) 시도하고 원래 요청을 한 번 다시 보낸다.

import type { AuthUser, TokenResponse } from './types';

export const V1_BASE_URL = '/api/v1';
const REFRESH_PATH = '/auth/token/refresh';

export class V1Error extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> = {},
    public readonly requestId: string | null = null,
  ) {
    super(message);
    this.name = 'V1Error';
  }
}

const fallbackMessage = (status: number) =>
  status === 0
    ? '인터넷 연결을 확인해 주세요.'
    : status >= 500
      ? '잠시 뒤에 다시 시도해 주세요.'
      : '요청을 처리하지 못했어요.';

const fallbackCode = (status: number) =>
  status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : `HTTP_${status}`;

/** `{error:{code,message,details,requestId}}` 본문을 V1Error 로 바꾼다. 모양이 달라도 던질 수 있는 값을 만든다. */
export function parseV1Error(status: number, bodyText: string, headerRequestId?: string | null) {
  let error: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(bodyText) as { error?: unknown };
    if (parsed && typeof parsed.error === 'object' && parsed.error !== null)
      error = parsed.error as Record<string, unknown>;
  } catch {
    error = null;
  }
  const code = typeof error?.code === 'string' && error.code ? error.code : fallbackCode(status);
  const message =
    typeof error?.message === 'string' && error.message ? error.message : fallbackMessage(status);
  const details =
    error?.details && typeof error.details === 'object'
      ? (error.details as Record<string, unknown>)
      : {};
  const requestId =
    typeof error?.requestId === 'string' ? error.requestId : (headerRequestId ?? null);
  return new V1Error(status, code, message, details, requestId);
}

export function newIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export interface V1RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  idempotencyKey?: string;
  signal?: AbortSignal;
  /** false 면 Authorization 을 붙이지 않고 401 에서 refresh 도 하지 않는다. */
  auth?: boolean;
}

export interface V1ClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
  /** 여러 탭이 같은 refresh 쿠키를 동시에 쓰지 않게 막는다. 기본값은 Web Locks(있을 때). */
  lock?: <T>(name: string, task: () => Promise<T>) => Promise<T>;
}

type Listener = (session: AuthSession | null) => void;

function defaultLock<T>(name: string, task: () => Promise<T>): Promise<T> {
  const locks = (globalThis.navigator as Navigator | undefined)?.locks;
  // request() resolves with the task result, but lib.dom types it as Promise<Promise<T>>.
  return locks ? (locks.request(name, task) as unknown as Promise<T>) : task();
}

export function createV1Client(options: V1ClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? V1_BASE_URL).replace(/\/$/, '');
  const doFetch: typeof fetch = options.fetch ?? ((input, init) => fetch(input, init));
  const lock = options.lock ?? defaultLock;
  let session: AuthSession | null = null;
  let refreshing: Promise<AuthSession | null> | null = null;
  const listeners = new Set<Listener>();

  const setSession = (next: AuthSession | null) => {
    session = next;
    listeners.forEach((listener) => listener(next));
  };

  const url = (path: string, query?: V1RequestOptions['query']) => {
    const search = new URLSearchParams();
    Object.entries(query ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
    });
    const qs = search.toString();
    return `${baseUrl}/${path.replace(/^\//, '')}${qs ? `?${qs}` : ''}`;
  };

  async function send(path: string, opts: V1RequestOptions, token: string | null) {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
    try {
      return await doFetch(url(path, opts.query), {
        method: opts.method ?? (opts.body === undefined ? 'GET' : 'POST'),
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        credentials: 'same-origin',
        signal: opts.signal,
      });
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') throw error;
      throw new V1Error(0, 'NETWORK_ERROR', fallbackMessage(0));
    }
  }

  async function read<T>(response: Response): Promise<T> {
    if (!response.ok)
      throw parseV1Error(
        response.status,
        await response.text().catch(() => ''),
        response.headers?.get?.('X-Request-Id'),
      );
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  /** 쿠키의 refresh token 으로 새 access token 을 받는다. 동시에 부르면 같은 요청을 공유한다. */
  function refresh(): Promise<AuthSession | null> {
    if (!refreshing) {
      refreshing = lock('jjcp-auth-refresh', async () => {
        try {
          const response = await send(REFRESH_PATH, { method: 'POST', body: {} }, null);
          const token = await read<TokenResponse>(response);
          const next = { accessToken: token.accessToken, user: token.user };
          setSession(next);
          return next;
        } catch (error) {
          if (error instanceof V1Error && (error.status === 401 || error.status === 403)) {
            setSession(null);
            return null;
          }
          throw error;
        }
      }).finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  }

  async function request<T>(path: string, opts: V1RequestOptions = {}): Promise<T> {
    const useAuth = opts.auth !== false;
    const usedToken = useAuth ? (session?.accessToken ?? null) : null;
    const response = await send(path, opts, usedToken);
    if (response.status !== 401 || !useAuth) return read<T>(response);

    // 다른 요청이 이미 토큰을 바꿨으면 refresh 없이 새 토큰으로 한 번만 다시 보낸다.
    await response.text().catch(() => '');
    let token = session?.accessToken ?? null;
    if (!token || token === usedToken) {
      // 네트워크·5xx 로 refresh 가 실패하면 세션은 두고 그 오류를 그대로 알린다.
      const next = await refresh();
      if (!next) throw new V1Error(401, 'UNAUTHORIZED', '다시 로그인해 주세요.');
      token = next.accessToken;
    }
    return read<T>(await send(path, opts, token));
  }

  return {
    baseUrl,
    request,
    refresh,
    getSession: () => session,
    /** 로그인 응답을 받은 뒤 세션을 저장한다. */
    acceptTokens(token: TokenResponse) {
      const next = { accessToken: token.accessToken, user: token.user };
      setSession(next);
      return next;
    },
    updateUser(patch: Partial<AuthUser>) {
      if (session) setSession({ ...session, user: { ...session.user, ...patch } });
    },
    clearSession: () => setSession(null),
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type V1Client = ReturnType<typeof createV1Client>;
