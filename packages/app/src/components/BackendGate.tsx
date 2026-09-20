import type { PropsWithChildren } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { guestRestrictedPath } from '../api/v1/chat';
import { useBackend } from '../providers/BackendProvider';
import { Wait } from './QueryFeedback';
import { OnboardingGate } from '../screens/OnboardingScreen';
export function BackendGate({ children }: PropsWithChildren) {
  const backend = useBackend();
  const location = useLocation();
  if (['/login', '/auth/kakao/callback'].includes(location.pathname)) return <>{children}</>;
  if (backend.loading) return <p role="status">로그인 정보를 확인하고 있어요…</p>;
  if (backend.me) {
    if (backend.me.user.role === 'GUEST' && guestRestrictedPath(location.pathname)) {
      return (
        <section className="panel">
          <h1>로그인하면 사용할 수 있어요</h1>
          <p>프로필 관리, 보호자 연결과 이야기 공유는 카카오 로그인 후 이용해 주세요.</p>
          <p>체험 기록은 카카오 계정으로 옮겨지지 않아요.</p>
          <div className="row wrap">
            <Link className="btn" to="/">
              체험 계속하기
            </Link>
            <button
              className="btn"
              onClick={() => void backend.logout()}
              disabled={backend.loading}
            >
              체험 종료하고 로그인하기
            </button>
          </div>
        </section>
      );
    }
    const setupExempt = /^\/(welcome|guardian|guest\/consent|data|tech)(\/|$)/.test(
      location.pathname,
    );
    return backend.useApi && !setupExempt ? (
      <OnboardingGate key={backend.scopeId}>{children}</OnboardingGate>
    ) : (
      <>{children}</>
    );
  }
  if (backend.error) return <Wait error={new Error(backend.error)} retry={backend.refreshMe} />;
  return (
    <Navigate
      replace
      to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
    />
  );
}
