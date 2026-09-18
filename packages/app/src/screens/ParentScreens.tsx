import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage, json } from '../api/requestOptions';
import { useAction, useServerCache, useServerQuery } from '../hooks/useServerApi';
import { useBackend } from '../providers/BackendProvider';
import type { Profile } from '../types/backend';
import { Message, Wait } from '../components/QueryFeedback';
import type { Page } from './ReaderScreens';
import {
  AccountDeletion,
  ConsentHistory,
  GuardianPermissions,
  NotificationSettings,
  RetentionControl,
  SafetyEvents,
} from '../components/ManagementPanels';

function useProfileSelection() {
  const { me } = useBackend();
  const [selected, setSelected] = useState('');
  const q = useServerQuery<Page<Profile>>(
    me?.user.role === 'GUARDIAN' ? 'guardian/children' : null,
  );
  const profiles =
    me?.user.role === 'GUARDIAN' ? (q.data?.items ?? []) : me?.profile ? [me.profile] : [];
  const profileId = profiles.some((p) => p.id === selected) ? selected : profiles[0]?.id || '';
  const selector = q.error ? (
    <Wait error={q.error} retry={q.refetch} />
  ) : profiles.length > 1 ? (
    <label>
      아이 선택
      <select value={profileId} onChange={(e) => setSelected(e.target.value)}>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nickname}
          </option>
        ))}
      </select>
    </label>
  ) : null;
  return { profileId, selector, profiles };
}

interface Settings {
  ttsEnabled: boolean;
  guardianPreviewEnabled: boolean;
  theme: string;
  retentionDays: number;
  pendingRetentionDays: number | null;
  version: number;
}
interface GuardianLink {
  id: string;
  childId: string;
  status: string;
  version: number;
  verificationMode?: string;
  permissions: string[];
}
interface Share {
  id: string;
  storyVersion: number;
  status: string;
  snapshot: { title: string; body: string };
  audience: string;
}

