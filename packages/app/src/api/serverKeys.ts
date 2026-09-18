/** Shared keys for queries, mutation updates and account isolation. */
export const serverKeys = {
  me: ['auth', 'me'] as const,
  user: (userId: string | undefined) => ['server', userId ?? 'anonymous'] as const,
  resource: (userId: string | undefined, path: string | null) => {
    const [route = '', search = ''] = (path ?? '').replace(/^\//, '').split('?');
    const params = new URLSearchParams(search);
    params.sort();
    return [...serverKeys.user(userId), route, params.toString()] as const;
  },
};
