import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../providers/AuthProvider';
import { useBackend } from '../providers/BackendProvider';
import { useAction } from '../hooks/useServerApi';
import { json } from '../api/requestOptions';
import { clearResetStorage } from '../api/debugReset';

export function DebugResetButton() {
  const backend = useBackend();
  const { client } = useAuth();
  const cache = useQueryClient();
  const action = useAction({ invalidate: false });
  if (!backend.debugMode || !backend.useApi || !backend.me) return null;

  return (
    <div className="debug-reset">
      <button
        type="button"
        className="btn danger"
        disabled={action.busy}
        onClick={() => {
          if (
            !window.confirm(
              '현재 계정의 프로필, 대화, 활동, 설정을 모두 삭제하고 로그인 화면으로 돌아갑니다. 기본 제공 데이터는 유지되며, 삭제한 사용자 데이터는 복구할 수 없습니다. 초기화할까요?',
            )
          )
            return;
          const userId = backend.me!.user.id;
          void action.run(async () => {
            await cache.cancelQueries();
            await backend.request('debug/reset-account', json({}));
            client.clearSession();
            cache.clear();
            try {
              clearResetStorage(window.localStorage, userId);
              clearResetStorage(window.sessionStorage, userId);
            } catch {
              // 브라우저 저장소가 차단되어도 서버 삭제와 로그아웃은 완료한다.
            }
            window.location.replace('/login');
          });
        }}
      >
        {action.busy ? '초기화 중…' : '내 정보 초기화'}
      </button>
      {action.message && <p role="alert">{action.message}</p>}
    </div>
  );
}
