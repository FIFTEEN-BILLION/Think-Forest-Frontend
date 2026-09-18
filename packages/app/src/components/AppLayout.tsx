import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { VillageProvider, useVillage } from '../providers/VillageProvider';
import { Icon } from './Icon';
import { Notice } from './ui';
import type { Theme } from '../types/village';
import { useBackend } from '../providers/BackendProvider';
import { BackendGate, BackendStatus } from './BackendGate';
import { useServerQuery, useAction } from '../hooks/useServerApi';
import { json } from '../api/requestOptions';
import { ServerRoutes } from '../navigation/ServerRoutes';
const navigation = [
  { to: '/', label: '오늘의 이야기', icon: 'home' },
  { to: '/shelf', label: '나의 책장', icon: 'book' },
  { to: '/words', label: '단어 보관함', icon: 'spark' },
  { to: '/community', label: '친구들의 이야기', icon: 'heart' },
  { to: '/report', label: '나의 발자국', icon: 'chart' },
];
export function VillageRoot() {
  return (
    <VillageProvider>
      <AppLayout />
    </VillageProvider>
  );
}
function AppLayout() {
  const { data, update, storageError, message } = useVillage();
  const backend = useBackend();
  const themeAction = useAction();
  const settings = useServerQuery<{ settings: { theme: string; version: number } }>(
    backend.me?.profile ? `profiles/${backend.me.profile.id}/settings` : null,
  );
  const theme = backend.demo
    ? data.settings.theme
    : ((settings.data?.settings.theme.toLowerCase() ?? 'auto') as Theme);
  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = theme;
  }, [theme]);
  const displayName = backend.demo
    ? data.profile.name
    : (backend.me?.profile?.nickname ?? (backend.me?.user.role === 'GUARDIAN' ? '보호자' : '새싹'));
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  const sidebar = useRef<HTMLElement>(null);
  const title =
    location.pathname === '/session/lab' && data.resume?.activityId === 'first-inquiry'
      ? '첫 탐구'
      : location.pathname === '/session/lab' && data.resume?.activityId === 'path-teaching'
        ? '티키 가르치기'
        : location.pathname.startsWith('/login')
          ? '로그인'
          : location.pathname.startsWith('/first-talk')
            ? '티키와 첫 인사'
            : location.pathname.startsWith('/talk')
              ? '티키와 대화하기'
              : location.pathname.startsWith('/topics/new')
                ? '내가 주제 정하기'
                : location.pathname.startsWith('/story-share')
                  ? '내 이야기 공유하기'
                  : location.pathname.startsWith('/profile')
                    ? '내 프로필과 설정'
                    : location.pathname.startsWith('/data')
                      ? '내 기록 관리'
                      : (navigation.find((n) => n.to !== '/' && location.pathname.startsWith(n.to))
                          ?.label ?? '오늘의 이야기');
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
    if (!backend.demo) {
      if (settings.data && backend.me?.profile)
        void themeAction.run(async () => {
          await backend.request(
            `profiles/${backend.me!.profile!.id}/settings`,
            json(
              { theme: themes[(themes.indexOf(theme) + 1) % 3]!.toUpperCase() },
              'PATCH',
              settings.data!.settings.version,
            ),
          );
        });
      return;
    }
    update((p) => ({
      ...p,
      settings: { ...p.settings, theme: themes[(themes.indexOf(p.settings.theme) + 1) % 3]! },
    }));
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
                {backend.demo ? data.profile.grade : (backend.me?.profile?.gradeOrAgeBand ?? '')}
              </small>
            </span>
          </Link>
          <span className="status">안전한 어린이 모드</span>
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
            <span className="status">{backend.demo ? '예시 화면' : '내 기록'}</span>
            <button
              className="icon-btn"
              onClick={cycleTheme}
              disabled={!backend.demo && (!settings.data || themeAction.busy)}
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
          <BackendStatus />
          {backend.demo && storageError && <Notice variant="error">{storageError}</Notice>}
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
              <ServerRoutes>
                <Outlet />
              </ServerRoutes>
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
        {message}
      </div>
    </>
  );
}
