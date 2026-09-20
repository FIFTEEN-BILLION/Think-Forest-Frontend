import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { V1Error } from '../api/v1/client';
import { loginErrorMessage, parseLoginParams, postLoginPath, safeReturnTo } from '../api/v1/chat';
import { useAuth } from '../providers/AuthProvider';
import { useBackend } from '../providers/BackendProvider';

const KAKAO_RETURN_TO = 'jjcp-kakao-return-to';

function rememberReturnTo(returnTo: string) {
  try {
    sessionStorage.setItem(KAKAO_RETURN_TO, safeReturnTo(returnTo));
  } catch {
    // 저장소가 막혀도 서버의 state에 returnTo가 보관되므로 로그인은 계속할 수 있다.
  }
}

function pendingReturnTo() {
  try {
    return safeReturnTo(sessionStorage.getItem(KAKAO_RETURN_TO));
  } catch {
    return '/';
  }
}

function clearPendingReturnTo() {
  try {
    sessionStorage.removeItem(KAKAO_RETURN_TO);
  } catch {
    // 저장소를 쓸 수 없는 환경이면 지울 값도 없다.
  }
}

export function LoginScreen() {
  const backend = useBackend();
  const { loginWithKakao } = useAuth();
  const location = useLocation();
  const { returnTo, loginError } = parseLoginParams(location.search);
  if (backend.me) return <Navigate replace to={postLoginPath(backend.me.user, returnTo)} />;
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  const error = backend.error || loginErrorMessage(loginError);
  return (
    <section className="panel server-welcome">
      <span className="tag teal">우리 아이 생각친구, 티키</span>
      <h1>작은 궁금증부터 함께 시작해요.</h1>
      <p>로그인 없이 티키와 대화하고 생각 모험을 체험해 보세요.</p>
      {error && <p role="alert">{error}</p>}
      {backend.loading ? (
        <p role="status">로그인 정보를 확인하고 있어요…</p>
      ) : (
        <>
          {!backend.useApi ? (
            <button className="btn" onClick={() => void backend.login()}>
              예시 데이터로 시작
            </button>
          ) : (
            <>
              <button type="button" className="btn" onClick={() => void backend.startGuest()}>
                로그인 없이 체험하기
              </button>
              <p className="muted">
                체험은 이 브라우저에서 최대 24시간 이어갈 수 있어요. 만료된 기록은 순차적으로
                정리되며, 카카오 계정으로 옮겨지지 않아요. AI 첫인사는 보호자 동의 후 이용할 수
                있어요.
              </p>
              <button
                type="button"
                className="btn kakao-login"
                onClick={() => {
                  rememberReturnTo(returnTo);
                  loginWithKakao(returnTo);
                }}
              >
                카카오로 시작
              </button>
            </>
          )}
          {backend.useApi && local && backend.devLoginEnabled && (
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

export function KakaoCallbackScreen() {
  const { status, finishKakaoLogin } = useAuth();
  const { refreshMe } = useBackend();
  const location = useLocation();
  const navigate = useNavigate();
  const started = useRef(false);
  const [message, setMessage] = useState('카카오 로그인을 확인하고 있어요…');

  useEffect(() => {
    if (status === 'loading' || started.current) return;
    started.current = true;
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const fallback = pendingReturnTo();
    const backToLogin = (loginError: string) => {
      clearPendingReturnTo();
      navigate(
        `/login?returnTo=${encodeURIComponent(fallback)}&loginError=${encodeURIComponent(loginError)}`,
        { replace: true },
      );
    };

    if (error || !code || !state) {
      backToLogin(error === 'access_denied' ? 'KAKAO_CANCELLED' : 'KAKAO_LOGIN_FAILED');
      return;
    }

    void finishKakaoLogin({
      code,
      state,
      redirectUri: `${window.location.origin}/auth/kakao/callback`,
    })
      .then(async (token) => {
        await refreshMe();
        clearPendingReturnTo();
        navigate(postLoginPath(token.user, token.returnTo), { replace: true });
      })
      .catch((reason: unknown) => {
        setMessage('로그인을 완료하지 못했어요. 로그인 화면으로 돌아갈게요.');
        backToLogin(reason instanceof V1Error ? reason.code : 'KAKAO_LOGIN_FAILED');
      });
  }, [finishKakaoLogin, location.search, navigate, refreshMe, status]);

  return (
    <section className="panel server-welcome">
      <p role="status">{message}</p>
    </section>
  );
}
