import { CATALOG } from '../data/catalog';
export function safeNext(value: string | null, fallback = '/') {
  if (value === '/adventures/lab/first-inquiry?preview=connection-error') return value;
  if (
    value &&
    ([
      '/',
      '/talk',
      '/profile',
      '/tech',
      '/data',
      '/report',
      '/shelf',
      '/community',
      '/topics/new',
    ].includes(value) ||
      /^\/session\/(forest|lab|theater)$/.test(value) ||
      CATALOG.some((a) => value === `/adventures/${a.track}/${a.id}`))
  )
    return value;
  return fallback;
}
