import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { ThemeProvider } from '@emotion/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiClientProvider } from '../api/ApiClientProvider';
import { createQueryClient } from '../api/queryClient';
import { theme } from '../styles/theme';
import { AuthProvider } from './AuthProvider';
import { BackendProvider } from './BackendProvider';

type AppProvidersProps = PropsWithChildren<{
  /** 자람마을 백엔드 주소. 웹 진입점이 환경변수에서 읽어 넘긴다. */
  apiBaseUrl: string;
  /** JJCP API v1 기본 경로. 기본값은 같은 출처 `/api/v1`. */
  v1BaseUrl?: string;
  /** 로그인 화면의 개발용 로그인 버튼 노출 여부. 웹 진입점이 환경변수에서 읽어 넘긴다. */
  devLogin?: boolean;
}>;

/**
 * 인증은 AuthProvider(=api/v1 클라이언트)가 한 곳에서 맡는다.
 * BackendProvider 는 그 세션을 빌려 쓰는 레거시/생성 스키마 전송 계층이라 반드시 안쪽에 둔다.
 */
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
            <BackendProvider devLoginEnabled={devLogin}>{children}</BackendProvider>
          </AuthProvider>
        </ApiClientProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
