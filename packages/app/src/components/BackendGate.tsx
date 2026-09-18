import { Fragment } from 'react';
import type { PropsWithChildren } from 'react';
import { useApiUrl } from '../api/ApiClientProvider';
import { useBackend } from '../providers/BackendProvider';

export function BackendGate({ children }: PropsWithChildren) {
  const backend = useBackend();
  const apiUrl = useApiUrl();
  if (backend.demo) return <>{children}</>;
  if (backend.loading) return <p role="status">로그인 정보를 확인하고 있어요…</p>;
  if (backend.me) return <Fragment key={backend.me.user.id}>{children}</Fragment>;
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  return (
    <section className="panel server-welcome">
      <span className="tag teal">우리 아이 생각친구, 티키</span>
      <h1>작은 궁금증부터 함께 시작해요.</h1>
      <p>로그인하면 이야기와 활동을 저장하고 이어갈 수 있어요.</p>
      {backend.error && <p role="alert">{backend.error}</p>}
      {local ? (
        <>
          <p className="muted">
            로컬 테스트 환경 · 실제 아동 정보 대신 가상의 정보를 입력해 주세요.
          </p>
          <div className="row wrap">
            <button className="btn" onClick={() => void backend.login('CHILD')}>
              아이 테스트 계정으로 시작
            </button>
            <button className="btn light" onClick={() => void backend.login('GUARDIAN')}>
              보호자 테스트 계정으로 시작
            </button>
          </div>
        </>
      ) : (
        <a className="btn" href={apiUrl('api/v1/auth/kakao/authorize?returnTo=/')}>
          카카오로 시작
        </a>
      )}
      <button className="btn light" onClick={() => backend.setDemo(true)}>
        예시 화면 둘러보기
      </button>
    </section>
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
