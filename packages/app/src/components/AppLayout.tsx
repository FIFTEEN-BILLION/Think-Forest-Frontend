import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { Notice } from './ui';
import type { Theme } from '../types/village';
import { useBackend } from '../providers/BackendProvider';
import { BackendGate } from './BackendGate';
import { NotificationBell } from './NotificationBell';
import { DebugResetButton } from './DebugResetButton';
import { useServerQuery, useAction } from '../hooks/useServerApi';
import { json } from '../api/requestOptions';
import type { Model } from '../api/schema';
const THEME_STORAGE_KEY = 'jjcp.theme';
const navigation = [
  { to: '/', label: '오늘의 이야기', icon: 'home' },
  { to: '/shelf', label: '나의 책장', icon: 'book' },
  { to: '/words', label: '단어 보관함', icon: 'spark' },
  { to: '/community', label: '친구들의 이야기', icon: 'heart' },
  { to: '/report', label: '나의 발자국', icon: 'chart' },
];
export function VillageRoot() {
  const backend = useBackend();
  const navigate = useNavigate();
  const themeAction = useAction();
  const profileAction = useAction();
  const settings = useServerQuery<Model<'SettingsResponse'>>(
    backend.profileId ? `profiles/${backend.profileId}/settings` : null,
  );
  const profiles = useServerQuery<Model<'ProfileListResponse'>>('profiles');
  const [localTheme, setLocalTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved === 'light' || saved === 'dark' ? saved : 'auto';
    } catch {
      return 'auto';
    }
  });
  const theme = (settings.data?.settings.theme.toLowerCase() ?? localTheme) as Theme;
  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Theme switching still works when browser storage is unavailable.
    }
  }, [theme]);
  const selectedProfile = profiles.data?.items.find((p) => p.id === backend.profileId);
  const displayName = selectedProfile?.nickname || backend.me?.profile?.nickname || '새싹';
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  const sidebar = useRef<HTMLElement>(null);
  const title =
    location.pathname === '/welcome' || location.pathname === '/guest/consent'
      ? '이용 안내와 동의'
      : location.pathname.startsWith('/guardian/')
        ? '보호자 공간'
        : location.pathname.startsWith('/first-talk')
          ? '티키와 첫 인사'
          : location.pathname.startsWith('/talk')
            ? '티키와 대화하기'
            : location.pathname.startsWith('/login')
              ? '로그인'
              : location.pathname.startsWith('/topics/new')
                ? '내가 주제 정하기'
                : location.pathname.startsWith('/story-share')
                  ? '내 이야기 공유하기'
                  : location.pathname.startsWith('/profile')
                    ? '내 프로필과 설정'
                    : location.pathname.startsWith('/data')
                      ? '내 기록 관리'
                      : location.pathname.startsWith('/tech')
                        ? '티키와 기록 안내'
                        : /^\/(adventures|session)/.test(location.pathname)
                          ? '생각 모험'
                          : (navigation.find(
                              (n) => n.to !== '/' && location.pathname.startsWith(n.to),
                            )?.label ?? '오늘의 이야기');
  useEffect(() => {
    document.title = `${title} · 우리 아이 생각친구, 티키`;
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById('main')?.focus({ preventScroll: true });
    window.speechSynthesis?.cancel();
  }, [location.pathname, title]);
  useEffect(() => {
    if (!menu) return;
    const previous = document.activeElement as HTMLElement | null;
    sidebar.current?.querySelector<HTMLElement>('a,button')?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false);
      if (event.key === 'Tab') {
        const items = [...(sidebar.current?.querySelectorAll<HTMLElement>('a,button') ?? [])];
        const first = items[0],
          last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, [menu]);
  const cycleTheme = () => {
    const themes: Theme[] = ['auto', 'light', 'dark'];
    const nextTheme = themes[(themes.indexOf(theme) + 1) % 3]!;
    setLocalTheme(nextTheme);
    if (settings.data && backend.profileId)
      void themeAction.run(async () => {
        await backend.request(
          `profiles/${backend.profileId}/settings`,
          json({ theme: nextTheme.toUpperCase() }, 'PATCH', settings.data!.settings.version),
        );
      });
  };
  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        본문으로 건너뛰기
      </a>
      <aside
        className={`sidebar ${menu ? 'open' : ''}`}
        aria-label="주 메뉴"
        ref={sidebar}
        id="sidebar"
      >
        <Link to="/" className="brand" onClick={() => setMenu(false)}>
          <span className="brandmark">
            <Icon name="sprout" />
          </span>
          <span className="brand-copy">
            <small>우리 아이 생각친구,</small>
            <strong>티키</strong>
          </span>
        </Link>
        <div className="brand-sub">말하고 생각하며 자라는 시간</div>
        <button
          className="mobile-menu menu-dismiss icon-btn"
          aria-label="메뉴 닫기"
          onClick={() => setMenu(false)}
        >
          <Icon name="close" />
        </button>
        <div className="nav-caption">{displayName}의 생각 놀이터</div>
        <nav className="nav">
          {navigation.map((n) => (
            <NavLink
              key={n.to}
              end={n.to === '/'}
              to={n.to}
              className={({ isActive }) =>
                isActive || (n.to === '/' && /^\/(adventures|session)/.test(location.pathname))
                  ? 'active'
                  : ''
              }
              onClick={() => setMenu(false)}
            >
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="seed-note">
            <strong>작은 생각도 소중해요.</strong>
            <p>
              떠오른 생각을 하나씩
              <br />
              티키에게 들려주세요.
            </p>
          </div>
          <Link to="/profile" className="child-card" onClick={() => setMenu(false)}>
            <span className="avatar">{displayName.slice(0, 1)}</span>
            <span>
              <strong>{displayName}의 작은 마을</strong>
              <small>
                {selectedProfile?.gradeOrAgeBand ?? backend.me?.profile?.gradeOrAgeBand ?? ''}
              </small>
            </span>
          </Link>
          <div className="side-utility">
            <Link to="/data" onClick={() => setMenu(false)}>
              내 기록 관리
            </Link>
            <Link to="/tech" onClick={() => setMenu(false)}>
              티키 안내
            </Link>
          </div>
          <span className="status">안전한 어린이 모드</span>
          {backend.me?.user.role !== 'GUEST' && <DebugResetButton />}
        </div>
      </aside>
      {menu && (
        <button
          className="shade show"
          onClick={() => setMenu(false)}
          aria-label="메뉴 배경 닫기"
          tabIndex={-1}
        />
      )}
      <div className="shell" inert={menu}>
        <header className="topbar">
          <div className="row">
            <button
              className="icon-btn mobile-menu"
              onClick={() => setMenu(true)}
              aria-label="메뉴 열기"
              aria-expanded={menu}
              aria-controls="sidebar"
            >
              <Icon name="menu" />
            </button>
            <div className="breadcrumb">
              <span>나의 생각 놀이터</span>
              <strong>{title}</strong>
            </div>
          </div>
          <div className="top-actions">
            {!!profiles.data?.items.filter((p) => p.role === 'OWNER').length && (
              <select
                className="profile-switcher"
                aria-label="아이 프로필"
                value={backend.profileId}
                disabled={profileAction.busy}
                onChange={(e) => {
                  const profile = profiles.data?.items.find((p) => p.id === e.target.value);
                  if (profile)
                    void profileAction.run(async () => {
                      await backend.request(
                        `profiles/${profile.id}`,
                        json({ makeDefault: true }, 'PATCH', profile.version),
                      );
                      await backend.refreshMe();
                      navigate('/');
                    });
                }}
              >
                {profiles.data?.items
                  .filter((p) => p.role === 'OWNER')
                  .map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.nickname || '첫인사 전 아이'}
                    </option>
                  ))}
              </select>
            )}
            <span className="status">
              {backend.me?.user.role === 'GUEST'
                ? '게스트 체험 중'
                : backend.me
                  ? '내 기록'
                  : '함께 시작해요'}
            </span>
            {backend.me?.user.role !== 'GUEST' && <NotificationBell key={backend.scopeId} />}
            <button
              className="icon-btn"
              onClick={cycleTheme}
              disabled={themeAction.busy}
              aria-label={`화면 테마 변경, 현재 ${{ auto: '기기 설정', light: '라이트', dark: '다크' }[theme]}`}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
            <Link className="avatar" to="/profile" aria-label="아이 프로필 열기">
              {displayName.slice(0, 1)}
            </Link>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {backend.me?.user.role === 'GUEST' && (
            <div className="panel row wrap" role="status">
              <span>게스트 체험 · 최대 24시간 · 기록은 카카오 계정으로 옮겨지지 않아요.</span>
              <Link to="/guest/consent">보호자 동의</Link>
              <button
                className="btn"
                disabled={backend.loading}
                onClick={() => void backend.logout()}
              >
                체험 종료
              </button>
            </div>
          )}
          {themeAction.message && <Notice variant="error">{themeAction.message}</Notice>}
          <Suspense
            fallback={
              <div className="panel loading-page" role="status">
                <Icon name="sprout" />
                모험을 준비하고 있어요…
              </div>
            }
          >
            <BackendGate>
              <div className="api-page" key={backend.scopeId}>
                <Outlet />
              </div>
            </BackendGate>
          </Suspense>
          <footer className="footer">
            <span>작은 질문이 모여, 단단한 생각이 되는 곳.</span>
            <Link to="/tech">
              티키와 기록 안내 <Icon name="arrow" />
            </Link>
          </footer>
        </main>
      </div>
      <div className="toast" role="status" aria-live="polite">
        {profileAction.message}
      </div>
    </>
  );
}
