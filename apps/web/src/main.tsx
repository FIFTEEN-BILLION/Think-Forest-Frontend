import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@jjcp/app/providers';
import '@jjcp/app/styles/web.css';
import { router } from './router';

const root = document.getElementById('root');
if (!root) throw new Error('Root element is missing.');

// 로컬 빌드도 같은 서버를 사용한다. 별도 배포 주소는 환경변수로 명시한다.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '/api';
const useApi = import.meta.env.VITE_USE_API !== 'false';
// Keep the demo transport out of the API-enabled build.
const request = useApi ? undefined : (await import('@jjcp/app/api/mock')).createMockApiClient();

// JJCP API v1 은 같은 출처 /api/v1 (개발: Vite 프록시, 배포: Netlify 프록시)로 부른다.
// 개발 localhost에서는 기본 표시하며 배포 빌드는 명시적으로 켜야 한다.
const devLogin =
  import.meta.env.VITE_DEV_LOGIN === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_DEV_LOGIN !== 'false');

createRoot(root).render(
  <StrictMode>
    <AppProviders apiBaseUrl={apiBaseUrl} devLogin={devLogin} request={request} useApi={useApi}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
