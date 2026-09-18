// 보호자 화면이 함께 쓰는 상태와 조각들.
// 가장 중요한 것은 AI 동의 상태다. `ai_conversation` 동의가 없으면 아이 대화는 준비된 대사로만 간다.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { V1Error } from '../api/v1/client';
import {
  aiMode,
  aiModeLabel,
  voiceMode,
  getAccountMe,
  getProfileSettings,
  listConsents,
  listLegalDocuments,
  toLocalSettings,
} from '../api/v1/endpoints';
import type { AiMode, VoiceMode } from '../api/v1/endpoints';
import type {
  Consent,
  LegalDocument,
  MeProfileItem,
  SettingsOut,
  GuardianPermission,
} from '../api/v1/types';
import { useAuth } from '../providers/AuthProvider';
import { useVillage } from '../providers/VillageProvider';
import { Icon } from './Icon';
import { Notice } from './ui';

const SELECTED_PROFILE_KEY = 'jjcp.guardian.profileId';
const EMPTY_PROFILES: MeProfileItem[] = [];
const EMPTY_CONSENTS: Consent[] = [];

function readSelected(): string | null {
  try {
    return localStorage.getItem(SELECTED_PROFILE_KEY);
  } catch {
    return null;
  }
}
function writeSelected(value: string | null) {
  try {
    if (value) localStorage.setItem(SELECTED_PROFILE_KEY, value);
    else localStorage.removeItem(SELECTED_PROFILE_KEY);
  } catch {
    /* 저장소가 막혀 있어도 이번 세션 동안은 동작한다. */
  }
}

/** 화면에 보여 줄 오류 문장. 서버가 준 한국어 message 를 우선한다. */
export function errorText(reason: unknown, fallback = '요청을 처리하지 못했어요.'): string {
  if (reason instanceof V1Error) return reason.message || fallback;
  if (reason instanceof Error && reason.message) return reason.message;
  return fallback;
}

export function errorDetails(reason: unknown): Record<string, unknown> {
  return reason instanceof V1Error ? reason.details : {};
}

export function errorCode(reason: unknown): string {
  return reason instanceof V1Error ? reason.code : '';
}

interface GuardianContextValue {
  signedIn: boolean;
  loading: boolean;
  error: string;
  profiles: MeProfileItem[];
  profileId: string | null;
  profile: MeProfileItem | null;
  permissions: GuardianPermission[];
  selectProfile: (profileId: string) => void;
  consents: Consent[];
  documents: LegalDocument[];
  settings: SettingsOut | null;
  setSettings: (settings: SettingsOut) => void;
  mode: AiMode;
  voice: VoiceMode;
  reload: () => void;
}

const GuardianContext = createContext<GuardianContextValue | null>(null);

/**
 * 보호자 화면 묶음의 공통 상태. 로그인했으면 서버 값을, 아니면 이 기기 설정을 쓴다.
 * 서버 설정을 받으면 기기 설정에도 그대로 옮겨서 아이 화면이 같은 값을 쓰게 한다.
 */