export function ServerProfile() {
  const backend = useBackend();
  const action = useAction();
  const { profileId, selector } = useProfileSelection();
  const [token, setToken] = useState('');
  const invitation = useMutation({
    mutationFn: () => backend.request<{ token: string }>('guardian-links/invitations', json({})),
    gcTime: 0,
  });
  const [confirmed, setConfirmed] = useState(false);
  const [shareCursor, setShareCursor] = useState('');
  const profile = useServerQuery<{ profile: Profile }>(profileId ? `profiles/${profileId}` : null);
  const settings = useServerQuery<{ settings: Settings }>(
    profileId ? `profiles/${profileId}/settings` : null,
  );
  const links = useServerQuery<Page<GuardianLink>>('guardian-links');
  const shares = useServerQuery<Page<Share>>(
    backend.me?.user.role === 'GUARDIAN'
      ? `guardian/share-requests?cursor=${encodeURIComponent(shareCursor)}`
      : null,
  );
  const legal = useServerQuery<{
    items: {
      documentId: string;
      version: string;
      title: string;
      body: string;
      required: boolean;
    }[];
  }>('legal-documents');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  return (
    <>
      <header className="page-head">
        <h1>프로필과 보호자 연결</h1>
        <p>저장된 정보와 연결 권한을 확인해요.</p>
      </header>
      <Message text={action.message} />
      {selector}
      <section className="panel">
        <h2>보호자 연결</h2>
        {backend.me?.user.role === 'CHILD' ? (
          <>
            <button
              className="btn"
              disabled={invitation.isPending}
              onClick={() => invitation.mutate()}
            >
              보호자 초대 코드 만들기
            </button>
            {invitation.error && <Message text={errorMessage(invitation.error)} />}
            {invitation.data && (
              <label>
                10분 동안 유효한 초대 코드
                <input readOnly value={invitation.data.token} onFocus={(e) => e.target.select()} />
              </label>
            )}
          </>
        ) : (
          <>
            <label>
              아이의 초대 코드
              <input value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
            </label>
            <button
              className="btn"
              disabled={action.busy || !token}
              onClick={() =>
                void action.run(async () => {
                  await backend.request('guardian-links/invitations/accept', json({ token }));
                  setToken('');
                })
              }
            >
              초대 수락
            </button>
          </>
        )}
        {links.data?.items.map((link) => (
          <div className="row wrap" key={link.id}>
            <span>
              {link.status === 'ACTIVE'
                ? '확인된 연결'
                : link.status === 'REVOKED'
                  ? '해제된 연결'
                  : '보호자 확인 대기'}
            </span>
            {backend.me?.user.role === 'GUARDIAN' &&
              link.status === 'ACTIVE' &&
              link.permissions.includes('MANAGE_LINKS') && (
                <GuardianPermissions key={`${link.id}-${link.version}`} link={link} />
              )}
            {local &&
              backend.me?.user.role === 'GUARDIAN' &&
              link.status === 'PENDING_VERIFICATION' && (
                <button
                  className="btn light"
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      await backend.request(
                        `guardian-links/${link.id}/verify`,
                        json({ verificationProof: 'LOCAL_TEST_ONLY' }),
                      );
                    })
                  }
                >
                  테스트용 보호자 확인
                </button>
              )}
            {link.status === 'ACTIVE' && (
              <button
                disabled={action.busy}
                onClick={() => {
                  if (window.confirm('이 연결을 해제할까요? 공유한 이야기도 숨겨져요.'))
                    void action.run(async () => {
                      await backend.request(`guardian-links/${link.id}`, {
                        method: 'DELETE',
                        headers: { 'If-Match': `"${link.version}"` },
                      });
                    });
                }}
              >
                연결 해제
              </button>
            )}
          </div>
        ))}
        {!!links.error && <Wait error={links.error} retry={links.refetch} />}
      </section>
      {profile.data ? (
        <form
          className="panel"
          key={`${profileId}-${profile.data.profile.version}`}
          onSubmit={(e) => {
            e.preventDefault();
            const values = new FormData(e.currentTarget);
            void action.run(async () => {
              await backend.request(
                `profiles/${profileId}`,
                json(
                  {
                    nickname: values.get('nickname'),
                    gradeOrAgeBand: values.get('grade'),
                    schoolOrGroup: values.get('school') || null,
                    interestDetails: String(values.get('details'))
                      .split(',')
                      .map((v) => v.trim())
                      .filter(Boolean),
                    growthGoal: values.get('goal'),
                    interests: String(values.get('interests'))
                      .split(',')
                      .map((v) => v.trim())
                      .filter(Boolean),
                  },
                  'PATCH',
                  profile.data!.profile.version,
                ),
              );
              await backend.refreshMe();
              action.setMessage('프로필을 저장했어요.');
            });
          }}
        >
          <h2>아이 프로필</h2>
          <label>
            별명
            <input
              name="nickname"
              defaultValue={profile.data.profile.nickname}
              maxLength={20}
              required
            />
          </label>
          <label>
            학년 또는 연령대
            <input
              name="grade"
              defaultValue={profile.data.profile.gradeOrAgeBand ?? ''}
              maxLength={30}
            />
          </label>
          <label>
            좋아하는 것 (쉼표로 나누기)
            <input name="interests" defaultValue={profile.data.profile.interests.join(', ')} />
          </label>
          <label>
            배우는 곳
            <select name="school" defaultValue={profile.data.profile.schoolOrGroup ?? ''}>
              <option value="">선택 안 함</option>
              <option value="elementary">초등학교</option>
              <option value="homeschool">홈스쿨</option>
              <option value="other">그 밖의 곳</option>
            </select>
          </label>
          <label>
            관심사에 관한 더 자세한 이야기 (쉼표로 나누기)
            <input name="details" defaultValue={profile.data.profile.interestDetails.join(', ')} />
          </label>
          <label>
            키우고 싶은 힘
            <input
              name="goal"
              defaultValue={profile.data.profile.growthGoal ?? ''}
              maxLength={60}
            />
          </label>
          <button className="btn" disabled={action.busy}>
            프로필 저장
          </button>
        </form>
      ) : profile.error ? (
        <Wait error={profile.error} retry={profile.refetch} />
      ) : (
        <p>
          {backend.me?.user.role === 'CHILD'
            ? '첫 인사를 마치면 프로필이 생겨요.'
            : '아이 연결을 확인하면 프로필을 볼 수 있어요.'}
        </p>
      )}
      {settings.data && (
        <section className="panel">
          <h2>화면과 음성 설정</h2>
          {(['ttsEnabled', 'guardianPreviewEnabled'] as const).map((field) => (
            <label key={field}>
              <input
                type="checkbox"
                checked={settings.data!.settings[field]}
                disabled={action.busy}
                onChange={(e) => {
                  const value = e.target.checked;
                  void action.run(async () => {
                    await backend.request(
                      `profiles/${profileId}/settings`,
                      json({ [field]: value }, 'PATCH', settings.data!.settings.version),
                    );
                  });
                }}
              />{' '}
              {field === 'ttsEnabled' ? '소리로 듣기 사용' : '보호자 미리보기'}
            </label>
          ))}
          <label>
            화면 테마
            <select
              value={settings.data.settings.theme}
              disabled={action.busy}
              onChange={(e) => {
                const theme = e.target.value;
                void action.run(async () => {
                  await backend.request(
                    `profiles/${profileId}/settings`,
                    json({ theme }, 'PATCH', settings.data!.settings.version),
                  );
                  document.documentElement.dataset.theme = theme.toLowerCase();
                });
              }}
            >
              <option value="AUTO">기기 설정</option>
              <option value="LIGHT">밝게</option>
              <option value="DARK">어둡게</option>
            </select>
          </label>
          <p>
            기록 보관 기간 {settings.data.settings.retentionDays}일
            {settings.data.settings.pendingRetentionDays
              ? ` · ${settings.data.settings.pendingRetentionDays}일로 변경 대기 중`
              : ''}
          </p>
          {backend.me?.user.role === 'GUARDIAN' && (
            <RetentionControl
              key={profileId}
              profileId={profileId}
              settings={settings.data.settings}
            />
          )}
        </section>
      )}
      {!!settings.error && <Wait error={settings.error} retry={settings.refetch} />}
      {profileId && <ConsentHistory key={`consents-${profileId}`} profileId={profileId} />}
      {backend.me?.user.role === 'GUARDIAN' && profileId && (
        <section className="panel">
          <h2>이용 안내와 동의</h2>
          {legal.data?.items.map((d) => (
            <details key={d.documentId}>
              <summary>
                {d.title}
                {d.required ? ' (필수)' : ''}
              </summary>
              <p>{d.body}</p>
            </details>
          ))}
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{' '}
            안내 내용을 확인했어요.
          </label>
          <button
            className="btn"
            disabled={action.busy || !confirmed || !legal.data?.items.length}
            onClick={() =>
              void action.run(async () => {
                await backend.request(
                  'consents',
                  json({
                    profileId,
                    items: legal.data!.items.map((d) => ({
                      documentId: d.documentId,
                      version: d.version,
                      agreed: true,
                    })),
                  }),
                );
                action.setMessage('확인한 동의를 저장했어요.');
              })
            }
          >
            동의 저장
          </button>
        </section>
      )}
      {shares.data && (
        <section className="panel">
          <h2>공유 확인 요청</h2>
          {!shares.data.items.length && <p>확인할 요청이 없어요.</p>}
          {shares.data.items.map((share) => (
            <ShareReview key={share.id} share={share} />
          ))}
          <button
            disabled={!shares.data.nextCursor}
            onClick={() => setShareCursor(shares.data!.nextCursor!)}
          >
            다음 요청
          </button>
        </section>
      )}
      {!!shares.error && <Wait error={shares.error} retry={shares.refetch} />}
      {backend.me?.user.role === 'GUARDIAN' && profileId && (
        <SafetyEvents key={`safety-${profileId}`} profileId={profileId} />
      )}
      <NotificationSettings />
      <div className="row">
        <Link className="btn light" to="/data">
          기록 관리
        </Link>
        <Link className="btn light" to="/report">
          발자국과 상담
        </Link>
      </div>
    </>
  );
}

