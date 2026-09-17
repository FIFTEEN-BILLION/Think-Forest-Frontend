import { useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { loginErrorMessage, parseLoginParams, postLoginPath } from '../../../api/v1/chat';
import { V1Error } from '../../../api/v1/client';
import { useAuth } from '../../../providers/AuthProvider';
import { Icon } from '../components/Icon';
import { Button, Notice } from '../components/ui';

/** 서버 대화 화면(첫인사·이야기) 보호. 로그인하지 않았으면 돌아올 곳을 담아 로그인 화면으로 보낸다. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading')
    return (
      <div className="panel loading-page" role="status">
        <Icon name="sprout" />
        티키가 너를 알아보는 중이에요…
      </div>
    );
  if (status === 'signedOut')
    return (
      <Navigate
        replace
        to={`/login?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`}
      />
    );
  return <Outlet />;
}

export function LoginScreen() {
  const { status, user, devLoginEnabled, loginWithKakao, loginAsDev } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { returnTo, loginError } = useMemo(
    () => parseLoginParams(location.search),
    [location.search],
  );
  const [busy, setBusy] = useState<'kakao' | 'dev' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'signedIn' && user) navigate(postLoginPath(user, returnTo), { replace: true });
  }, [status, user, returnTo, navigate]);

  // 카카오 로그인 뒤 서버가 이 화면으로 돌려보내야 첫인사 필요 여부에 따라 이어서 이동할 수 있다.
  const kakao = () => {
    setBusy('kakao');
    loginWithKakao(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  };
  const dev = async () => {
    setBusy('dev');
    setError('');
    try {
      await loginAsDev();
    } catch (reason) {
      setError(
        reason instanceof V1Error && reason.status === 404
          ? '서버에서 개발용 로그인이 꺼져 있어요.'
          : reason instanceof Error
            ? reason.message
            : '로그인하지 못했어요.',
      );
      setBusy(null);
    }
  };

  const shownError = error || loginErrorMessage(loginError);
  return (
    <div className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="first-buddy-face login-face" aria-hidden="true">
          🌱
        </div>
        <span className="tag teal">우리 아이 생각친구, 티키</span>
        <h1 id="login-title">티키와 이야기하려면 로그인해 주세요</h1>
        <p>
          티키가 나눈 이야기를 잘 기억하고, 다음에 이어서 말할 수 있도록
          <br />
          보호자와 함께 로그인해요.
        </p>
        {status === 'loading' ? (
          <div className="login-status" role="status">
            로그인 상태를 확인하고 있어요…
          </div>
        ) : (
          <div className="login-actions">
            <button type="button" className="kakao-login" onClick={kakao} disabled={!!busy}>
              <span aria-hidden="true">💬</span>
              {busy === 'kakao' ? '카카오로 이동하는 중…' : '카카오로 시작하기'}
            </button>
            {devLoginEnabled && (
              <Button className="light" onClick={dev} disabled={!!busy}>
                <Icon name="spark" />
                {busy === 'dev' ? '로그인하는 중…' : '개발용 로그인'}
              </Button>
            )}
          </div>
        )}
        {shownError && (
          <div role="alert">
            <Notice variant="error">{shownError}</Notice>
          </div>
        )}
        <small className="login-safe">
          <Icon name="shield" /> 이메일이나 사진은 받지 않아요. 로그인은 보호자 확인에만 써요.
        </small>
      </section>
    </div>
  );
}
