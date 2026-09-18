import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { INTERESTS, PLACES } from '../data/catalog';
import { useVillage } from '../providers/VillageProvider';
import { Icon } from '../components/Icon';
import { Button, Notice, PageHeading } from '../components/ui';
import {
  ActionResult,
  errorDetails,
  errorText,
  GuardianAiStatus,
  GuardianNav,
  GuardianProfilePicker,
  GuardianProvider,
  useAction,
  useGuardian,
} from '../components/GuardianParts';
import { gateSize, localDate } from '../lib/learning';
import { useAuth } from '../providers/AuthProvider';
import {
  AI_CONSENT_DOCUMENT_ID,
  aiModeLabel,
  VOICE_CONSENT_DOCUMENT_ID,
  voiceModeLabel,
  cancelAccountDeletionRequest,
  cancelDataDeletionRequest,
  createAccountDeletionRequest,
  createDataDeletionRequest,
  createDataExport,
  currentConsents,
  getDataExport,
  getDataOverview,
  getProfile,
  jobStatusLabel,
  listSafetyEvents,
  retentionNoticeLines,
  updateProfile,
  updateProfileSettings,
} from '../api/v1/endpoints';
import type {
  DataOverview,
  DeletionRequest,
  DeletionScope,
  ExportDetail,
  ExportInclude,
  ProfileOut,
  RetentionNotice,
} from '../api/v1/types';
import type { VillageData } from '../types/village';

export function ProtectedParentScreen() {
  return (
    <GuardianProvider>
      <Outlet />
    </GuardianProvider>
  );
}

// ---------- 프로필과 설정 (명세 17절) ----------

const GOALS = [
  '내 생각의 이유를 말하는 힘',
  '새로운 것을 관찰하는 힘',
  '친구의 마음을 이해하는 힘',
  '궁금한 것을 질문하는 힘',
];

