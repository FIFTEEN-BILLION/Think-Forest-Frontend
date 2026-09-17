import { useQuery } from '@tanstack/react-query';
import { getHealth, useApiClient } from '../api';
import { queryKeys } from './queryKeys';

/** 백엔드 연결 확인. 사이드 내비의 AI 연결 상태 표시 등에 쓴다. */
export function useHealth() {
  const request = useApiClient();
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => getHealth(request, signal),
  });
}
