import { useMutation, useQuery } from '@tanstack/react-query';
import { generateScript, getScriptLibrary, getScriptLibraryItem, useApiClient } from '../api';
import type { ScriptRequest } from '../api';
import { queryKeys } from './queryKeys';

/** 마음극장 대본 생성. 실패해도 200 + { ai:false, safe:false } 이므로 onError 가 아니라 응답을 본다. */
export function useScriptGeneration() {
  const request = useApiClient();
  return useMutation({
    mutationFn: (body: ScriptRequest) => generateScript(request, body),
  });
}

/** 검수 대본 6종 목록 */
export function useScriptLibrary() {
  const request = useApiClient();
  return useQuery({
    queryKey: queryKeys.scriptLibrary,
    queryFn: ({ signal }) => getScriptLibrary(request, signal),
    staleTime: Infinity, // 정적 데이터
  });
}

/** 검수 대본 단건 */
export function useScriptLibraryItem(id: string) {
  const request = useApiClient();
  return useQuery({
    queryKey: queryKeys.scriptLibraryItem(id),
    queryFn: ({ signal }) => getScriptLibraryItem(request, id, signal),
    staleTime: Infinity,
    enabled: id.length > 0,
  });
}
