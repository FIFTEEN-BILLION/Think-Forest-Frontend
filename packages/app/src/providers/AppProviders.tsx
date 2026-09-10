import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { ThemeProvider } from '@emotion/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiClientProvider } from '../api/ApiClientProvider';
import { createQueryClient } from '../api/queryClient';
import { theme } from '../styles/theme';

type AppProvidersProps = PropsWithChildren<{
  /** 자람마을 백엔드 주소. 웹 진입점이 환경변수에서 읽어 넘긴다. */
  apiBaseUrl: string;
}>;

export function AppProviders({ apiBaseUrl, children }: AppProvidersProps) {
  const [queryClient] = useState(createQueryClient);

  return (
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider baseUrl={apiBaseUrl}>{children}</ApiClientProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
