import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { createApiClient, resolveApiUrl } from './client';
import type { ApiRequest } from './client';

// 백엔드 주소는 앱 패키지가 아니라 호스트(웹 진입점)가 주입한다.
// 그래야 @jjcp/app 이 Vite 환경변수에 묶이지 않는다.
const ApiClientContext = createContext<ApiRequest | null>(null);
const ApiBaseContext = createContext('');

export function ApiClientProvider({ baseUrl, children }: PropsWithChildren<{ baseUrl: string }>) {
  const request = useMemo(() => createApiClient(baseUrl), [baseUrl]);
  return (
    <ApiBaseContext.Provider value={baseUrl}>
      <ApiClientContext.Provider value={request}>{children}</ApiClientContext.Provider>
    </ApiBaseContext.Provider>
  );
}

export function useApiUrl() {
  const base = useContext(ApiBaseContext);
  return (path: string) => resolveApiUrl(base, path);
}

export function useApiClient(): ApiRequest {
  const request = useContext(ApiClientContext);
  if (!request) {
    throw new Error(
      'useApiClient 는 ApiClientProvider(또는 AppProviders) 안에서만 쓸 수 있습니다.',
    );
  }
  return request;
}
