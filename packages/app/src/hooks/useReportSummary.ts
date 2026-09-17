import { useMutation } from '@tanstack/react-query';
import { summarizeReport, useApiClient } from '../api';
import type { ReportSummaryRequest } from '../api';

/** 성장 리포트의 "이번 주 부모님께" 요약 생성 */
export function useReportSummary() {
  const request = useApiClient();
  return useMutation({
    mutationFn: (body: ReportSummaryRequest) => summarizeReport(request, body),
  });
}
