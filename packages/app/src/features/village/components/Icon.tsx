import type { ReactNode } from 'react';
const paths: Record<string, ReactNode> = {
  sprout: (
    <path d="M12 21V11M12 14C4 15 2 9 3 4c6 0 10 3 9 10ZM12 11C11 5 16 2 21 3c1 6-3 10-9 8Z" />
  ),
  home: <path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8" />,
  tree: <path d="M12 22v-6M12 2 5 10h3l-5 7h18l-5-7h3Z" />,
  book: <path d="M12 5C8 2 4 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-6-2-10 1ZM12 5v16" />,
  chart: <path d="M4 3v18h18M8 16v-5M13 16V6M18 16V9" />,
  user: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
    </>
  ),
  shield: <path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6ZM8 12l3 3 5-6" />,
  flask: (
    <>
      <path d="M9 3h6M10 3v7L4 20c-.5 1 .2 2 1 2h14c1 0 1.5-1 1-2L14 10V3M7 16h10" />
      <circle cx="12" cy="18" r=".6" />
    </>
  ),
  theater: <path d="M3 3h18v17H3ZM3 3c0 6 3 8 7 8L3 17M21 3c0 6-3 8-7 8l7 6M10 3v8M14 3v8" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  back: <path d="M20 12H4m6-6-6 6 6 6" />,
  spark: <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" />,
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </>
  ),
  check: <path d="m5 12 4 4L20 5" />,
  moon: <path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 1v2M12 21v2M1 12h2M21 12h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  leaf: <path d="M4 20C0 8 10 2 21 3c0 12-5 18-17 17ZM4 20 16 8" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7v.1" />
    </>
  ),
  play: <path d="m8 4 13 8-13 8Z" />,
  pause: <path d="M8 4v16M16 4v16" />,
  sound: <path d="m11 4-6 5H2v6h3l6 5ZM15 8c3 2 3 6 0 8M18 4c6 5 6 11 0 16" />,
  download: <path d="M12 2v13m-5-5 5 5 5-5M4 16v5h16v-5" />,
  chat: <path d="M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4ZM8 9h8M8 13h5" />,
  search: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="m15 15 6 6" />
    </>
  ),
  heart: <path d="M12 21S2 15 2 8c0-6 8-7 10-1 2-6 10-5 10 1 0 7-10 13-10 13Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 3" />
    </>
  ),
};
export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <svg className={`icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      {paths[name] ?? paths.sprout}
    </svg>
  );
}
