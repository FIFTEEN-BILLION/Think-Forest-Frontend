import { Fragment } from 'react';
import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useBackend } from '../providers/BackendProvider';

export function BackendGate({ children }: PropsWithChildren) {
  const backend = useBackend();
  const location = useLocation();
  if (location.pathname === '/login' || backend.demo) return <>{children}</>;
  if (backend.loading) return <p role="status">로그인 정보를 확인하고 있어요…</p>;
  if (backend.me) return <Fragment key={backend.me.user.id}>{children}</Fragment>;
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
    <div className="server-status" role="status">
      <span>
        {backend.demo
          ? '예시 화면 · 체험용 기록'
          : backend.me
            ? `${backend.me.user.role === 'GUARDIAN' ? '보호자' : (backend.me.profile?.nickname ?? '새싹')} 계정으로 연결됨`
            : '로그인이 필요해요'}
      </span>
      {backend.error && <span role="alert">{backend.error}</span>}
      {backend.demo ? (
        <button onClick={() => backend.setDemo(false)}>실제 기록으로</button>
      ) : (
        backend.me && <button onClick={() => void backend.logout()}>로그아웃</button>
      )}
    </div>
  );
}