function ShareReview({ share }: { share: Share }) {
  const { request } = useBackend();
  const action = useAction();
  const [confirmed, setConfirmed] = useState(false);
  return (
    <article className="server-review">
      <h3>{share.snapshot.title}</h3>
      <div className="server-prose">{share.snapshot.body}</div>
      <p>공개 범위: {share.audience === 'FAMILY' ? '가족' : '친구들'}</p>
      <p>
        {
          (
            {
              PENDING_GUARDIAN: '확인 대기',
              PENDING_REVIEW: '내용 검토 중',
              PUBLISHED: '공유 중',
              REJECTED: '보완 요청함',
              REVOKED: '공유 중단함',
              CANCELLED: '취소됨',
            } as Record<string, string>
          )[share.status]
        }
      </p>
      {share.status === 'PENDING_GUARDIAN' && (
        <>
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{' '}
            공개할 내용과 개인정보 가림을 확인했어요.
          </label>
          <Message text={action.message} />
          <div className="row">
            <button
              className="btn"
              disabled={action.busy || !confirmed}
              onClick={() =>
                void action.run(async () => {
                  await request(
                    `guardian/share-requests/${share.id}/approve`,
                    json({ confirmedBodyVersion: share.storyVersion, confirmedRedactions: true }),
                  );
                })
              }
            >
              공유 승인
            </button>
            <button
              className="btn light"
              disabled={action.busy}
              onClick={() => {
                const reason = window.prompt('보완할 내용을 적어 주세요.');
                if (reason)
                  void action.run(async () => {
                    await request(`guardian/share-requests/${share.id}/reject`, json({ reason }));
                  });
              }}
            >
              수정 요청
            </button>
          </div>
        </>
      )}
      {['PUBLISHED', 'PENDING_REVIEW'].includes(share.status) && (
        <button
          disabled={action.busy}
          onClick={() => {
            if (window.confirm('이 이야기의 공유를 중단할까요?'))
              void action.run(async () => {
                await request(
                  `guardian/share-requests/${share.id}/revoke`,
                  json({ reason: '보호자가 공유 중단을 요청했어요.' }),
                );
              });
          }}
        >
          공유 중단
        </button>
      )}
      <Message text={action.message} />
    </article>
  );
}

