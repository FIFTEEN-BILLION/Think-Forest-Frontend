// 명세 16절. 보호자가 받은 초대를 수락하는 화면.
// 링크(/guardian/invite/:token)로 바로 오거나, 코드만 받아 직접 붙여 넣을 수 있다.

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { acceptGuardianInvitation, permissionLabel } from '../../api/v1/endpoints';
import type { GuardianLink, ProfileOut } from '../../api/v1/types';
import { useAuth } from '../../providers/AuthProvider';
import { Icon } from '../../components/Icon';
import { ActionResult, errorCode, useAction, useGuardian } from '../../components/GuardianParts';
import { Button, Notice, PageHeading } from '../../components/ui';

const CODE_MESSAGES: Record<string, string> = {
  INVITATION_ALREADY_USED: '이미 쓴 초대예요. 아이 쪽에서 새 초대를 만들어 달라고 해 주세요.',
  INVITATION_EXPIRED: '초대가 만료됐어요. 새 초대를 받아 주세요.',
  INVITATION_NOT_FOUND: '이런 초대를 찾지 못했어요. 코드를 다시 확인해 주세요.',
};

export function GuardianInviteAcceptScreen() {
  const { token: routeToken } = useParams();
  const { client, status } = useAuth();
  const { reload } = useGuardian();
  const navigate = useNavigate();
  const { busy, message, failed, runQuiet } = useAction();
  const [token, setToken] = useState(routeToken ?? '');
  const [accepted, setAccepted] = useState<{ link: GuardianLink; profile: ProfileOut } | null>(
    null,
  );
  const tried = useRef(false);

  const accept = (value: string) =>
    runQuiet(async () => {
      try {
        const result = await acceptGuardianInvitation(client, value.trim());
        setAccepted(result);
        reload();
        return `${result.profile.nickname}와 연결됐어요.`;
      } catch (reason) {
        const known = CODE_MESSAGES[errorCode(reason)];
        throw known ? new Error(known, { cause: reason }) : reason;
      }
    });

  // 링크로 들어왔고 로그인까지 끝났으면 한 번만 자동으로 수락한다.
  useEffect(() => {
    if (!routeToken || tried.current || status !== 'signedIn') return;
    tried.current = true;
    accept(routeToken);
    // accept 는 매 렌더 새로 만들어지므로 의존성에 넣지 않는다. 한 번만 시도하면 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeToken, status]);

  if (status === 'signedOut')
    return (
      <>
        <PageHeading
          eyebrow="GUARDIAN"
          title="초대를 받으셨군요."
          description="아이와 연결하려면 먼저 보호자 계정으로 로그인해 주세요."
        />
        <section className="panel">
          <p className="muted">
            로그인하면 이 초대를 이어서 수락할 수 있어요. 초대는 한 번만 쓸 수 있으니 로그인한 뒤에
            눌러 주세요.
          </p>
          <Link
            className="btn"
            to={`/login?returnTo=${encodeURIComponent(`/guardian/invite/${token}`)}`}
          >
            로그인하고 수락하기
          </Link>
        </section>
      </>
    );

  return (
    <>
      <PageHeading
        eyebrow="GUARDIAN"
        title="아이와 연결하기"
        description="받은 초대 링크나 코드로 아이 프로필과 연결해요. 초대는 한 번만 쓸 수 있고 곧 만료돼요."
      />
      {accepted ? (
        <section className="panel">
          <h2>{accepted.profile.nickname}와 연결됐어요</h2>
          <dl className="definition">
            <dt>받은 권한</dt>
            <dd>{accepted.link.permissions.map(permissionLabel).join(', ')}</dd>
            <dt>학년·나이대</dt>
            <dd>{accepted.profile.gradeOrAgeBand ?? '—'}</dd>
          </dl>
          <Notice>
            아이가 쓴 대화 원문 전체가 아니라, 권한에 해당하는 내용만 보여요. 권한은 아이 쪽에서
            언제든 바꿀 수 있어요.
          </Notice>
          <div className="actions split">
            <Button onClick={() => navigate('/guardian/report')}>성장 리포트 보기</Button>
            <Link className="btn light" to="/guardian/links">
              연결과 권한 확인
            </Link>
          </div>
        </section>
      ) : (
        <section className="panel">
          <div className="field">
            <label htmlFor="invite-token">초대 코드</label>
            <input
              id="invite-token"
              value={token}
              autoComplete="off"
              placeholder="ginv_…"
              onChange={(event) => setToken(event.target.value)}
            />
            <small>링크를 받았다면 링크를 열기만 해도 돼요.</small>
          </div>
          <Button disabled={busy || token.trim().length < 6} onClick={() => accept(token)}>
            <Icon name="check" />
            {busy ? '연결하는 중…' : '초대 수락하기'}
          </Button>
          <ActionResult message={message} failed={failed} />
        </section>
      )}
    </>
  );
}
