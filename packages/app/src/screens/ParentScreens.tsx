import { confirmAction, promptText } from '../components/dialogs';
import { ChoiceControl } from '../components/ChoiceControl';
import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { GuardianNav, GuardianProvider } from '../components/GuardianParts';
import { useMutation } from '@tanstack/react-query';
import type { Model } from '../api/schema';
import { json, errorMessage } from '../api/requestOptions';
import { useServerQuery, useAction, useServerCache } from '../hooks/useServerApi';
import { useBackend } from '../providers/BackendProvider';
import { ProgressChart } from '../components/ProgressChart';
import { PageHeading } from '../components/ui';
import { Message, Wait } from '../components/QueryFeedback';
import { ConsentHistory, NotificationSettings, SafetyEvents } from '../components/ManagementPanels';

export function ProtectedParentScreen() {
  const { scopeId } = useBackend();
  return (
    <GuardianProvider key={scopeId}>
      <Outlet />
    </GuardianProvider>
  );
}
function useProfileSelection() {
  const { profileId: defaultId } = useBackend();
  const [selected, select] = useState('');
  const q = useServerQuery<Model<'ProfileListResponse'>>('profiles');
  const profileId = q.data?.items.some((p) => p.id === selected)
    ? selected
    : defaultId || q.data?.items[0]?.id || '';
  const selector = q.data ? (
    <label>
      아이 선택
      <select value={profileId} onChange={(e) => select(e.target.value)}>
        {q.data.items.map((p) => (
          <option value={p.id} key={p.id}>
            {p.nickname || '첫인사 전 아이'}
          </option>
        ))}
      </select>
    </label>
  ) : (
    <Wait error={q.error} retry={q.refetch} />
  );
  return { profileId, selector, profile: q.data?.items.find((p) => p.id === profileId) };
}
export function ServerProfile() {
  const backend = useBackend();
  const action = useAction();
  const { profileId, selector } = useProfileSelection();
  const [token, setToken] = useState('');
  const profile = useServerQuery<Model<'ProfileResponse'>>(
    profileId ? `profiles/${profileId}` : null,
  );
  const settings = useServerQuery<Model<'SettingsResponse'>>(
    profileId ? `profiles/${profileId}/settings` : null,
  );
  const links = useServerQuery<Model<'LinkListResponse'>>(
    profileId ? `guardian-links?profileId=${profileId}` : null,
  );
  const invitation = useMutation({
    mutationFn: () =>
      backend.request<Model<'InvitationResponse'>>(
        'guardian-links/invitations',
        json({ profileId }),
      ),
    gcTime: 0,
  });
  return (
    <>
      <PageHeading
        eyebrow="MY LITTLE VILLAGE"
        title="내 프로필과 설정"
        description="티키가 기억할 내 이야기와 이용 설정을 살펴봐요."
      />
      <GuardianNav />
      <Message text={action.message} />
      {selector}
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void action.run(async () => {
            await backend.request('profiles', json({ nickname: f.get('nickname') }));
            await backend.refreshMe();
            action.setMessage('아이 프로필을 만들었어요. 위에서 선택할 수 있어요.');
          });
        }}
      >
        <h2>아이 프로필 추가</h2>
        <label>
          별명
          <input name="nickname" required maxLength={20} />
        </label>
        <button className="btn light" disabled={action.busy}>
          프로필 만들기
        </button>
      </form>
      {profile.data ? (
        <form
          className="panel"
          key={`profile-${profileId}-${profile.data.profile.version}`}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void action.run(async () => {
              await backend.request(
                `profiles/${profileId}`,
                json(
                  {
                    nickname: f.get('nickname'),
                    gradeOrAgeBand: f.get('grade') || null,
                    schoolOrGroup: f.get('school') || null,
                    interests: String(f.get('interests'))
                      .split(',')
                      .map((v) => v.trim())
                      .filter(Boolean),
                    growthGoal: f.get('goal') || null,
                  },
                  'PATCH',
                  profile.data!.profile.version,
                ),
              );
              await backend.refreshMe();
            });
          }}
        >
          <h2>아이 정보</h2>
          <label>
            별명
            <input
              name="nickname"
              defaultValue={profile.data.profile.nickname}
              required
              maxLength={20}
            />
          </label>
          <label>
            학년·연령대
            <input
              name="grade"
              defaultValue={profile.data.profile.gradeOrAgeBand ?? ''}
              maxLength={30}
            />
          </label>
          <label>
            소속 종류
            <input
              name="school"
              defaultValue={profile.data.profile.schoolOrGroup ?? ''}
              maxLength={20}
            />
          </label>
          <label>
            좋아하는 것 (쉼표로 나누어 최대 5개)
            <input
              name="interests"
              defaultValue={(profile.data.profile.interests ?? []).join(', ')}
            />
          </label>
          <label>
            성장 목표
            <input
              name="goal"
              defaultValue={profile.data.profile.growthGoal ?? ''}
              maxLength={60}
            />
          </label>
          <button
            className="btn light"
            disabled={action.busy || !profile.data.profile.permissions.includes('MANAGE_DATA')}
          >
            프로필 저장
          </button>
        </form>
      ) : (
        profileId && <Wait error={profile.error} retry={profile.refetch} />
      )}
      {settings.data && (
        <form
          className="panel"
          key={`settings-${profileId}-${settings.data.settings.version}`}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const days = Number(f.get('days'));
            if (
              days < settings.data!.settings.retentionDays &&
              !(await confirmAction('보관 기간보다 오래된 대화가 정리 대상이 돼요. 변경할까요?'))
            )
              return;
            void action.run(async () => {
              const r = await backend.request<Model<'SettingsResponse'>>(
                `profiles/${profileId}/settings`,
                json(
                  {
                    voiceEnabled: f.has('voice'),
                    ttsEnabled: f.has('tts'),
                    guardianPreviewEnabled: f.has('preview'),
                    theme: f.get('theme'),
                    retentionDays: days,
                  },
                  'PATCH',
                  settings.data!.settings.version,
                ),
              );
              action.setMessage(r.retentionNotice?.message ?? '설정을 저장했어요.');
            });
          }}
        >
          <h2>이용 설정</h2>
          <ChoiceControl
            label="음성 사용 허용"
            description="마이크 입력과 읽어주기를 사용할 수 있어요. 끄면 글로만 대화해요."
            variant="switch"
            name="voice"
            defaultChecked={settings.data.settings.voiceEnabled}
          />
          <ChoiceControl
            label="메시지 소리로 듣기"
            variant="switch"
            name="tts"
            defaultChecked={settings.data.settings.ttsEnabled}
          />
          <ChoiceControl
            label="보호자 미리보기"
            variant="switch"
            name="preview"
            defaultChecked={settings.data.settings.guardianPreviewEnabled}
          />
          <label>
            테마
            <select name="theme" defaultValue={settings.data.settings.theme}>
              <option value="AUTO">기기 설정</option>
              <option value="LIGHT">밝게</option>
              <option value="DARK">어둡게</option>
            </select>
          </label>
          <label>
            대화 보관 기간
            <select name="days" defaultValue={settings.data.settings.retentionDays}>
              {[30, 90, 180, 365].map((v) => (
                <option value={v} key={v}>
                  {v}일
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn light"
            disabled={action.busy || !profile.data?.profile.permissions.includes('MANAGE_DATA')}
          >
            설정 저장
          </button>
        </form>
      )}
      <section className="panel" key={profileId}>
        <h2>보호자 초대와 연결</h2>
        <button
          className="btn light"
          disabled={!profileId || invitation.isPending}
          onClick={() => invitation.mutate()}
        >
          보호자 초대 코드 만들기
        </button>
        {invitation.error && <Message text={errorMessage(invitation.error)} />}
        {invitation.data?.invitation.profileId === profileId && (
          <p>
            초대 코드: <code>{invitation.data.invitation.token}</code> ·{' '}
            {new Date(invitation.data.invitation.expiresAt).toLocaleString('ko-KR')}까지
          </p>
        )}
        <label>
          받은 초대 코드
          <input value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
        </label>
        <button
          className="btn light"
          disabled={action.busy || !token.trim()}
          onClick={() =>
            void action.run(async () => {
              await backend.request(
                `guardian-links/invitations/${encodeURIComponent(token.trim())}/accept`,
                json({}),
              );
              setToken('');
              await backend.refreshMe();
            })
          }
        >
          초대 수락
        </button>
        {links.data?.items.map((link) => (
          <div key={link.id}>
            <p>
              {link.role === 'OWNER' ? '프로필 소유자' : '초대한 보호자'} ·{' '}
              {link.status === 'ACTIVE' ? '연결됨' : '연결 해제됨'}
            </p>
            {link.role !== 'OWNER' && link.status === 'ACTIVE' && (
              <>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void action.run(async () => {
                      await backend.request(
                        `guardian-links/${link.id}`,
                        json({ permissions: f.getAll('permissions') }, 'PATCH'),
                      );
                    });
                  }}
                >
                  {[
                    'VIEW_PROFILE',
                    'VIEW_STORIES',
                    'VIEW_REPORTS',
                    'REVIEW_SHARING',
                    'MANAGE_DATA',
                  ].map((v, i) => (
                    <ChoiceControl
                      key={v}
                      label={
                        ['프로필 보기', '이야기 보기', '보고서 보기', '공유 확인', '데이터 관리'][
                          i
                        ]!
                      }
                      name="permissions"
                      value={v}
                      defaultChecked={link.permissions.includes(v)}
                    />
                  ))}
                  <button className="btn light" disabled={action.busy}>
                    권한 저장
                  </button>
                </form>
                <button
                  className="btn light"
                  disabled={action.busy}
                  onClick={async () => {
                    if (await confirmAction('보호자 연결을 해제할까요?'))
                      void action.run(async () => {
                        await backend.request(`guardian-links/${link.id}`, { method: 'DELETE' });
                        await backend.refreshMe();
                      });
                  }}
                >
                  연결 해제
                </button>
              </>
            )}
          </div>
        ))}
        {links.error && <Wait error={links.error} retry={links.refetch} />}
      </section>
      {profileId && (
        <>
          <ConsentHistory key={profileId} profileId={profileId} />
          <ShareReviews key={`share-${profileId}`} profileId={profileId} />
          <SafetyEvents key={`safety-${profileId}`} profileId={profileId} />
        </>
      )}
      <NotificationSettings />
      <Notifications />
    </>
  );
}
function ShareReviews({ profileId }: { profileId: string }) {
  const { request } = useBackend();
  const action = useAction();
  const [cursor, go] = useState('');
  const [selected, select] = useState('');
  const q = useServerQuery<Model<'ShareRequestList'>>(
    `guardian/share-requests?status=ALL&profileId=${profileId}&cursor=${encodeURIComponent(cursor)}`,
  );
  const story = useServerQuery<Model<'StoryDetail'>>(
    selected ? `stories/${selected}?profileId=${profileId}` : null,
  );
  return (
    <section className="panel">
      <h2>공유 요청 확인</h2>
      <Message text={action.message} />
      {q.data ? (
        <>
          {q.data.items.map((s) => (
            <article key={s.id}>
              <p>
                {s.status} · {new Date(s.requestedAt).toLocaleString('ko-KR')}
              </p>
              <button className="btn light" onClick={() => select(s.storyId)}>
                이야기 내용 확인
              </button>
              {s.storyId === selected &&
                (story.data ? (
                  <>
                    <h3>{story.data.story.title}</h3>
                    <p className="server-prose">{story.data.story.body}</p>
                    {s.status === 'PENDING_GUARDIAN' && (
                      <>
                        <button
                          className="btn light"
                          disabled={action.busy}
                          onClick={async () => {
                            if (
                              await confirmAction('개인정보와 내용을 확인했으며 공유를 승인할까요?')
                            )
                              void action.run(async () => {
                                await request(
                                  `guardian/share-requests/${s.id}/approve?profileId=${profileId}`,
                                  json({
                                    confirmedBodyVersion: story.data!.story.version,
                                    confirmedRedactions: true,
                                  }),
                                );
                              });
                          }}
                        >
                          내용 확인 후 승인
                        </button>
                        <button
                          className="btn light"
                          disabled={action.busy}
                          onClick={async () => {
                            const reason = await promptText('공유하지 않는 이유');
                            if (reason?.trim())
                              void action.run(async () => {
                                await request(
                                  `guardian/share-requests/${s.id}/reject?profileId=${profileId}`,
                                  json({ reason }),
                                );
                              });
                          }}
                        >
                          거절
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <Wait error={story.error} retry={story.refetch} />
                ))}
              {['PUBLISHED', 'APPROVED'].includes(s.status) && (
                <button
                  className="btn light"
                  disabled={action.busy}
                  onClick={async () => {
                    if (await confirmAction('공유를 철회할까요?'))
                      void action.run(async () => {
                        await request(
                          `guardian/share-requests/${s.id}/revoke?profileId=${profileId}`,
                          json({}),
                        );
                      });
                  }}
                >
                  공유 철회
                </button>
              )}
            </article>
          ))}
          {!q.data.items.length && <p>확인할 공유 요청이 없어요.</p>}
          <button
            className="btn light"
            disabled={!q.data.nextCursor}
            onClick={() => go(q.data!.nextCursor!)}
          >
            다음 요청
          </button>
        </>
      ) : (
        <Wait error={q.error} retry={q.refetch} />
      )}
    </section>
  );
}
function Notifications() {
  const { request } = useBackend();
  const action = useAction();
  const [cursor, go] = useState('');
  const q = useServerQuery<Model<'NotificationList'>>(
    `notifications?cursor=${encodeURIComponent(cursor)}`,
  );
  return (
    <section className="panel">
      <h2>받은 알림</h2>
      <Message text={action.message} />
      {q.data ? (
        <>
          <p>읽지 않은 알림 {q.data.unreadCount}개</p>
          {q.data.items.map((n) => (
            <article key={n.id}>
              <h3>{n.title}</h3>
              <p>{n.body}</p>
              {!n.readAt && (
                <button
                  className="btn light"
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      await request(`notifications/${n.id}/read`, json({}));
                    })
                  }
                >
                  읽음으로 표시
                </button>
              )}
            </article>
          ))}
          <button
            className="btn light"
            disabled={!q.data.nextCursor}
            onClick={() => go(q.data!.nextCursor!)}
          >
            다음 알림
          </button>
        </>
      ) : (
        <Wait error={q.error} retry={q.refetch} />
      )}
    </section>
  );
}
export function ServerReport() {
  const { profileId, selector } = useProfileSelection();
  return (
    <>
      <PageHeading
        eyebrow="MY THINKING JOURNEY"
        title="차곡차곡 쌓인 생각의 발자국"
        description="정답이나 점수보다, 아이가 어떻게 생각했는지 함께 살펴봐요."
      />
      {selector}
      {profileId && <ProfileReport key={profileId} profileId={profileId} />}
    </>
  );
}
function ProfileReport({ profileId }: { profileId: string }) {
  const { request } = useBackend();
  const cache = useServerCache();
  const action = useAction();
  const [period, setPeriod] = useState('7d');
  const [summaryId, setSummary] = useState('');
  const [consultId, setConsult] = useState('');
  const [cursor, go] = useState('');
  const q = useServerQuery<Model<'ProgressResponse'>>(
    `reports/progress?profileId=${profileId}&period=${period}`,
  );
  const summary = useServerQuery<Model<'SummaryResponse'>>(
    summaryId ? `reports/summaries/${summaryId}?profileId=${profileId}` : null,
  );
  const eligibility = useServerQuery<Model<'EligibilityResponse'>>(
    `guardian/consultations/eligibility?profileId=${profileId}`,
  );
  const consultations = useServerQuery<Model<'ConsultationList'>>(
    `guardian/consultations?profileId=${profileId}&cursor=${encodeURIComponent(cursor)}`,
  );
  const consultation = useServerQuery<Model<'ConsultationResponse'>>(
    consultId ? `guardian/consultations/${consultId}?profileId=${profileId}` : null,
  );
  return (
    <>
      <Message text={action.message} />
      <label>
        기간
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="7d">이번 주</option>
          <option value="30d">이번 달</option>
          <option value="90d">최근 90일</option>
        </select>
      </label>
      {q.data ? (
        <>
          <div className="cards stats">
            <section className="panel">
              <span className="stat-label">생각을 나눈 날</span>
              <div className="metric">
                {q.data.activity.activeDays}
                <small>일</small>
              </div>
              <small className="muted">선택한 기간의 활동</small>
            </section>
            <section className="panel">
              <span className="stat-label">완성한 이야기</span>
              <div className="metric">
                {q.data.activity.completedStories}
                <small>편</small>
              </div>
              <small className="muted">책장에 모인 생각</small>
            </section>
            <section className="panel">
              <span className="stat-label">새로 만난 단어</span>
              <div className="metric">
                {q.data.activity.newWords}
                <small>개</small>
              </div>
              <small className="muted">생각을 넓히는 말</small>
            </section>
          </div>
          <section className="panel">
            <div className="section-title">
              <h2>생각을 나눈 발자국</h2>
              <small>
                {q.data.period.from} ~ {q.data.period.to}
              </small>
            </div>
            <ProgressChart points={q.data.timeline} />
            <p className="muted">{q.data.notice}</p>
            <details>
              <summary>날짜별 기록 살펴보기</summary>
              {q.data.timeline.map((t) => (
                <p key={t.date}>
                  {t.date} · 이야기 {t.completedStories}편 · 답변 {t.responses}회
                </p>
              ))}
            </details>
            <button
              className="btn light"
              disabled={action.busy}
              onClick={() =>
                void action.run(async () => {
                  const r = await request<Model<'SummaryResponse'>>(
                    `reports/summaries?profileId=${profileId}`,
                    json({ profileId, from: q.data!.period.from, to: q.data!.period.to }),
                  );
                  cache.set(`reports/summaries/${r.summary.id}?profileId=${profileId}`, r);
                  setSummary(r.summary.id);
                })
              }
            >
              활동 요약 보기
            </button>
          </section>
        </>
      ) : (
        <Wait error={q.error} retry={q.refetch} />
      )}
      {summaryId &&
        (summary.data ? (
          <section className="panel">
            <h2>활동 요약</h2>
            {[
              ...summary.data.summary.summary.highlights,
              ...summary.data.summary.summary.suggestions,
              ...summary.data.summary.summary.conversationTips,
            ].map((v, i) => (
              <p key={i}>{v}</p>
            ))}
            <p>{summary.data.summary.notice}</p>
          </section>
        ) : (
          <Wait error={summary.error} retry={summary.refetch} />
        ))}
      <section className="panel">
        <h2>보호자와 함께 돌아보기</h2>
        {eligibility.data ? (
          <>
            <p>{eligibility.data.reason}</p>
            <button
              className="btn light"
              disabled={action.busy || !eligibility.data.eligible}
              onClick={() =>
                void action.run(async () => {
                  const r = await request<Model<'ConsultationResponse'>>(
                    `guardian/consultations?profileId=${profileId}`,
                    json({ period: eligibility.data!.period }),
                  );
                  setConsult(r.consultation.id);
                })
              }
            >
              이번 달 상담 기록 만들기
            </button>
          </>
        ) : (
          <Wait error={eligibility.error} retry={eligibility.refetch} />
        )}
        {consultations.data?.items.map((c) => (
          <p key={c.id}>
            <button className="btn light" onClick={() => setConsult(c.id)}>
              {c.period} 상담 보기
            </button>
          </p>
        ))}
        <button
          className="btn light"
          disabled={!consultations.data?.nextCursor}
          onClick={() => go(consultations.data!.nextCursor!)}
        >
          다음 상담
        </button>
        {consultId &&
          (consultation.data ? (
            <>
              <h3>{consultation.data.consultation.period}</h3>
              {[
                ...consultation.data.consultation.consultation.observedBehaviors,
                ...consultation.data.consultation.consultation.examples,
                ...consultation.data.consultation.consultation.questionsToTry,
              ].map((v, i) => (
                <p key={i}>{v}</p>
              ))}
              {consultation.data.consultation.questions?.map((v) => (
                <div key={v.id}>
                  <strong>{v.question}</strong>
                  <p>{v.answer}</p>
                </div>
              ))}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void action.run(async () => {
                    await request(
                      `guardian/consultations/${consultId}/questions?profileId=${profileId}`,
                      json({ question: f.get('question') }),
                    );
                  });
                }}
              >
                <label>
                  궁금한 점<input name="question" required maxLength={1000} />
                </label>
                <button className="btn light" disabled={action.busy}>
                  질문하기
                </button>
              </form>
            </>
          ) : (
            <Wait error={consultation.error} retry={consultation.refetch} />
          ))}
      </section>
    </>
  );
}
export function ServerData() {
  const backend = useBackend();
  const action = useAction();
  const [exportId, setExport] = useState('');
  const [deletionId, setDeletion] = useState('');
  const [accountId, setAccount] = useState(
    () => localStorage.getItem(`jjcp-account-delete-${backend.me?.user.id}`) ?? '',
  );
  const overview = useServerQuery<Model<'DataOverview'>>('data/overview');
  const exported = useServerQuery<Model<'ExportDetail'>>(
    exportId ? `data-exports/${exportId}` : null,
    true,
  );
  const pending = deletionId || overview.data?.pendingDeletionRequestId;
  const deletion = useServerQuery<Model<'DeletionRequestResponse'>>(
    pending ? `data-deletion-requests/${pending}` : null,
  );
  const account = useServerQuery<Model<'DeletionRequestResponse'>>(
    accountId ? `account-deletion-requests/${accountId}` : null,
  );
  return (
    <>
      <PageHeading
        eyebrow="MY RECORDS"
        title="소중한 기록을 직접 관리해요"
        description="기록을 내려받거나, 남길 내용을 선택할 수 있어요."
      />
      <Message text={action.message} />
      {overview.data ? (
        <section className="panel">
          <h2>저장된 데이터</h2>
          {Object.entries(overview.data.counts).map(([k, v]) => (
            <p key={k}>
              {(
                {
                  profiles: '프로필',
                  conversations: '대화',
                  messages: '메시지',
                  stories: '이야기',
                  topics: '주제',
                  words: '단어',
                  books: '이야기책',
                  activities: '모험',
                  reports: '리포트',
                  sharedItems: '공유',
                  notifications: '알림',
                  exports: '내보내기',
                } as Record<string, string>
              )[k] ?? k}{' '}
              {v}개
            </p>
          ))}
        </section>
      ) : (
        <Wait error={overview.error} retry={overview.refetch} />
      )}
      <section className="panel">
        <h2>기록 내려받기</h2>
        <button
          className="btn light"
          disabled={action.busy}
          onClick={() =>
            void action.run(async () => {
              const r = await backend.request<Model<'JobResponse'>>(
                'data-exports',
                json({ format: 'JSON' }),
              );
              setExport(r.job.id);
            })
          }
        >
          내보내기 준비
        </button>
        {exportId &&
          (exported.data ? (
            <>
              <p>{exported.data.job.status}</p>
              {exported.data.download && (
                <button
                  className="btn light"
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      const d = exported.data!.download!;
                      const payload = await backend.request<unknown>(
                        `data-exports/${exportId}/download?token=${encodeURIComponent(d.token)}`,
                      );
                      const url = URL.createObjectURL(
                        new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
                      );
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'thinkforest-records.json';
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                      setExport('');
                    })
                  }
                >
                  JSON 파일 내려받기
                </button>
              )}
            </>
          ) : (
            <Wait error={exported.error} retry={exported.refetch} />
          ))}
      </section>
      <section className="panel">
        <h2>아이 데이터 삭제 예약</h2>
        <p>유예 기간 동안 취소할 수 있어요. 최근에 로그인한 계정으로 진행해 주세요.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (
              f.get('confirmation') !== 'DELETE' ||
              !(await confirmAction('선택한 데이터를 삭제 예약할까요?'))
            )
              return;
            void action.run(async () => {
              const r = await backend.request<Model<'DeletionRequestResponse'>>(
                'data-deletion-requests',
                json({ scope: f.get('scope'), confirmation: 'DELETE' }),
              );
              setDeletion(r.request.id);
            });
          }}
        >
          <label>
            삭제 범위
            <select name="scope">
              <option value="CONVERSATIONS">대화</option>
              <option value="STORIES">이야기</option>
              <option value="WORDBOOK">단어장</option>
              <option value="EXPORTS">내보낸 파일</option>
              <option value="ALL_CHILD_DATA">아이 데이터 전체</option>
            </select>
          </label>
          <label>
            DELETE 입력
            <input name="confirmation" required pattern="DELETE" />
          </label>
          <button className="btn light" disabled={action.busy || !!pending}>
            삭제 예약
          </button>
        </form>
        {pending &&
          (deletion.data ? (
            <>
              <p>
                {deletion.data.request.status} · 처리 예정{' '}
                {new Date(deletion.data.request.effectiveAt).toLocaleString('ko-KR')}
              </p>
              {deletion.data.request.cancellable && (
                <button
                  className="btn light"
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      await backend.request(`data-deletion-requests/${pending}/cancel`, json({}));
                      setDeletion('');
                    })
                  }
                >
                  삭제 예약 취소
                </button>
              )}
            </>
          ) : (
            <Wait error={deletion.error} retry={deletion.refetch} />
          ))}
      </section>
      <section className="panel">
        <h2>계정 삭제</h2>
        <button
          className="btn light"
          disabled={action.busy || !!accountId}
          onClick={async () => {
            if ((await promptText('계정을 삭제 예약하려면 DELETE를 입력해 주세요.')) === 'DELETE')
              void action.run(async () => {
                const r = await backend.request<Model<'DeletionRequestResponse'>>(
                  'account-deletion-requests',
                  json({ confirmation: 'DELETE' }),
                );
                setAccount(r.request.id);
                localStorage.setItem(`jjcp-account-delete-${backend.me?.user.id}`, r.request.id);
              });
          }}
        >
          계정 삭제 예약
        </button>
        {account.data && (
          <>
            <p>
              {account.data.request.status} ·{' '}
              {new Date(account.data.request.effectiveAt).toLocaleString('ko-KR')}
            </p>
            {account.data.request.cancellable && (
              <button
                className="btn light"
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await backend.request(
                      `account-deletion-requests/${accountId}/cancel`,
                      json({}),
                    );
                    localStorage.removeItem(`jjcp-account-delete-${backend.me?.user.id}`);
                    setAccount('');
                  })
                }
              >
                계정 삭제 취소
              </button>
            )}
          </>
        )}
        {account.error && <Wait error={account.error} retry={account.refetch} />}
      </section>
    </>
  );
}
export function ServerTech() {
  const q = useServerQuery<{
    service: string;
    storage: string;
    aiAvailable: boolean;
    speechAvailable: boolean;
    streamingAvailable: boolean;
  }>('service-info');
  return (
    <section className="panel">
      <PageHeading
        eyebrow="ABOUT TIKI"
        title="생각친구 티키를 소개해요"
        description="티키가 함께하는 방법과 기록을 지키는 약속이에요."
      />
      {q.data ? (
        <>
          <p>{q.data.service}</p>
          <p>기록은 {q.data.storage}에 저장돼요.</p>
          <p>AI 응답: {q.data.aiAvailable ? '사용 가능' : '서버의 준비된 안내 사용'}</p>
          <p>
            음성 입력:{' '}
            {q.data.speechAvailable ? '사용 가능 · 보호자 동의 필요' : '현재 사용할 수 없음'}
          </p>
          <p>실시간 음성: {q.data.streamingAvailable ? '사용 가능' : '현재 사용할 수 없음'}</p>
          <Link to="/profile">동의와 설정 확인</Link>
        </>
      ) : (
        <Wait error={q.error} retry={q.refetch} />
      )}
    </section>
  );
}
