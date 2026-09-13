/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 자람마을 백엔드 주소 (예: http://127.0.0.1:8000) */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
