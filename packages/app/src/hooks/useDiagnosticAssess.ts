import { useMutation } from '@tanstack/react-query';
import { assessDiagnostic, useApiClient } from '../api';
import type { DiagnosticAssessRequest } from '../api';

/** 첫 만남 진단 답변 제출 → 되물음 강도·어휘 수준 초기값 */
export function useDiagnosticAssess() {
  const request = useApiClient();
  return useMutation({
    mutationFn: (body: DiagnosticAssessRequest) => assessDiagnostic(request, body),
  });
}
