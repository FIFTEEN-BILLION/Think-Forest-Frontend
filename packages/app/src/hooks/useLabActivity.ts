import { useMutation } from '@tanstack/react-query';
import { createLabActivity, useApiClient } from '../api';
import type { LabActivityRequest } from '../api';

/** 호기심 실험실 주제 → 관찰 활동 생성 */
export function useLabActivity() {
  const request = useApiClient();
  return useMutation({
    mutationFn: (body: LabActivityRequest) => createLabActivity(request, body),
  });
}