interface Progress {
  period: { from: string; to: string };
  activity: {
    activeDays: number;
    completedStories: number;
    completedActivities: number;
    newWords: number;
  };
  notice: string;
  timeline: { date: string; messages: number }[];
}
interface ReportResult {
  observations: string[];
  suggestedQuestions: string[];
  examples: { recordId: string; description: string }[];
}
interface ReportJob {
  id: string;
  status: string;
  result: ReportResult | null;
}

export function ServerReport() {
  const { profileId, selector } = useProfileSelection();
  return <ReportContent key={profileId} profileId={profileId} selector={selector} />;
}

function ReportContent({ profileId, selector }: { profileId: string; selector: ReactNode }) {
  const backend = useBackend();
  const action = useAction();
  const [period, setPeriod] = useState('7d');
  const cache = useServerCache();
  const [summaryId, setSummaryId] = useState('');
  const [consultationId, setConsultationId] = useState('');
  const setSummary = (job: ReportJob | null) => {
    if (job) cache.set(`reports/summaries/${job.id}`, job);
    setSummaryId(job?.id ?? '');
  };
  const setConsultation = (job: ReportJob) => setConsultationId(job.id);
  const [question, setQuestion] = useState('');
  const [historyCursor, setHistoryCursor] = useState('');
  const history = useServerQuery<Page<{ id: string; profileId: string; period: string }>>(
    backend.me?.user.role === 'GUARDIAN'
      ? `guardian/consultations?cursor=${encodeURIComponent(historyCursor)}`
      : null,
  );
  const refreshedSummary = useServerQuery<ReportJob>(
    summaryId ? `reports/summaries/${summaryId}` : null,
    true,
  );
  const refreshedConsultation = useServerQuery<
    ReportJob & { messages: { id: string; content: string; role: string }[] }
  >(consultationId ? `guardian/consultations/${consultationId}` : null, true);
  const summaryResult = refreshedSummary.data?.result;
  const consultationResult = refreshedConsultation.data?.result;
  const month = new Date().toISOString().slice(0, 7);
  const q = useServerQuery<Progress>(
    profileId ? `reports/progress?profileId=${profileId}&period=${period}` : null,
  );
  const eligibility = useServerQuery<{
    eligible: boolean;
    missing: string[];
    availableFrom: string;
  }>(
    profileId && backend.me?.user.role === 'GUARDIAN'
      ? `guardian/consultations/eligibility?profileId=${profileId}&period=${month}`
      : null,
  );
  if (!profileId)
    return (
      <section className="panel">
        <h1>나의 발자국</h1>
        <p>프로필을 먼저 준비해 주세요.</p>
        <Link to="/profile">프로필과 보호자 연결</Link>
      </section>
    );
  return (
    <>
      <header className="page-head">
        <h1>나의 발자국</h1>
        <p>완성한 기록을 바탕으로 활동을 돌아봐요.</p>
      </header>
      {selector}
      <select
        aria-label="조회 기간"
        value={period}
        onChange={(e) => {
          setPeriod(e.target.value);
          setSummary(null);
        }}
      >
        <option value="7d">최근 7일</option>
        <option value="30d">최근 30일</option>
        <option value="90d">최근 90일</option>
      </select>
      <Message text={action.message} />
      {!q.data ? (
        <Wait error={q.error} retry={q.refetch} />
      ) : (
        <>
          <div className="server-grid">
            {[
              ['이야기한 날', q.data.activity.activeDays],
              ['완성한 이야기', q.data.activity.completedStories],
              ['완성한 모험', q.data.activity.completedActivities],
              ['새 단어', q.data.activity.newWords],
            ].map(([label, value]) => (
              <section className="panel" key={label}>
                <h2>{label}</h2>
                <strong className="server-number">{value}</strong>
              </section>
            ))}
          </div>
          <p>{q.data.notice}</p>
          <section className="panel">
            <h2>활동한 날</h2>
            {q.data.timeline.map((day) => (
              <p key={day.date}>
                {day.date} · 내 생각 {day.messages}번
              </p>
            ))}
            {!q.data.timeline.length && <p>이 기간에는 대화 기록이 없어요.</p>}
            <button
              className="btn"
              disabled={action.busy}
              onClick={() =>
                void action.run(async () => {
                  setSummary(
                    await backend.request<ReportJob>(
                      'reports/summaries',
                      json({ profileId, from: q.data!.period.from, to: q.data!.period.to }),
                    ),
                  );
                })
              }
            >
              활동 요약 만들기
            </button>
          </section>
        </>
      )}
      {!!refreshedSummary.error && (
        <Wait error={refreshedSummary.error} retry={refreshedSummary.refetch} />
      )}
      {refreshedSummary.data?.status === 'STALE' && (
        <p>원본 기록이 바뀌었어요. 활동 요약을 다시 만들어 주세요.</p>
      )}
      {summaryResult && (
        <section className="panel">
          <h2>기록으로 돌아보기</h2>
          {summaryResult.observations.map((text) => (
            <p key={text}>{text}</p>
          ))}
          {summaryResult.examples.map((example) => (
            <Link key={example.recordId} to={`/shelf/${example.recordId}`}>
              {example.description} →{' '}
            </Link>
          ))}
        </section>
      )}
      {history.data && (
        <section className="panel">
          <h2>지난 상담 기록</h2>
          {history.data.items
            .filter((item) => item.profileId === profileId)
            .map((item) => (
              <button
                key={item.id}
                disabled={action.busy}
                onClick={() => setConsultationId(item.id)}
              >
                {item.period} 기록 열기
              </button>
            ))}
          <button
            disabled={!history.data.nextCursor}
            onClick={() => setHistoryCursor(history.data!.nextCursor!)}
          >
            다음 상담
          </button>
        </section>
      )}
      {!!eligibility.error && <Wait error={eligibility.error} retry={eligibility.refetch} />}
      {eligibility.data && (
        <section className="panel">
          <h2>보호자와 함께 돌아보기</h2>
          <p>
            {eligibility.data.eligible
              ? '이번 달 기록을 함께 살펴볼 수 있어요.'
              : '30일 이상의 활동과 완성 기록, 대화 기록이 쌓이면 이용할 수 있어요.'}
          </p>
          <button
            className="btn"
            disabled={action.busy || !eligibility.data.eligible}
            onClick={() =>
              void action.run(async () => {
                setConsultation(
                  await backend.request<ReportJob>(
                    'guardian/consultations',
                    json({ profileId, period: month }),
                  ),
                );
              })
            }
          >
            월간 기록 살펴보기
          </button>
          {consultationId && !refreshedConsultation.data && (
            <Wait error={refreshedConsultation.error} retry={refreshedConsultation.refetch} />
          )}
          {consultationId && consultationResult && (
            <>
              {consultationResult.observations.map((text) => (
                <p key={text}>{text}</p>
              ))}
              {refreshedConsultation.data?.messages.map((m) => (
                <p key={m.id}>
                  {m.role === 'GUARDIAN' ? '보호자' : '티키'}: {m.content}
                </p>
              ))}
              <label>
                기록에 관해 궁금한 점
                <textarea
                  maxLength={1000}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </label>
              <button
                className="btn light"
                disabled={action.busy || !question.trim()}
                onClick={() =>
                  void action.run(async () => {
                    await backend.request<{ reply: { content: string } }>(
                      `guardian/consultations/${consultationId}/questions`,
                      json({ clientMessageId: crypto.randomUUID(), text: question }),
                    );
                    setQuestion('');
                  })
                }
              >
                질문 남기기
              </button>
            </>
          )}
        </section>
      )}
    </>
  );
}

