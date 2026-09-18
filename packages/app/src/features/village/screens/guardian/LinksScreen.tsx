// 명세 16절. 아이·보호자 연결과 권한.
// 초대 토큰은 한 번만 쓰고 곧 만료된다. 연결을 끊어도 아이 기록은 남는다 — 그 차이를 화면에 적는다.

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ALL_PERMISSIONS,
  createGuardianInvitation,
  deleteGuardianLink,
  invitationLink,
  listGuardianChildren,
  listGuardianLinks,
  minutesUntil,
  permissionLabel,
  requiredConsentDocuments,
  updateGuardianLink,
} from '../../../../api/v1/endpoints';
import type { GuardianChild, GuardianInvitation, GuardianLink } from '../../../../api/v1/types';
import type { GuardianPermission } from '../../../../api/v1/types';
import { useAuth } from '../../../../providers/AuthProvider';
import { Icon } from '../../components/Icon';
import {
  ActionResult,
  errorCode,
  errorDetails,
  errorText,
  GuardianGate,
  GuardianSection,
  useAction,
  useGuardian,
} from '../../components/GuardianParts';
import { Button, Notice } from '../../components/ui';

function InvitationCard({ invitation }: { invitation: GuardianInvitation }) {
  const [copied, setCopied] = useState('');
  const link = invitationLink(invitation.token);
  const left = minutesUntil(invitation.expiresAt);
  const copy = (value: string, what: string) => {
    navigator.clipboard
      ?.writeText(value)
      .then(() => setCopied(`${what}를 복사했어요.`))
      .catch(() => setCopied('복사하지 못했어요. 길게 눌러 직접 복사해 주세요.'));
  };
  return (
    <div className="notice">
      <div>
        <strong>초대가 만들어졌어요</strong>
        <p>
          보호자에게 아래 링크나 코드를 전해 주세요. <strong>한 번만 쓸 수 있고</strong>,{' '}
          {left === null ? '이미 만료됐어요' : `${left}분 뒤 만료돼요`} (
          {new Date(invitation.expiresAt).toLocaleString('ko-KR')}).
        </p>
        <dl className="definition">
          <dt>연결 링크</dt>
          <dd>
            <code>{link}</code>
          </dd>
          <dt>연결 코드</dt>
          <dd>
            <code>{invitation.token}</code>
          </dd>
          <dt>줄 권한</dt>
          <dd>{invitation.permissions.map(permissionLabel).join(', ')}</dd>
        </dl>
        <div className="actions split">
          <Button className="light small" onClick={() => copy(link, '링크')}>
            링크 복사
          </Button>
          <Button className="ghost small" onClick={() => copy(invitation.token, '코드')}>
            코드 복사
          </Button>
        </div>
        {copied && (
          <p role="status" className="muted space-top">
            {copied}
          </p>
        )}
      </div>
    </div>
  );
}

function LinkRow({
  link,
  busy,
  onSave,
  onUnlink,
}: {
  link: GuardianLink;
  busy: boolean;
  onSave: (permissions: GuardianPermission[]) => void;
  onUnlink: () => void;
}) {
  const [permissions, setPermissions] = useState<GuardianPermission[]>(link.permissions);
  const [confirming, setConfirming] = useState(false);
  const owner = link.role === 'OWNER';
  const toggle = (permission: GuardianPermission) =>
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  const changed =
    JSON.stringify([...permissions].sort()) !== JSON.stringify([...link.permissions].sort());
  return (
    <section className="panel">
      <div className="row between wrap">
        <h3>{owner ? '이 계정 (아이 본인/만든 사람)' : '연결된 보호자'}</h3>
        <span className={`tag ${link.status === 'ACTIVE' ? 'teal' : 'gold'}`}>
          {link.status === 'ACTIVE' ? '연결됨' : '해제됨'}
        </span>
      </div>
      <dl className="definition">
        <dt>연결 아이디</dt>
        <dd>
          <code>{link.id}</code>
        </dd>
        <dt>연결한 날</dt>
        <dd>{new Date(link.createdAt).toLocaleDateString('ko-KR')}</dd>
      </dl>
      <fieldset className="interest-fieldset">
        <legend>이 보호자가 할 수 있는 일</legend>
        <div className="filters">
          {ALL_PERMISSIONS.map((permission) => (
            <button
              type="button"
              key={permission}
              className={`chip ${permissions.includes(permission) ? 'active' : ''}`}
              aria-pressed={permissions.includes(permission)}
              disabled={owner || busy}
              onClick={() => toggle(permission)}
            >
              {permissionLabel(permission)}
            </button>
          ))}
        </div>
      </fieldset>
      {owner ? (
        <small className="muted">만든 사람의 권한은 바꾸거나 끊을 수 없어요.</small>
      ) : (
        <div className="actions split">
          <Button disabled={!changed || busy} onClick={() => onSave(permissions)}>
            권한 저장
          </Button>
          {confirming ? (
            <>
              <Button className="light" onClick={() => setConfirming(false)}>
                그대로 두기
              </Button>
              <Button className="danger" disabled={busy} onClick={onUnlink}>
                연결 끊기
              </Button>
            </>
          ) : (
            <Button className="ghost" onClick={() => setConfirming(true)}>
              연결 끊기
            </Button>
          )}
        </div>
      )}
      {confirming && !owner && (
        <Notice variant="error">
          연결을 끊어도 <strong>아이의 기록은 지워지지 않아요.</strong> 이 보호자가 더는 아이 기록을
          보지 못하게 될 뿐이에요. 기록을 지우려면 기록 관리에서 따로 삭제를 요청해요.
        </Notice>
      )}
    </section>
  );
}