export function GuardianProvider({ children }: PropsWithChildren) {
  const { status, client } = useAuth();
  const { update } = useVillage();
  const signedIn = status === 'signedIn';
  // 로그아웃하면 아래 값들을 비우는 대신 signedIn 으로 가려서 보여 준다(효과 안에서 setState 를 피한다).
  const [loadedProfiles, setProfiles] = useState<MeProfileItem[]>([]);
  const [selectedId, setProfileId] = useState<string | null>(readSelected);
  const [loadedConsents, setConsents] = useState<Consent[]>([]);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loadedSettings, setSettings] = useState<SettingsOut | null>(null);
  const profiles = signedIn ? loadedProfiles : EMPTY_PROFILES;
  const profileId = signedIn ? selectedId : null;
  const consents = signedIn ? loadedConsents : EMPTY_CONSENTS;
  const settings = signedIn ? loadedSettings : null;
  // 첫 읽기가 끝났는지만 기억한다. 다시 읽을 때는 화면을 비우지 않는다.
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const syncedSettings = useRef('');

  const reload = useCallback(() => setTick((n) => n + 1), []);

  // 1) 로그인 상태면 프로필 목록과 약관 문서를 읽는다.
  useEffect(() => {
    if (status === 'loading' || !signedIn) return;
    const abort = new AbortController();
    Promise.all([
      getAccountMe(client, abort.signal),
      listLegalDocuments(client, 'ko-KR', abort.signal).catch(() => [] as LegalDocument[]),
    ])
      .then(([me, docs]) => {
        if (abort.signal.aborted) return;
        const list = me.profiles ?? [];
        setProfiles(list);
        setDocuments(docs);
        setError('');
        setProfileId((current) => {
          const keep = current && list.some((item) => item.id === current) ? current : null;
          return keep ?? list.find((item) => item.isDefault)?.id ?? list[0]?.id ?? null;
        });
      })
      .catch((reason) => {
        if (!abort.signal.aborted) setError(errorText(reason, '보호자 정보를 불러오지 못했어요.'));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoadedOnce(true);
      });
    return () => abort.abort();
  }, [client, signedIn, status, tick]);

  // 2) 고른 프로필의 동의와 설정을 읽는다.
  useEffect(() => {
    if (!signedIn || !profileId) return;
    const abort = new AbortController();
    writeSelected(profileId);
    Promise.all([
      listConsents(client, profileId, abort.signal),
      getProfileSettings(client, profileId, abort.signal).catch(() => null),
    ])
      .then(([list, settingsBody]) => {
        if (abort.signal.aborted) return;
        setConsents(list);
        if (settingsBody) setSettings(settingsBody.settings);
      })
      .catch((reason) => {
        if (!abort.signal.aborted) setError(errorText(reason, '동의 기록을 불러오지 못했어요.'));
      });
    return () => abort.abort();
  }, [client, profileId, signedIn, tick]);

  // 3) 서버 설정을 이 기기 설정으로 옮긴다(아이 화면이 읽는 값). 같은 값이면 건너뛴다.
  useEffect(() => {
    if (!settings) return;
    const next = toLocalSettings(settings);
    const stamp = JSON.stringify(next);
    if (syncedSettings.current === stamp) return;
    syncedSettings.current = stamp;
    update((previous) => ({ ...previous, settings: { ...previous.settings, ...next } }));
  }, [settings, update]);

  const profile = useMemo(
    () => profiles.find((item) => item.id === profileId) ?? null,
    [profiles, profileId],
  );

  const value = useMemo<GuardianContextValue>(
    () => ({
      signedIn,
      loading: status === 'loading' || (signedIn && !loadedOnce),
      error,
      profiles,
      profileId,
      profile,
      permissions: profile?.permissions ?? [],
      selectProfile: setProfileId,
      consents,
      documents,
      settings,
      setSettings,
      mode: aiMode({ signedIn, profileId, consents }),
      voice: voiceMode({ signedIn, profileId, consents }),
      reload,
    }),
    [
      signedIn,
      loadedOnce,
      status,
      error,
      profiles,
      profileId,
      profile,
      consents,
      documents,
      settings,
      reload,
    ],
  );
  return <GuardianContext.Provider value={value}>{children}</GuardianContext.Provider>;
}

export function useGuardian(): GuardianContextValue {
  const value = useContext(GuardianContext);
  if (!value) throw new Error('useGuardian 은 GuardianProvider 안에서만 쓸 수 있습니다.');
  return value;
}

/** 아이 대화가 지금 AI 로 가는지 한 줄로 보여 준다. 규칙 기반이면 동의 화면으로 가는 길을 함께 준다. */
export function GuardianAiStatus({ compact = false }: { compact?: boolean }) {
  const { mode, signedIn } = useGuardian();
  const tone = mode === 'ai' ? 'teal' : 'gold';
  return (
    <div className={`row wrap ${compact ? '' : 'space-top'}`} style={{ gap: '0.6rem' }}>
      <span className={`tag ${tone}`}>
        <Icon name={mode === 'ai' ? 'spark' : 'shield'} /> {aiModeLabel(mode)}
      </span>
      {mode !== 'ai' && (
        <Link className="btn light small" to={signedIn ? '/guardian/consent' : '/login'}>
          {signedIn ? 'AI 대화 동의 살펴보기' : '로그인하고 확인하기'}
        </Link>
      )}
    </div>
  );
}

