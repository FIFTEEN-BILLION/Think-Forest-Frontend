import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@jjcp/app/providers';
import '@jjcp/app/styles/web.css';
import { router } from './router';

const root = document.getElementById('root');
if (!root) throw new Error('Root element is missing.');

// 자람마을 백엔드 주소. .env 의 VITE_API_BASE_URL, 없으면 로컬 개발 서버.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

createRoot(root).render(
  <StrictMode>
    <AppProviders apiBaseUrl={apiBaseUrl}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
