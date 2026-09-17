import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { ThemeProvider } from '@emotion/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiClientProvider } from '../api/ApiClientProvider';
import { createQueryClient } from '../api/queryClient';
import { theme } from '../styles/theme';
import { AuthProvider } from './AuthProvider';

type AppProvidersProps = PropsWithChildren<{
  /** 자람마을 백엔드 주소. 웹 진입점이 환경변수에서 읽어 넘긴다. */
  apiBaseUrl: string;
  /** JJCP API v1 기본 경로. 기본값은 같은 출처 `/api/v1`. */
  v1BaseUrl?: string;
  /** 로그인 화면의 개발용 로그인 버튼 노출 여부. 웹 진입점이 환경변수에서 읽어 넘긴다. */
  devLogin?: boolean;
}>;

export function AppProviders({
  apiBaseUrl,
  v1BaseUrl,
  devLogin = false,
  children,
}: AppProvidersProps) {
  const [queryClient] = useState(createQueryClient);

  return (
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider baseUrl={apiBaseUrl}>
          <AuthProvider baseUrl={v1BaseUrl} devLoginEnabled={devLogin}>
            {children}
          </AuthProvider>
        </ApiClientProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
