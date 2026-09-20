import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { ThemeProvider } from '@emotion/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiClientProvider } from '../api/ApiClientProvider';
import { createQueryClient } from '../api/queryClient';
import { theme } from '../styles/theme';
import { BackendProvider } from './BackendProvider';
import { AuthProvider } from './AuthProvider';
import { resolveApiUrl } from '../api/client';
import type { ApiRequest } from '../api/client';

type AppProvidersProps = PropsWithChildren<{
  /** 자람마을 백엔드 주소. 웹 진입점이 환경변수에서 읽어 넘긴다. */
  apiBaseUrl: string;
  /** 로그인 화면의 개발용 로그인 버튼 노출 여부. 웹 진입점이 환경변수에서 읽어 넘긴다. */
  devLogin?: boolean;
  debugMode?: boolean;
  request?: ApiRequest;
  useApi?: boolean;
}>;

export function AppProviders({
  apiBaseUrl,
  devLogin = false,
  debugMode = false,
  request,
  useApi = true,
  children,
}: AppProvidersProps) {
  const [queryClient] = useState(createQueryClient);

  return (
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider baseUrl={apiBaseUrl} request={request}>
          <AuthProvider baseUrl={resolveApiUrl(apiBaseUrl, 'api/v1')} devLoginEnabled={devLogin}>
            <BackendProvider devLoginEnabled={devLogin} debugMode={debugMode} useApi={useApi}>
              {children}
            </BackendProvider>
          </AuthProvider>
        </ApiClientProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
