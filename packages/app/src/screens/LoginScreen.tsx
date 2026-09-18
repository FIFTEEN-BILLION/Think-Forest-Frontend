import { Navigate, useLocation } from 'react-router-dom';
import { loginErrorMessage, parseLoginParams, postLoginPath } from '../api/v1/chat';
import { useApiUrl } from '../api/ApiClientProvider';
import { useBackend } from '../providers/BackendProvider';

export function LoginScreen() {
  const backend = useBackend();
  const location = useLocation();
  const apiUrl = useApiUrl();
  const { returnTo, loginError } = parseLoginParams(location.search);
  if (backend.me) return <Navigate replace to={postLoginPath(backend.me.user, returnTo)} />;
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  const callback = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  const error = backend.error || loginErrorMessage(loginError);
  return (
    <section className="panel server-welcome">
      <span className="tag teal">우리 아이 생각친구, 티키</span>
      <h1>작은 궁금증부터 함께 시작해요.</h1>
      <p>로그인하면 이야기와 활동을 저장하고 이어갈 수 있어요.</p>
      {error && <p role="alert">{error}</p>}
      {backend.loading ? (
        <p role="status">로그인 정보를 확인하고 있어요…</p>
      ) : (
        <>
          <a
            className="btn kakao-login"
            href={apiUrl(`api/v1/auth/kakao/authorize?returnTo=${encodeURIComponent(callback)}`)}
          >
            카카오로 시작
          </a>
          {local && backend.devLoginEnabled && (
            <>
              <p className="muted">
                로컬 테스트 환경 · 실제 아동 정보 대신 가상의 정보를 입력해 주세요.
              </p>
              <div className="row wrap">
                <button className="btn" onClick={() => void backend.login()}>
                  로컬 테스트 계정으로 시작
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
