import { useQuery } from '@tanstack/react-query';
import { getShadowMission, useApiClient } from '../api';

/** 그림자 미션 모형·계산표·친구 생각 은행. 단일 진실 원천이라 한 번 받아 오래 쓴다. */
export function useShadowMission() {
  const request = useApiClient();
  return useQuery({
    queryKey: ['missions', 'shadow'],
    queryFn: ({ signal }) => getShadowMission(request, signal),
    staleTime: Infinity,
    retry: 1,
  });
}