interface DataJob {
  id: string;
  status: string;
  errorCode?: string;
  createdAt: string;
}
interface JobResponse {
  job: DataJob;
  statusUrl?: string;
  downloadUrl?: string;
  cancelUntil?: string;
}

export function ServerData() {
  const { profileId, selector } = useProfileSelection();
  const backend = useBackend();
  const action = useAction();
  const statusKey = `jjcp-data-job-${backend.me?.user.id}-${profileId}`;
  const [selectedJob, selectJob] = useState<{ profileId: string; url: string } | null>(null);
  const statusUrl =
    selectedJob?.profileId === profileId
      ? selectedJob.url
      : (sessionStorage.getItem(statusKey) ?? '');
  const setStatusUrl = (url: string) => {
    sessionStorage.setItem(statusKey, url);
    selectJob({ profileId, url });
  };
  const [scope, setScope] = useState('STORIES');
  const overview = useServerQuery<{
    counts: Record<string, number>;
    retentionDays: number;
    pendingJobs: DataJob[];
  }>(profileId ? `data/overview?profileId=${profileId}` : null);
  const job = useServerQuery<JobResponse>(
    statusUrl ? statusUrl.replace('/api/v1/', '') : null,
    true,
  );
  const [confirm, setConfirm] = useState('');
  const names: Record<string, string> = {
    PROFILE: '프로필',
    CONVERSATIONS: '대화',
    STORIES: '이야기',
    ACTIVITIES: '모험',
    WORDBOOK: '단어장',
    REPORTS: '요약과 상담',
  };
  if (!profileId)
    return (
      <section className="panel">
        <h1>기록 관리</h1>
        <p>프로필이나 연결된 아이가 없어요.</p>
        <Link to="/profile">프로필과 보호자 연결</Link>
        <AccountDeletion />
      </section>
    );
  return (
    <>
      <header className="page-head">
        <h1>내 기록 관리</h1>
        <p>보관한 기록을 확인하고 내려받을 수 있어요.</p>
      </header>
      {selector}
      <Message text={action.message} />
      {!!job.error && <Wait error={job.error} retry={job.refetch} />}
      {!overview.data ? (
        <Wait error={overview.error} retry={overview.refetch} />
      ) : (
        <section className="panel">
          <h2>보관 중인 기록</h2>
          {Object.entries(overview.data.counts).map(([key, count]) => (
            <p key={key}>
              {names[key] ?? key} · {count}개
            </p>
          ))}
          <p>보관 기간: {overview.data.retentionDays}일</p>
          <button
            className="btn"
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                const result = await backend.request<JobResponse>(
                  'data-exports',
                  json({ profileId, format: 'JSON', include: Object.keys(names) }),
                );
                setStatusUrl(result.statusUrl!);
              })
            }
          >
            내 기록 내려받기 준비
          </button>
        </section>
      )}
      {job.data && (
        <section className="panel">
          <h2>요청 처리 상태</h2>
          <p>
            {
              (
                {
                  QUEUED: '처리를 기다리고 있어요.',
                  RUNNING: '처리 중이에요.',
                  SUCCEEDED: '처리를 마쳤어요.',
                  FAILED: '처리에 실패했어요. 다시 요청해 주세요.',
                  CANCELLED: '요청이 취소됐어요.',
                } as Record<string, string>
              )[job.data.job.status]
            }
          </p>
          <button className="btn light" onClick={() => void job.refetch()}>
            상태 새로고침
          </button>
          {job.data.downloadUrl && (
            <button
              className="btn"
              disabled={action.busy}
              onClick={() =>
                void action.run(async () => {
                  const payload = await backend.request<unknown>(
                    job.data!.downloadUrl!.replace('/api/v1/', ''),
                  );
                  const blob =
                    payload instanceof Blob
                      ? payload
                      : new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement('a');
                  anchor.href = url;
                  anchor.download = 'my-records.json';
                  anchor.click();
                  URL.revokeObjectURL(url);
                })
              }
            >
              파일 내려받기
            </button>
          )}
          {job.data.cancelUntil && job.data.job.status === 'QUEUED' && (
            <button
              className="btn light"
              disabled={action.busy}
              onClick={() =>
                void action.run(async () => {
                  await backend.request(statusUrl.replace('/api/v1/', '') + '/cancel', json({}));
                })
              }
            >
              삭제 요청 취소
            </button>
          )}
        </section>
      )}
      {backend.me?.user.role === 'GUARDIAN' && (
        <section className="panel">
          <h2>아이 기록 삭제</h2>
          <p>요청한 기록은 24시간 뒤 삭제돼요. 그 전에는 취소할 수 있어요.</p>
          <label>
            삭제할 기록
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              {Object.entries(names).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
              <option value="ALL_CHILD_DATA">아이의 모든 기록</option>
            </select>
          </label>
          <label>
            삭제하려면 DELETE를 입력해 주세요.
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          <button
            className="btn light"
            disabled={action.busy || confirm !== 'DELETE'}
            onClick={() =>
              void action.run(async () => {
                const result = await backend.request<JobResponse>(
                  'data-deletion-requests',
                  json({ profileId, scope, confirmation: 'DELETE' }),
                );
                setStatusUrl(result.statusUrl!);
                setConfirm('');
              })
            }
          >
            삭제 요청
          </button>
        </section>
      )}
      <AccountDeletion />
    </>
  );
}

