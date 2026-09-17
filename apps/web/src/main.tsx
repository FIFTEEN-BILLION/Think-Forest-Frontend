import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@jjcp/app/providers';
import '@jjcp/app/styles/web.css';
import { router } from './router';

const root = document.getElementById('root');
if (!root) throw new Error('Root element is missing.');

// 자람마을 백엔드 주소. 환경변수 우선, 프로덕션은 배포된 Vercel 백엔드, 로컬 개발은 Vite 프록시(/api).
const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD ? 'https://think-forest-backend.vercel.app' : '/api');

createRoot(root).render(
  <StrictMode>
    <AppProviders apiBaseUrl={apiBaseUrl}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
