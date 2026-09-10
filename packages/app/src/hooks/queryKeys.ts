// TanStack Query 캐시 키. 읽기(useQuery) 엔드포인트만 키를 갖는다.
export const queryKeys = {
  health: ['health'] as const,
  scriptLibrary: ['theater', 'library'] as const,
  scriptLibraryItem: (id: string) => ['theater', 'library', id] as const,
  techPanel: ['tech', 'panel'] as const,
};