export function ServerTech() {
  const [cursor, setCursor] = useState('');
  const [unread, setUnread] = useState(false);
  const notifications = useServerQuery<
    Page<{
      id: string;
      title: string;
      readAt: string | null;
      resource: { type: string; id: string };
    }>
  >(`notifications?cursor=${encodeURIComponent(cursor)}${unread ? '&unread=true' : ''}`);
  const backend = useBackend();
  const action = useAction();
  return (
    <>
      <section className="panel">
        <h1>티키와 기록 안내</h1>
        <p>대화와 활동은 로그인한 계정의 서버 DB에 저장돼요. 음성 원본은 저장하지 않아요.</p>
        <p>
          대화에 ‘준비된 안내’ 표시가 있으면 미리 준비한 규칙 기반 응답이에요. 외부 서비스가 연결된
          경우에만 실제 AI 응답과 음성인식을 사용할 수 있어요.
        </p>
        <Link to="/data">내 기록 관리 →</Link>
      </section>
      <section className="panel">
        <h2>내 알림</h2>
        <label>
          <input
            type="checkbox"
            checked={unread}
            onChange={(e) => {
              setUnread(e.target.checked);
              setCursor('');
            }}
          />
          아직 확인하지 않은 알림만 보기
        </label>
        <Message text={action.message} />
        {!notifications.data && <Wait error={notifications.error} retry={notifications.refetch} />}
        {notifications.data?.items.map((notification) => (
          <div className="row between" key={notification.id}>
            <p>{notification.title}</p>
            {notification.resource.type === 'shareRequest' && (
              <Link to="/profile">공유 요청 살펴보기</Link>
            )}
            <button
              disabled={action.busy || !!notification.readAt}
              onClick={() =>
                void action.run(async () => {
                  await backend.request(`notifications/${notification.id}/read`, json({}));
                })
              }
            >
              {notification.readAt ? '확인함' : '확인'}
            </button>
          </div>
        ))}
        {notifications.data?.items.length === 0 && <p>새로운 알림이 없어요.</p>}
        <button
          disabled={!notifications.data?.nextCursor}
          onClick={() => setCursor(notifications.data!.nextCursor!)}
        >
          다음 알림
        </button>
      </section>
    </>
  );
}
