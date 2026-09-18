import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useBackend } from '../providers/BackendProvider';
import {
  ServerCommunity,
  ServerHome,
  ServerLibrary,
  ServerRecord,
  ServerShare,
  ServerTopics,
  ServerWords,
} from '../screens/ReaderScreens';
import { ServerActivity, ServerAdventures, ServerTalk } from '../screens/LearningScreens';
import { ServerData, ServerProfile, ServerReport, ServerTech } from '../screens/ParentScreens';

export function ServerRoutes({ children }: PropsWithChildren) {
  const { demo, me } = useBackend();
  const { pathname, search } = useLocation();
  if (demo || pathname === '/login') return <>{children}</>;
  if (pathname === '/talk' && me?.user.needsFirstGreeting)
    return <Navigate replace to={`/first-talk?next=${encodeURIComponent(pathname + search)}`} />;
  if (
    me?.user.role === 'GUARDIAN' &&
    !['/', '/profile', '/report', '/data', '/tech', '/community'].includes(pathname) &&
    !pathname.startsWith('/community/')
  )
    return (
      <section className="panel">
        <h1>아이 계정에서 이용하는 공간이에요.</h1>
        <p>보호자 계정에서는 연결된 아이의 프로필과 활동 보고서를 확인할 수 있어요.</p>
        <Link className="btn" to="/profile">
          아이 연결과 설정
        </Link>
      </section>
    );
  if (pathname === '/') return <ServerHome />;
  if (pathname === '/first-talk') return <ServerTalk key={pathname + search} greeting />;
  if (pathname === '/talk') return <ServerTalk key={pathname + search} />;
  if (pathname === '/shelf') return <ServerLibrary />;
  if (/^\/(shelf|complete)\/[^/]+$/.test(pathname)) return <ServerRecord key={pathname} />;
  if (pathname === '/words') return <ServerWords />;
  if (/^\/community(?:\/[^/]+)?$/.test(pathname)) return <ServerCommunity key={pathname} />;
  if (pathname === '/story-share') return <ServerShare />;
  if (pathname === '/topics/new') return <ServerTopics />;
  if (pathname.startsWith('/adventures')) return <ServerAdventures key={pathname} />;
  if (pathname.startsWith('/session/')) return <ServerActivity key={pathname + search} />;
  if (pathname === '/profile') return <ServerProfile />;
  if (pathname === '/report') return <ServerReport />;
  if (pathname === '/data') return <ServerData />;
  if (pathname === '/tech') return <ServerTech />;
  return <>{children}</>;
}
