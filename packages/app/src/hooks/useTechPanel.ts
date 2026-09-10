import { useQuery } from '@tanstack/react-query';
import { getTechPanel, useApiClient } from '../api';
import { queryKeys } from './queryKeys';

/** 기술·안전 패널(심사용): AI 연결 상태, 호출·차단 로그 */
export function useTechPanel() {
  const request = useApiClient();
  return useQuery({
    queryKey: queryKeys.techPanel,
    queryFn: ({ signal }) => getTechPanel(request, signal),
    refetchInterval: 10_000,
  });
}
