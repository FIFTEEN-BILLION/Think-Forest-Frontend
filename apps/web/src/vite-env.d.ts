/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'false'면 같은 화면에 목데이터를 공급하고 서버를 호출하지 않는다. 기본값 true. */
  readonly VITE_USE_API?: string;
  /** 자람마을 백엔드 주소 (예: http://127.0.0.1:8000) */
  readonly VITE_API_BASE_URL?: string;
  /** API v1 개발 프록시 대상 (vite.config.ts 에서만 읽는다) */
  readonly VITE_DEV_API_TARGET?: string;
  /** 'true' 면 로그인 화면에 개발용 로그인 버튼을 보인다 */
  readonly VITE_DEV_LOGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
