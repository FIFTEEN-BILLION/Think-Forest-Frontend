import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { VillageProvider, useVillage } from '../state/VillageProvider';
import { Icon } from './Icon';
import { Notice } from './ui';
import type { Theme } from '../types';
const navigation = [
  { to: '/', label: '오늘의 이야기', icon: 'home' },
  { to: '/talk', label: '티키와 대화하기', icon: 'chat' },
  { to: '/shelf', label: '나의 책장', icon: 'book' },
  { to: '/words', label: '단어 보관함', icon: 'spark' },
  { to: '/community', label: '친구들의 이야기', icon: 'heart' },
  { to: '/report', label: '나의 발자국', icon: 'chart' },
  { to: '/profile', label: '내 설정', icon: 'user' },
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
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  const sidebar = useRef<HTMLElement>(null);
  const title =
    location.pathname === '/session/lab' && data.resume?.activityId === 'first-inquiry'
      ? '첫 탐구'
      : (navigation.find((n) => n.to !== '/' && location.pathname.startsWith(n.to))?.label ??
        '오늘의 이야기');
  useEffect(() => {
    document.title = `${title} · 생각숲`;
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
          생각숲
        </Link>
        <div className="brand-sub">나의 AI 생각친구</div>
        <button
          className="mobile-menu menu-dismiss icon-btn"
          aria-label="메뉴 닫기"
          onClick={() => setMenu(false)}
        >
          <Icon name="close" />
        </button>
        <div className="nav-caption">지우의 생각 놀이터</div>
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
            <strong>오늘은 7분 이야기했어요!</strong>
            <p>
              조금만 더 이야기하면
              <br />
              오늘의 책이 완성돼요.
            </p>
          </div>
          <Link to="/profile" className="child-card" onClick={() => setMenu(false)}>
            <span className="avatar">{data.profile.name.slice(0, 1)}</span>
            <span>
              <strong>{data.profile.name}의 작은 마을</strong>
              <small>{data.profile.grade}</small>
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
            <span className="status">목데이터 체험</span>
            <button
              className="icon-btn"
              onClick={cycleTheme}
              aria-label={`화면 테마 변경, 현재 ${{ auto: '기기 설정', light: '라이트', dark: '다크' }[data.settings.theme]}`}
            >
              <Icon name={data.settings.theme === 'dark' ? 'sun' : 'moon'} />
            </button>
            <Link className="avatar" to="/profile" aria-label="아이 프로필 열기">
              {data.profile.name.slice(0, 1)}
            </Link>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {storageError && <Notice variant="error">{storageError}</Notice>}
          <Suspense
            fallback={
              <div className="panel loading-page" role="status">
                <Icon name="sprout" />
                모험을 준비하고 있어요…
              </div>
            }
          >
            <Outlet />
          </Suspense>
          <footer className="footer">
            <span>작은 질문이 모여, 단단한 생각이 되는 곳.</span>
            <Link to="/tech">
              AI 미연결 · 이 기기에만 저장돼요 <Icon name="arrow" />
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