const GUARDIAN_LINKS = [
  { to: '/profile', label: '프로필과 설정' },
  { to: '/guardian/consent', label: '동의와 약관' },
  { to: '/guardian/links', label: '보호자 연결' },
  { to: '/guardian/share', label: '공유 승인' },
  { to: '/guardian/report', label: '성장 리포트' },
  { to: '/guardian/safety', label: '안전 기록' },
  { to: '/guardian/consultation', label: '월간 상담' },
  { to: '/tech', label: '기술·안전 안내' },
  { to: '/data', label: '기록 관리' },
];

export function GuardianNav() {
  return (
    <nav className="filters space-top" aria-label="보호자 화면">
      {GUARDIAN_LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end
          className={({ isActive }) => `chip ${isActive ? 'active' : ''}`}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

/** 프로필이 여럿일 때만 고르는 줄을 보여 준다. */
export function GuardianProfilePicker() {
  const { profiles, profileId, selectProfile } = useGuardian();
  if (profiles.length < 2) return null;
  return (
    <div className="field compact-select">
      <label htmlFor="guardian-profile">보고 있는 아이</label>
      <select
        id="guardian-profile"
        value={profileId ?? ''}
        onChange={(event) => selectProfile(event.target.value)}
      >
        {profiles.map((item) => (
          <option key={item.id} value={item.id}>
            {item.nickname}
            {item.role === 'GUARDIAN' ? ' · 연결된 아이' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

/** 로그인·프로필이 없을 때 보호자 화면이 공통으로 내보내는 안내. */
export function GuardianGate({
  children,
  needsProfile = true,
}: PropsWithChildren<{ needsProfile?: boolean }>) {
  const { signedIn, loading, profileId, error } = useGuardian();
  if (loading)
    return (
      <div className="panel loading-page" role="status">
        <Icon name="sprout" /> 보호자 정보를 불러오는 중이에요…
      </div>
    );
  if (!signedIn)
    return (
      <section className="panel">
        <h3>로그인하면 서버에 저장된 내용을 볼 수 있어요</h3>
        <p className="muted space-top">
          동의 기록, 보호자 연결, 공유 승인, 성장 리포트는 계정에 저장돼요. 로그인하지 않으면 이
          기기에 저장한 체험 설정만 보여요.
        </p>
        <Link className="btn" to="/login?returnTo=%2Fprofile">
          로그인하기
        </Link>
      </section>
    );
  if (error)
    return (
      <div role="alert">
        <Notice variant="error">{error}</Notice>
      </div>
    );
  if (needsProfile && !profileId)
    return (
      <section className="panel">
        <h3>아직 아이 프로필이 없어요</h3>
        <p className="muted space-top">
          티키와 첫인사를 마치면 아이 프로필이 만들어지고, 그다음부터 이 화면들이 채워져요.
        </p>
        <Link className="btn" to="/first-talk">
          티키와 첫인사 하러 가기
        </Link>
      </section>
    );
  return <>{children}</>;
}

/** 보호자 화면 공통 껍데기: 소제목 + 하위 이동 + 프로필 고르기. */
export function GuardianSection({
  title,
  description,
  children,
  actions,
}: PropsWithChildren<{ title: string; description: string; actions?: ReactNode }>) {
  return (
    <>
      <header className="page-head">
        <div className="eyebrow">GUARDIAN</div>
        <div className="row between wrap">
          <h1>{title}</h1>
          {actions}
        </div>
        <p>{description}</p>
      </header>
      <GuardianNav />
      <GuardianProfilePicker />
      {children}
    </>
  );
}

/** 저장·요청 버튼의 진행 상태와 결과 문장을 한곳에서 다룬다. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const run = useCallback(async (task: () => Promise<string | void>) => {
    setBusy(true);
    setFailed(false);
    try {
      const done = await task();
      setMessage(typeof done === 'string' ? done : '');
    } catch (reason) {
      setFailed(true);
      setMessage(errorText(reason));
      throw reason;
    } finally {
      setBusy(false);
    }
  }, []);
  const runQuiet = useCallback(
    (task: () => Promise<string | void>) => {
      run(task).catch(() => undefined);
    },
    [run],
  );
  return { busy, message, failed, run, runQuiet, setMessage };
}

export function ActionResult({ message, failed }: { message: string; failed: boolean }) {
  if (!message) return null;
  return (
    <div role={failed ? 'alert' : 'status'} className="space-top">
      <Notice variant={failed ? 'error' : 'neutral'}>{message}</Notice>
    </div>
  );
}
