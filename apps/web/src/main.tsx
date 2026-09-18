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

createRoot(root).render(
  <StrictMode>
    <AppProviders apiBaseUrl={apiBaseUrl}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