/** 서버 프로필을 고치는 칸. If-Match 대신 본문 version 으로 충돌을 막고, 409 는 부드럽게 알린다. */
function ServerProfilePanel() {
  const { client } = useAuth();
  const { profileId, reload } = useGuardian();
  const { busy, message, failed, runQuiet } = useAction();
  const [profile, setProfile] = useState<ProfileOut | null>(null);
  const [draft, setDraft] = useState({
    nickname: '',
    gradeOrAgeBand: '',
    interests: [] as string[],
    growthGoal: GOALS[0] as string,
  });
  const [conflict, setConflict] = useState('');
  const [loadError, setLoadError] = useState('');

  const apply = useCallback((found: ProfileOut) => {
    setProfile(found);
    setDraft({
      nickname: found.nickname ?? '',
      gradeOrAgeBand: found.gradeOrAgeBand ?? '',
      interests: found.interests ?? [],
      growthGoal: found.growthGoal || (GOALS[0] as string),
    });
  }, []);

  useEffect(() => {
    if (!profileId) return;
    const abort = new AbortController();
    getProfile(client, profileId, abort.signal)
      .then((found) => {
        if (!abort.signal.aborted) {
          apply(found);
          setLoadError('');
        }
      })
      .catch((reason) => {
        if (!abort.signal.aborted) setLoadError(errorText(reason, '프로필을 불러오지 못했어요.'));
      });
    return () => abort.abort();
  }, [apply, client, profileId]);

  if (loadError)
    return (
      <section className="panel">
        <div role="alert">
          <Notice variant="error">{loadError}</Notice>
        </div>
      </section>
    );
  if (!profile || !profileId) return null;

  const save = () =>
    runQuiet(async () => {
      setConflict('');
      if (!draft.nickname.trim()) throw new Error('아이 별명을 적어 주세요.');
      try {
        apply(
          await updateProfile(
            client,
            profileId,
            {
              nickname: draft.nickname.trim(),
              gradeOrAgeBand: draft.gradeOrAgeBand.trim() || null,
              interests: draft.interests,
              growthGoal: draft.growthGoal,
            },
            profile.version,
          ),
        );
        reload();
        return '아이 프로필을 서버에 저장했어요.';
      } catch (reason) {
        const current = errorDetails(reason).currentVersion;
        if (typeof current === 'number') {
          const fresh = await getProfile(client, profileId);
          apply(fresh);
          setConflict(
            `다른 곳에서 먼저 프로필을 바꿨어요(${current}번째 판). 방금 불러온 내용으로 화면을 맞췄으니 확인하고 다시 저장해 주세요.`,
          );
        }
        throw reason;
      }
    });

  const toggleInterest = (interest: string) =>
    setDraft((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest],
    }));

  return (
    <section className="panel">
      <div className="profile-identity">
        <span className="avatar large">{draft.nickname.slice(0, 1) || '새싹'}</span>
        <div>
          <h2>{draft.nickname || '우리 아이'}의 작은 마을</h2>
          <p className="muted">
            서버에 저장된 프로필 · {profile.version}번째 판 ·{' '}
            {new Date(profile.updatedAt).toLocaleDateString('ko-KR')} 수정
          </p>
        </div>
      </div>
      {conflict && (
        <div role="alert">
          <Notice variant="error">{conflict}</Notice>
        </div>
      )}
      <div className="field">
        <label htmlFor="profile-name">아이 별명</label>
        <input
          id="profile-name"
          value={draft.nickname}
          maxLength={20}
          onChange={(event) => setDraft((c) => ({ ...c, nickname: event.target.value }))}
        />
      </div>
      <div className="field">
        <label htmlFor="profile-grade">학년 또는 나이대</label>
        <input
          id="profile-grade"
          value={draft.gradeOrAgeBand}
          placeholder="예: 초등학교 2학년"
          onChange={(event) => setDraft((c) => ({ ...c, gradeOrAgeBand: event.target.value }))}
        />
        <small>학교 이름은 저장하지 않아요. 종류와 학년만 적어요.</small>
      </div>
      <fieldset className="interest-fieldset">
        <legend>좋아하는 것</legend>
        <div className="filters">
          {INTERESTS.map((interest) => (
            <button
              type="button"
              className={`chip ${draft.interests.includes(interest) ? 'active' : ''}`}
              key={interest}
              aria-pressed={draft.interests.includes(interest)}
              onClick={() => toggleInterest(interest)}
            >
              {interest}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="profile-goal">함께 키우고 싶은 힘</label>
        <select
          id="profile-goal"
          value={draft.growthGoal}
          onChange={(event) => setDraft((c) => ({ ...c, growthGoal: event.target.value }))}
        >
          {[...new Set([draft.growthGoal, ...GOALS])].map((goal) => (
            <option key={goal}>{goal}</option>
          ))}
        </select>
      </div>
      <Button disabled={busy} onClick={save}>
        {busy ? '저장하는 중…' : '아이 프로필 저장'}
      </Button>
      <ActionResult message={message} failed={failed} />
    </section>
  );
}

/** 서버 설정. 로그인하지 않았으면 이 기기 설정만 바꾼다. */
function SettingsPanel() {
  const { client } = useAuth();
  const { data, update, toast } = useVillage();
  const { signedIn, profileId, settings, setSettings } = useGuardian();
  const { busy, message, failed, runQuiet } = useAction();
  const [notice, setNotice] = useState<RetentionNotice | null>(null);

  const local = (patch: Partial<VillageData['settings']>) => {
    if (update((previous) => ({ ...previous, settings: { ...previous.settings, ...patch } })))
      toast('이 기기 설정을 저장했어요.');
  };

  const server = (patch: Parameters<typeof updateProfileSettings>[2]) =>
    runQuiet(async () => {
      if (!profileId || !settings) return;
      const result = await updateProfileSettings(client, profileId, patch, settings.version);
      setSettings(result.settings);
      setNotice(result.retentionNotice ?? null);
      return '설정을 저장했어요.';
    });

  const tts = settings ? settings.ttsEnabled : data.settings.tts;
  const preview = settings ? settings.guardianPreviewEnabled : data.settings.parentPreview;
  const retention = settings ? settings.retentionDays : data.settings.retention;

  return (
    <section className="panel">
      <div className="row between wrap">
        <h3>읽어 주기와 보관기간</h3>
        <span className={`tag ${signedIn && settings ? 'teal' : 'gold'}`}>
          {signedIn && settings ? '서버에 저장돼요' : '이 기기에만 저장돼요'}
        </span>
      </div>
      <label className="setting-row">
        <span>
          <strong>이야기 읽어 주기</strong>
          <p>기기에 설치된 한국어 음성을 사용해요.</p>
        </span>
        <input
          type="checkbox"
          checked={tts}
          disabled={busy}
          onChange={(event) =>
            settings
              ? server({ ttsEnabled: event.target.checked })
              : local({ tts: event.target.checked })
          }
        />
      </label>
      <label className="setting-row">
        <span>
          <strong>보호자 미리보기 펼치기</strong>
          <p>아이에게 보여 주기 전에 전체 내용을 펼쳐 봐요. 확인 단계는 항상 유지돼요.</p>
        </span>
        <input
          type="checkbox"
          checked={preview}
          disabled={busy}
          onChange={(event) =>
            settings
              ? server({ guardianPreviewEnabled: event.target.checked })
              : local({ parentPreview: event.target.checked })
          }
        />
      </label>
      <div className="setting-row">
        <div>
          <strong>화면 테마</strong>
          <p>기기 설정을 따르거나 밝게·어둡게 고정해요.</p>
        </div>
        <select
          aria-label="화면 테마"
          value={settings ? settings.theme : data.settings.theme.toUpperCase()}
          disabled={busy || !settings}
          onChange={(event) => server({ theme: event.target.value as 'AUTO' | 'LIGHT' | 'DARK' })}
        >
          <option value="AUTO">기기 설정 따르기</option>
          <option value="LIGHT">밝게</option>
          <option value="DARK">어둡게</option>
        </select>
      </div>
      <div className="setting-row">
        <div>
          <strong>기록 보관기간</strong>
          <p>기간이 지난 대화 기록은 정리해요. 이야기 책장은 아이가 지울 때까지 남아요.</p>
        </div>
        <select
          aria-label="기록 보관기간"
          value={retention}
          disabled={busy}
          onChange={(event) => {
            const days = Number(event.target.value) as 30 | 90 | 180;
            if (settings) server({ retentionDays: days });
            else local({ retention: days });
          }}
        >
          {[30, 90, 180].map((days) => (
            <option key={days} value={days}>
              {days}일
            </option>
          ))}
        </select>
      </div>
      <ActionResult message={message} failed={failed} />
      {notice && (
        <div role="status">
          <Notice variant={notice.deletesNow ? 'error' : 'neutral'}>
            {retentionNoticeLines(notice).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </Notice>
        </div>
      )}
      {!signedIn && (
        <Notice>
          로그인하지 않아서 이 기기에만 저장했어요. 로그인하면 같은 설정이 계정에 저장돼 다른
          기기에서도 같게 보여요.
        </Notice>
      )}
      <div className="actions split">
        <Link className="btn light" to="/first-talk">
          티키와 다시 인사하기
        </Link>
        <Link className="btn ghost" to="/data">
          기록 열람·삭제
          <Icon name="arrow" />
        </Link>
      </div>
    </section>
  );
}

export function ProfileScreen() {
  const { data } = useVillage();
  const { signedIn, profile, consents, documents } = useGuardian();
  const navigate = useNavigate();
  const current = currentConsents(consents);
  return (
    <>
      <PageHeading
        eyebrow="MY LITTLE GARDENER"
        title="아이의 속도로, 아이답게."
        description="아이의 관심사와 배움의 속도를 보호자와 함께 정해요. 로그인하면 계정에 저장돼요."
      >
        <Button className="light small" onClick={() => navigate('/')}>
          <Icon name="back" />
          아이 화면으로 돌아가기
        </Button>
      </PageHeading>
      <GuardianNav />
      <GuardianProfilePicker />
      <GuardianAiStatus />
      <div className="learning-grid">
        {signedIn ? (
          <ServerProfilePanel />
        ) : (
          <section className="panel">
            <h2>{data.profile.name || '우리 아이'}의 작은 마을</h2>
            <p className="muted space-top">
              지금은 이 기기에 저장된 체험 프로필이에요. 로그인하면 서버에 저장된 아이 프로필을 고칠
              수 있어요.
            </p>
            <Link className="btn" to="/login?returnTo=%2Fprofile">
              로그인하기
            </Link>
          </section>
        )}
        <SettingsPanel />
      </div>
      <section className="panel space-top">
        <h3>동의와 계정</h3>
        <dl className="definition">
          <dt>로그인</dt>
          <dd>{signedIn ? '로그인됨 · 카카오 또는 개발용 계정' : '로그인 안 함'}</dd>
          <dt>아이 프로필</dt>
          <dd>
            {profile
              ? `${profile.nickname} · ${profile.role === 'OWNER' ? '내 아이' : '연결된 아이'}`
              : '없음'}
          </dd>
          <dt>AI 대화 동의</dt>
          <dd>
            {current.has(AI_CONSENT_DOCUMENT_ID)
              ? `동의함 · ${current.get(AI_CONSENT_DOCUMENT_ID)?.documentVersion} 판`
              : '동의 안 함 · 준비된 대사로 대화해요'}
          </dd>
          <dt>받은 동의</dt>
          <dd>
            {current.size === 0
              ? '없음'
              : [...current.keys()]
                  .map((id) => documents.find((doc) => doc.id === id)?.title ?? id)
                  .join(', ')}
          </dd>
          <dt>체험 안내 확인 (이 기기)</dt>
          <dd>{data.consent.noticeAt?.slice(0, 10) ?? '—'}</dd>
        </dl>
        <div className="actions split">
          <Link className="btn light small" to="/guardian/consent">
            동의 살펴보기
          </Link>
          <Link className="btn ghost small" to="/guardian/links">
            보호자 연결 관리
          </Link>
        </div>
      </section>
    </>
  );
}

// ---------- 기술·안전 안내 ----------

export function TechScreen() {
  const { data } = useVillage();
  const { client } = useAuth();
  const { signedIn, mode, voice, consents, documents, settings, profile } = useGuardian();
  const [safetyCount, setSafetyCount] = useState<number | null>(null);
  const current = currentConsents(consents);
  const aiConsent = current.get(AI_CONSENT_DOCUMENT_ID);

  useEffect(() => {
    if (!signedIn) return;
    const abort = new AbortController();
    listSafetyEvents(client, { limit: 50 }, abort.signal)
      .then((page) => {
        if (!abort.signal.aborted) setSafetyCount(page.items.length);
      })
      .catch(() => undefined);
    return () => abort.abort();
  }, [client, signedIn]);

  const stats: [string, string, string][] = [
    [
      'AI 연결 상태',
      signedIn ? aiModeLabel(mode) : '로그인 안 함',
      signedIn
        ? aiConsent
          ? `ai_conversation ${aiConsent.documentVersion} 판 동의됨`
          : '보호자 동의가 없어 준비된 대사로만 답해요'
        : '로그인하면 실제 상태를 볼 수 있어요',
    ],
    [
      '대화 저장 위치',
      signedIn ? '서버 계정' : '이 기기',
      signedIn
        ? `보관기간 ${settings?.retentionDays ?? '—'}일`
        : `보관기간 ${data.settings.retention}일`,
    ],
    [
      '계정 인증',
      signedIn ? '연결됨' : '미연결',
      signedIn ? `${profile?.nickname ?? '아이'} 프로필과 연결` : '카카오 또는 개발용 로그인 필요',
    ],
    [
      '말로 답하기',
      signedIn ? voiceModeLabel(voice) : '로그인 안 함',
      signedIn
        ? current.has(VOICE_CONSENT_DOCUMENT_ID)
          ? 'voice_retention 동의됨 · 음성 원본은 저장하지 않아요'
          : '보호자 동의가 없어 글로만 답해요'
        : '로그인하면 실제 상태를 볼 수 있어요',
    ],
  ];

  return (
    <>
      <PageHeading
        eyebrow="TRUST, BY DESIGN"
        title="어떻게 작동하는지, 투명하게."
        description="지금 이 계정에서 실제로 무엇이 켜져 있는지 그대로 보여 드려요."
      />
      <GuardianNav />
      <GuardianAiStatus />
      <div className="cards stats">
        {stats.map(([label, value, help]) => (
          <section className="panel" key={label}>
            <span className="stat-label">{label}</span>
            <div className="metric status-metric">{value}</div>
            <small className="muted">{help}</small>
          </section>
        ))}
      </div>
      <div className="bottom-grid">
        <section className="panel">
          <h3>아이의 말이 어디까지 가나요</h3>
          <ol className="journey-list">
            <li>
              <span>01</span>
              <div>
                <strong>아이가 씁니다</strong>
                <small>이름·학교 이름 같은 개인정보는 저장 전에 가려요.</small>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>서버가 안전 검사</strong>
                <small>다루지 않는 주제는 여기서 멈추고 다른 이야기를 권해요.</small>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>{mode === 'ai' ? 'AI가 답을 만듭니다' : '준비된 대사로 답합니다'}</strong>
                <small>
                  {mode === 'ai'
                    ? 'ai_conversation 동의가 있어 AI 처리 사업자에게 문장을 보내요.'
                    : '동의가 없으면 외부로 보내지 않고 준비된 질문으로 이어 가요.'}
                </small>
              </div>
            </li>
          </ol>
          <dl className="definition">
            <dt>동의 문서</dt>
            <dd>
              {documents.length === 0
                ? '—'
                : documents.map((doc) => `${doc.id} ${doc.version}`).join(' · ')}
            </dd>
            <dt>현재 문턱 (체험 활동)</dt>
            <dd>{gateSize(data)}자 · 공백 제외</dd>
            <dt>예시 목데이터</dt>
            <dd>{data.sessions.filter((s) => s.source === 'mock').length}개 · 자동 조절 제외</dd>
          </dl>
          <p className="muted space-top">
            {mode === 'ai'
              ? 'AI가 만든 문장과 아이가 쓴 문장은 기록에서 구분해 저장해요. 콘텐츠 사람 검수는 아직 끝나지 않았어요.'
              : '지금은 미리 준비한 규칙 기반 대사만 써요. 외부 AI 호출이 없어요. 콘텐츠 사람 검수도 아직 끝나지 않았어요.'}
          </p>
        </section>
        <section className="panel">
          <h3>저장과 개인정보</h3>
          <dl className="definition">
            <dt>저장 위치</dt>
            <dd>
              {signedIn ? '서버 계정 · 이 기기에는 체험 설정만' : '현재 기기 · 현재 브라우저'}
            </dd>
            <dt>저장 항목</dt>
            <dd>프로필, 설정, 동의 기록, 대화 메시지, 이야기, 단어, 안전 이벤트</dd>
            <dt>보관기간</dt>
            <dd>
              {signedIn ? (settings?.retentionDays ?? '—') : data.settings.retention}일 · 지난 대화
              기록부터 정리
            </dd>
            <dt>외부 전송</dt>
            <dd>
              {mode === 'ai'
                ? 'AI 처리 사업자에게 아이가 쓴 문장을 보냄 (이름·학교·음성 원본 제외)'
                : '외부 AI로 보내지 않음'}
            </dd>
            <dt>음성 원본</dt>
            <dd>저장하지 않아요. 글로 바꾼 뒤 바로 버려요.</dd>
            <dt>보호자 확인</dt>
            <dd>{signedIn ? '계정 권한으로 분리됨' : '로그인 전에는 잠금 없음 · 체험용'}</dd>
          </dl>
          <div className="actions split">
            <Link className="btn light" to="/data">
              내 기록 열람·내려받기
              <Icon name="download" />
            </Link>
            <Link className="btn ghost" to="/guardian/consent">
              동의 바꾸기
            </Link>
          </div>
          <Notice>
            약관·동의 문서는 법률 검토 전 초안이에요. 콘텐츠 사람 검수도 아직 끝나지 않았어요.
          </Notice>
        </section>
      </div>
      <section className="panel space-top">
        <div className="row between">
          <h3>안전 기록</h3>
          <small className="muted">
            {signedIn
              ? `서버 기록 ${safetyCount ?? '…'}건`
              : `이 기기 기록 ${data.safety.length}건`}
          </small>
        </div>
        <p className="muted space-top">
          어떤 종류였는지와 어떻게 도우면 좋을지만 보여 드려요. 아이가 쓴 문장 원문은 담지 않아요.
        </p>
        <Link className="btn light small" to="/guardian/safety">
          안전 기록 보기
          <Icon name="arrow" />
        </Link>
      </section>
    </>
  );
}

// ---------- 기록 관리 (명세 22절) ----------

const EXPORT_PARTS: [ExportInclude, string][] = [
  ['PROFILE', '프로필'],
  ['CONVERSATIONS', '대화 기록'],
  ['STORIES', '이야기'],
  ['WORDBOOK', '단어 보관함'],
  ['REPORTS', '리포트'],
];

const DELETE_SCOPES: [DeletionScope, string][] = [
  ['ALL_CHILD_DATA', '이 아이의 모든 기록'],
  ['CONVERSATIONS', '대화 기록만'],
  ['STORIES', '이야기만'],
  ['WORDBOOK', '단어 보관함만'],
  ['EXPORTS', '내보내기 파일만'],
];

function DataExportPanel() {
  const { client } = useAuth();
  const { profileId } = useGuardian();
  const { busy, message, failed, runQuiet } = useAction();
  const [parts, setParts] = useState<ExportInclude[]>([
    'PROFILE',
    'CONVERSATIONS',
    'STORIES',
    'WORDBOOK',
    'REPORTS',
  ]);
  const [detail, setDetail] = useState<ExportDetail | null>(null);

  const start = () =>
    runQuiet(async () => {
      const job = await createDataExport(client, {
        profileId: profileId ?? undefined,
        format: 'JSON',
        include: parts,
      });
      setDetail(await getDataExport(client, job.id));
      return '내보내기를 만들었어요. 아래 링크로 내려받아 주세요.';
    });

  const refresh = () =>
    runQuiet(async () => {
      if (!detail) return;
      setDetail(await getDataExport(client, detail.job.id));
      return '상태를 다시 확인했어요.';
    });

  return (
    <section className="panel">
      <h3>서버 기록 내보내기</h3>
      <p className="muted space-top">
        계정에 저장된 기록을 JSON 한 파일로 만들어요. 내려받기 주소는 짧게만 살아 있어요.
      </p>
      <fieldset className="interest-fieldset">
        <legend>담을 것</legend>
        <div className="filters">
          {EXPORT_PARTS.map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={`chip ${parts.includes(value) ? 'active' : ''}`}
              aria-pressed={parts.includes(value)}
              onClick={() =>
                setParts((current) =>
                  current.includes(value)
                    ? current.filter((item) => item !== value)
                    : [...current, value],
                )
              }
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <Button disabled={busy || parts.length === 0} onClick={start}>
        <Icon name="download" />
        {busy ? '만드는 중…' : '내보내기 만들기'}
      </Button>
      <ActionResult message={message} failed={failed} />
      {detail && (
        <dl className="definition">
          <dt>상태</dt>
          <dd>{jobStatusLabel(detail.job.status)}</dd>
          <dt>크기</dt>
          <dd>{Math.max(1, Math.round(detail.byteSize / 1024))}KB</dd>
          <dt>담긴 것</dt>
          <dd>
            {detail.include
              .map((part) => EXPORT_PARTS.find(([value]) => value === part)?.[1] ?? part)
              .join(', ')}
          </dd>
          <dt>내려받기</dt>
          <dd>
            {detail.download ? (
              <>
                <a className="btn small" href={detail.download.url} download>
                  파일 내려받기
                </a>{' '}
                <small className="muted">
                  {new Date(detail.download.expiresAt).toLocaleTimeString('ko-KR')}까지
                </small>
              </>
            ) : (
              <Button className="light small" onClick={refresh}>
                다시 확인하기
              </Button>
            )}
          </dd>
        </dl>
      )}
    </section>
  );
}

function DeletionPanel() {
  const { client } = useAuth();
  const { profileId, reload } = useGuardian();
  const { busy, message, failed, runQuiet } = useAction();
  const [scope, setScope] = useState<DeletionScope>('CONVERSATIONS');
  const [word, setWord] = useState('');
  const [request, setRequest] = useState<DeletionRequest | null>(null);
  const [account, setAccount] = useState<DeletionRequest | null>(null);
  const [armedAccount, setArmedAccount] = useState(false);

  const askDeletion = () =>
    runQuiet(async () => {
      setRequest(
        await createDataDeletionRequest(client, {
          profileId: profileId ?? undefined,
          scope,
          confirmation: 'DELETE',
          reason: 'USER_REQUEST',
        }),
      );
      setWord('');
      reload();
      return '삭제를 요청했어요. 유예기간 안에는 되돌릴 수 있어요.';
    });

  const askAccount = () =>
    runQuiet(async () => {
      setAccount(
        await createAccountDeletionRequest(client, {
          confirmation: 'DELETE',
          reason: 'USER_REQUEST',
        }),
      );
      setArmedAccount(false);
      return '계정 탈퇴를 요청했어요. 유예기간 안에는 되돌릴 수 있어요.';
    });

  const requestRow = (item: DeletionRequest, cancel: () => void) => (
    <div className="notice">
      <div>
        <strong>
          {item.kind === 'ACCOUNT' ? '계정 탈퇴' : '기록 삭제'} 요청 · {jobStatusLabel(item.status)}
        </strong>
        <dl className="definition">
          <dt>범위</dt>
          <dd>{DELETE_SCOPES.find(([value]) => value === item.scope)?.[1] ?? item.scope}</dd>
          <dt>화면에서 숨긴 시각</dt>
          <dd>{item.hiddenAt ? new Date(item.hiddenAt).toLocaleString('ko-KR') : '—'}</dd>
          <dt>실제로 지워지는 날</dt>
          <dd>{new Date(item.effectiveAt).toLocaleDateString('ko-KR')}</dd>
        </dl>
        {item.cancellable && (
          <Button className="light small" disabled={busy} onClick={cancel}>
            삭제 요청 취소하기
          </Button>
        )}
        {item.status === 'CANCELLED' && <p>취소했어요. 기록은 그대로 남아 있어요.</p>}
      </div>
    </div>
  );

  return (
    <section className="panel">
      <h3>서버 기록 삭제 요청</h3>
      <p className="muted space-top">
        요청하면 바로 화면에서 숨기고, 유예기간이 지나면 백업까지 지워요. 공개된 이야기, 검색,
        리포트도 함께 지워요. 유예기간 안에는 취소할 수 있어요.
      </p>
      <div className="field">
        <label htmlFor="delete-scope">지울 범위</label>
        <select
          id="delete-scope"
          value={scope}
          onChange={(event) => setScope(event.target.value as DeletionScope)}
        >
          {DELETE_SCOPES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="delete-confirm">삭제하려면 “삭제”를 입력해 주세요.</label>
        <input
          id="delete-confirm"
          value={word}
          autoComplete="off"
          onChange={(event) => setWord(event.target.value)}
        />
      </div>
      <Button className="danger" disabled={busy || word.trim() !== '삭제'} onClick={askDeletion}>
        삭제 요청하기
      </Button>
      <ActionResult message={message} failed={failed} />
      {request &&
        requestRow(request, () =>
          runQuiet(async () => {
            setRequest(await cancelDataDeletionRequest(client, request.id));
            reload();
            return '삭제 요청을 취소했어요.';
          }),
        )}

      <h3 className="section-title">계정 탈퇴</h3>
      <p className="muted space-top">
        로그인 계정을 지우고 모든 연결을 끊어요. 아이 프로필 기록 삭제와는 다른 동작이에요. 다른
        보호자가 연결돼 있으면 서버가 먼저 확인해요.
      </p>
      {armedAccount ? (
        <div className="actions split">
          <Button className="light" onClick={() => setArmedAccount(false)}>
            그만두기
          </Button>
          <Button className="danger" disabled={busy} onClick={askAccount}>
            계정 탈퇴 요청
          </Button>
        </div>
      ) : (
        <Button className="ghost" onClick={() => setArmedAccount(true)}>
          계정 탈퇴 살펴보기
        </Button>
      )}
      {account &&
        requestRow(account, () =>
          runQuiet(async () => {
            setAccount(await cancelAccountDeletionRequest(client, account.id));
            return '계정 탈퇴 요청을 취소했어요.';
          }),
        )}
    </section>
  );
}

const COUNT_LABELS: Record<string, string> = {
  profiles: '아이 프로필',
  conversations: '대화',
  messages: '주고받은 말',
  stories: '이야기',
  topics: '직접 만든 주제',
  words: '담아 둔 단어',
  sharedItems: '공유한 이야기',
  notifications: '알림',
  exports: '내보낸 파일',
};

const RETENTION_LABELS: Record<string, string> = {
  conversationDays: '대화 기록 보관',
  exportDownloadMinutes: '내려받기 주소 유효',
  deletionGraceDays: '기록 삭제 유예',
  accountDeletionGraceDays: '계정 탈퇴 유예',
};

export function DataScreen() {
  const { data, reset, restoreExamples, update, toast } = useVillage();
  const { client } = useAuth();
  const { signedIn } = useGuardian();
  const navigate = useNavigate();
  const [armed, setArmed] = useState(false);
  const [word, setWord] = useState('');
  const [overview, setOverview] = useState<DataOverview | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    const abort = new AbortController();
    getDataOverview(client, abort.signal)
      .then((found) => {
        if (!abort.signal.aborted) setOverview(found);
      })
      .catch(() => undefined);
    return () => abort.abort();
  }, [client, signedIn]);

  const downloadLocal = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `티키_이_기기_설정_${localDate()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('이 기기에 저장된 체험 데이터를 내려받았어요.');
  };

  return (
    <>
      <Link to="/profile" className="back">
        <Icon name="back" />
        아이 프로필과 설정
      </Link>
      <PageHeading
        eyebrow="YOUR DATA, YOUR CHOICE"
        title="우리 아이의 기록, 직접 관리해요."
        description="계정에 저장된 기록을 열람하고 내보내거나 삭제할 수 있어요. 이 기기에만 있는 체험 데이터는 따로 지워요."
      />
      <GuardianNav />

      {signedIn ? (
        <>
          <section className="panel space-top">
            <h3>계정에 저장된 기록</h3>
            {overview ? (
              <>
                <dl className="definition">
                  {Object.entries(overview.counts).map(([key, value]) => (
                    <Row key={key} label={COUNT_LABELS[key] ?? key} value={`${value}개`} />
                  ))}
                </dl>
                <h4 className="section-title">보관과 유예</h4>
                <dl className="definition">
                  {Object.entries(overview.retention).map(([key, value]) => (
                    <Row
                      key={key}
                      label={RETENTION_LABELS[key] ?? key}
                      value={key.endsWith('Minutes') ? `${value}분` : `${value}일`}
                    />
                  ))}
                </dl>
                {overview.pendingDeletionRequestId && (
                  <Notice variant="error">
                    진행 중인 삭제 요청이 있어요 ({overview.pendingDeletionRequestId}). 유예기간
                    안에는 취소할 수 있어요.
                  </Notice>
                )}
                <small className="muted">
                  {new Date(overview.generatedAt).toLocaleString('ko-KR')} 기준
                </small>
              </>
            ) : (
              <p className="muted space-top">불러오는 중이에요…</p>
            )}
          </section>
          <div className="learning-grid">
            <DataExportPanel />
            <DeletionPanel />
          </div>
        </>
      ) : (
        <section className="panel space-top">
          <h3>로그인하면 계정 기록을 관리할 수 있어요</h3>
          <p className="muted space-top">
            내보내기와 삭제 요청은 계정에 저장된 기록에 대해서만 할 수 있어요. 아래는 이 기기에만
            있는 체험 데이터예요.
          </p>
          <Link className="btn" to="/login?returnTo=%2Fdata">
            로그인하기
          </Link>
        </section>
      )}

      <div className="learning-grid space-top">
        <section className="panel">
          <h3>이 기기에만 있는 체험 데이터</h3>
          <p className="muted space-top">
            서버 계정과 별개로, 이 브라우저에 저장된 체험 설정과 예시 기록이에요.
          </p>
          <dl className="definition">
            <Row label="아이 별명 (기기)" value={data.profile.name || '—'} />
            <Row
              label="직접 완료 기록"
              value={`${data.sessions.filter((s) => s.source === 'local').length}개`}
            />
            <Row
              label="예시 목데이터"
              value={`${data.sessions.filter((s) => s.source === 'mock').length}개`}
            />
            <Row
              label="진행 중 모험"
              value={
                data.resume ? `${PLACES[data.resume.track].name} · ${data.resume.title}` : '없음'
              }
            />
            <Row label="기기 보관기간" value={`${data.settings.retention}일`} />
          </dl>
          <div className="actions split">
            <Button className="light" onClick={downloadLocal}>
              <Icon name="download" />
              기기 데이터 내려받기
            </Button>
            <Button className="light small" onClick={restoreExamples}>
              예시 기록 다시 채우기
            </Button>
            <Button
              className="ghost small"
              disabled={!data.sessions.some((s) => s.source === 'mock')}
              onClick={() => {
                update((previous) => ({
                  ...previous,
                  sessions: previous.sessions.filter((s) => s.source === 'local'),
                  summary: null,
                }));
                toast('예시 기록을 숨겼어요. 다시 채울 수 있어요.');
              }}
            >
              예시 기록 숨기기
            </Button>
          </div>
          <details>
            <summary>이 기기에 저장된 전체 정보 열람하기</summary>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </details>
        </section>
        <section className="panel">
          <h3>이 기기 데이터만 지우기</h3>
          <Notice>
            <strong>계정 기록은 지워지지 않아요.</strong> 이 브라우저에 저장한 체험 설정, 예시 기록,
            진행 중인 문장만 지워요. 계정 기록은 위의 삭제 요청으로 지워요.
          </Notice>
          {armed ? (
            <>
              <div className="field">
                <label htmlFor="local-delete-confirm">지우려면 “삭제”를 입력해 주세요.</label>
                <input
                  id="local-delete-confirm"
                  value={word}
                  onChange={(event) => setWord(event.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="actions split">
                <Button
                  className="light"
                  onClick={() => {
                    setArmed(false);
                    setWord('');
                  }}
                >
                  취소
                </Button>
                <Button
                  className="danger"
                  disabled={word.trim() !== '삭제'}
                  onClick={() => {
                    if (word.trim() === '삭제' && reset()) navigate('/', { replace: true });
                  }}
                >
                  기기 데이터 지우기
                </Button>
              </div>
            </>
          ) : (
            <Button className="ghost" onClick={() => setArmed(true)}>
              기기 데이터 지우기
            </Button>
          )}
        </section>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
