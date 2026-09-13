// 자람마을 백엔드 도메인 요청 함수. 순수 함수 — request 를 인자로 받는다.
// 훅(`../hooks`)이 useApiClient() 로 request 를 얻어 이 함수들을 호출한다.

import type { ApiRequest } from './client';
import { jsonBody } from './client';
import type {
  DiagnosticAssessRequest,
  DiagnosticAssessResponse,
  HealthResponse,
  LabActivityRequest,
  LabActivityResponse,
  LibraryScript,
  ReportSummaryRequest,
  ReportSummaryResponse,
  RubricScoreRequest,
  RubricScoreResponse,
  ScriptRequest,
  ScriptResponse,
  TechPanelResponse,
} from './types';

export function getHealth(request: ApiRequest, signal?: AbortSignal) {
  return request<HealthResponse>('/health', { signal });
}

/** 첫 만남 진단 결과 → 되물음 강도·어휘 수준 초기값 */
export function assessDiagnostic(
  request: ApiRequest,
  body: DiagnosticAssessRequest,
  signal?: AbortSignal,
) {
  return request<DiagnosticAssessResponse>('/diagnostic/assess', jsonBody(body, signal));
}

/** 되물음 채점(생각숲·실험실 공용) */
export function scoreRubric(request: ApiRequest, body: RubricScoreRequest, signal?: AbortSignal) {
  return request<RubricScoreResponse>('/rubric/score', jsonBody(body, signal));
}

/** 마음극장 대본 생성. 실패 시에도 200 + { ai:false, safe:false } 로 온다. */
export function generateScript(request: ApiRequest, body: ScriptRequest, signal?: AbortSignal) {
  return request<ScriptResponse>('/theater/script', jsonBody(body, signal));
}

/** 검수 대본 6종 */
export function getScriptLibrary(request: ApiRequest, signal?: AbortSignal) {
  return request<LibraryScript[]>('/theater/library', { signal });
}

export function getScriptLibraryItem(request: ApiRequest, id: string, signal?: AbortSignal) {
  return request<LibraryScript>(`/theater/library/${encodeURIComponent(id)}`, { signal });
}

/** 호기심 실험실 관찰 활동 생성 */
export function createLabActivity(
  request: ApiRequest,
  body: LabActivityRequest,
  signal?: AbortSignal,
) {
  return request<LabActivityResponse>('/lab/activity', jsonBody(body, signal));
}

/** 이번 주 부모님께(성장 리포트 요약) */
export function summarizeReport(
  request: ApiRequest,
  body: ReportSummaryRequest,
  signal?: AbortSignal,
) {
  return request<ReportSummaryResponse>('/report/summary', jsonBody(body, signal));
}

/** 기술·안전 패널(심사용 진단) */
export function getTechPanel(request: ApiRequest, signal?: AbortSignal) {
  return request<TechPanelResponse>('/tech/panel', { signal });
}
