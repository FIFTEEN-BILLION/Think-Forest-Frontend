import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useBackend } from '../providers/BackendProvider';
import { Wait } from './QueryFeedback';
export function BackendGate({ children }: PropsWithChildren) {
  const backend = useBackend();
  const location = useLocation();
  if (location.pathname === '/login') return <>{children}</>;
  if (backend.loading) return <p role="status">로그인 정보를 확인하고 있어요…</p>;
  if (backend.me) return <>{children}</>;
  if (backend.error) return <Wait error={new Error(backend.error)} retry={backend.refreshMe} />;
  return (
    <Navigate
      replace
      to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
    />
  );
}
export function BackendStatus() {
  const backend = useBackend();
  return (
    <div className="server-status">
      <span>{backend.me ? '내 계정에 저장돼요' : '로그인이 필요해요'}</span>
      {backend.me && (
        <button disabled={backend.loading} onClick={() => void backend.logout()}>
          로그아웃
        </button>
      )}
    </div>
  );
}