function LinksBody() {
  const { client } = useAuth();
  const { profileId, profile, reload } = useGuardian();
  const { busy, message, failed, runQuiet, setMessage } = useAction();
  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [children, setChildren] = useState<GuardianChild[]>([]);
  const [invitation, setInvitation] = useState<GuardianInvitation | null>(null);
  const [wanted, setWanted] = useState<GuardianPermission[]>([
    'VIEW_PROFILE',
    'VIEW_STORIES',
    'VIEW_REPORTS',
    'REVIEW_SHARING',
  ]);
  const [loadError, setLoadError] = useState('');
  const [consentNeeded, setConsentNeeded] = useState<string[]>([]);

  const load = useCallback(
    (signal?: AbortSignal) => {
      if (!profileId) return;
      Promise.all([
        listGuardianLinks(client, profileId, signal),
        listGuardianChildren(client, signal),
      ])
        .then(([linkList, childList]) => {
          if (signal?.aborted) return;
          setLinks(linkList);
          setChildren(childList);
          setLoadError('');
        })
        .catch((reason) => {
          if (!signal?.aborted) setLoadError(errorText(reason, '연결 정보를 불러오지 못했어요.'));
        });
    },
    [client, profileId],
  );

  useEffect(() => {
    const abort = new AbortController();
    load(abort.signal);
    return () => abort.abort();
  }, [load]);

  const invite = () =>
    runQuiet(async () => {
      setConsentNeeded([]);
      try {
        const created = await createGuardianInvitation(client, {
          profileId: profileId as string,
          permissions: wanted,
          expiresInMinutes: 60,
        });
        setInvitation(created);
        return '초대를 만들었어요. 링크나 코드를 보호자에게 전해 주세요.';
      } catch (reason) {
        if (errorCode(reason) === 'CONSENT_REQUIRED')
          setConsentNeeded(requiredConsentDocuments(errorDetails(reason)));
        throw reason;
      }
    });

  const toggleWanted = (permission: GuardianPermission) =>
    setWanted((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );

  const otherChildren = children.filter((child) => child.profileId !== profileId);

  return (
    <>
      {loadError && (
        <div role="alert">
          <Notice variant="error">{loadError}</Notice>
        </div>
      )}
      <section className="panel">
        <h2>{profile?.nickname ?? '아이'}를 함께 볼 보호자 초대하기</h2>
        <p className="muted space-top">
          초대를 만들면 링크와 코드가 나와요. 한 사람이 한 번만 쓸 수 있고 1시간 뒤 만료돼요.
        </p>
        <fieldset className="interest-fieldset">
          <legend>초대할 때 줄 권한</legend>
          <div className="filters">
            {ALL_PERMISSIONS.map((permission) => (
              <button
                type="button"
                key={permission}
                className={`chip ${wanted.includes(permission) ? 'active' : ''}`}
                aria-pressed={wanted.includes(permission)}
                onClick={() => toggleWanted(permission)}
              >
                {permissionLabel(permission)}
              </button>
            ))}
          </div>
        </fieldset>
        <Button disabled={busy || wanted.length === 0} onClick={invite}>
          <Icon name="share" />
          연결 초대 만들기
        </Button>
        <ActionResult message={message} failed={failed} />
        {consentNeeded.length > 0 && (
          <div className="actions split">
            <Link className="btn light small" to="/guardian/consent">
              먼저 동의하기 ({consentNeeded.join(', ')})
            </Link>
          </div>
        )}
        {invitation && <InvitationCard invitation={invitation} />}
        <div className="actions split">
          <Link className="btn ghost small" to="/guardian/invite">
            받은 초대 코드 입력하기
          </Link>
        </div>
      </section>

      <div className="stack space-top">
        {links.map((link) => (
          <LinkRow
            key={link.id}
            link={link}
            busy={busy}
            onSave={(permissions) =>
              runQuiet(async () => {
                await updateGuardianLink(client, link.id, permissions);
                load();
                reload();
                return '권한을 저장했어요.';
              })
            }
            onUnlink={() =>
              runQuiet(async () => {
                const result = await deleteGuardianLink(client, link.id);
                load();
                reload();
                setMessage('');
                return (
                  result.message ??
                  '연결을 끊었어요. 아이의 기록은 그대로 남아 있어요(삭제와는 다른 동작이에요).'
                );
              })
            }
          />
        ))}
      </div>

      {otherChildren.length > 0 && (
        <section className="panel space-top">
          <h3>내가 볼 수 있는 다른 아이</h3>
          <div className="table-wrap">
            <table>
              <caption>보호자로 연결된 아이 목록</caption>
              <thead>
                <tr>
                  <th>별명</th>
                  <th>학년·나이대</th>
                  <th>내 권한</th>
                </tr>
              </thead>
              <tbody>
                {otherChildren.map((child) => (
                  <tr key={child.linkId}>
                    <td>{child.nickname}</td>
                    <td>{child.gradeOrAgeBand ?? '—'}</td>
                    <td>{child.permissions.map(permissionLabel).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

export function GuardianLinksScreen() {
  return (
    <GuardianSection
      title="아이를 함께 보는 사람을 정해요."
      description="계정 하나가 곧 아이는 아니에요. 아이 프로필과 보호자 계정을 따로 두고, 권한도 항목별로 나눠요."
    >
      <GuardianGate>
        <LinksBody />
      </GuardianGate>
    </GuardianSection>
  );
}
