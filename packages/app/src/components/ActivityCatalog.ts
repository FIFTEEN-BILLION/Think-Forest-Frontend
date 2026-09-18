// 생각 모험 목록을 서버(`GET /activities`)와 이 기기 목록(`data/catalog.ts`) 어느 쪽에서 와도
// 같은 모양으로 다룬다. 순수 모듈이라 node 테스트에서 그대로 불러 쓴다.

import type { ActivityItem } from '../api/v1/types';
import type { CatalogActivity, Track } from '../types/village';

export interface CatalogEntry {
  id: string;
  track: Track;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  minutes: number;
  /** 서버에서 왔는지. 로그아웃·오프라인이면 false. */
  fromServer: boolean;
}

export function serverEntry(item: ActivityItem): CatalogEntry {
  return {
    id: item.id,
    track: item.track,
    title: item.title,
    subtitle: item.subtitle,
    description: item.description,
    tags: item.tags,
    minutes: item.estimatedMinutes,
    fromServer: true,
  };
}

export function localEntry(activity: CatalogActivity): CatalogEntry {
  return {
    id: activity.id,
    track: activity.track,
    title: activity.title,
    subtitle: activity.subtitle,
    description: activity.description,
    tags: activity.tags,
    minutes: activity.duration,
    fromServer: false,
  };
}

/** 영역과 검색어로 거른다. 서버 목록도 같은 규칙으로 걸러 화면이 한 가지로 동작하게 한다. */
export function filterCatalog(
  entries: CatalogEntry[],
  track: Track | null,
  search: string,
): CatalogEntry[] {
  const needle = search.trim();
  return entries.filter(
    (entry) =>
      (!track || entry.track === track) &&
      (!needle || `${entry.title} ${entry.subtitle} ${entry.tags.join(' ')}`.includes(needle)),
  );
}
