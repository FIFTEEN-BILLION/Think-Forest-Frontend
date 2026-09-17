// 티키 말로 가르치기 API 계약. 백엔드 app/schemas/path.py 와 함께 고친다.
// AI 는 말 → 프로그램 해석·되묻기·반응·도전 지도 고르기만 한다. 실행은 프론트 결정론 엔진이 한다.

import type { ApiRequest } from './client';
import { jsonBody } from './client';
import type { InputOrigin, InquiryMeta } from './inquiry';
import type { HeardPhrase, PathOutcome, ProgramStep } from '../features/village/types';

export interface PathTeachRequest {
  text: string;
  program: ProgramStep[];
  mapId: string;
  attempt: number;
  inputOrigin: InputOrigin;
  pendingClarify: { question: string; chosen: string } | null;
}
export interface PathTeachResponse extends InquiryMeta {
  kind: 'program' | 'clarify' | 'unmapped';
  program: ProgramStep[];
  heard: HeardPhrase[];
  clarify: { question: string; options: { label: string; program: ProgramStep[] }[] } | null;
  tikiLine: string;
}
export interface PathReactRequest {
  text: string;
  program: ProgramStep[];
  mapId: string;
  attempt: number;
  inputOrigin: InputOrigin;
  result: {
    outcome: PathOutcome;
    moves: number;
    stopStepLabel: string | null;
    previousOutcome: PathOutcome | null;
    changedSinceLast: boolean;
  };
  challengeCandidates: { id: string; summary: string }[];
}
export interface PathReactResponse extends InquiryMeta {
  tikiLine: string;
  question: string | null;
  challengeId: string | null;
  challengeLine: string | null;
}

/** 아이 말 → 티키가 말 그대로 이해한 프로그램(또는 되묻기) */
export function teachTiki(request: ApiRequest, body: PathTeachRequest, signal?: AbortSignal) {
  return request<PathTeachResponse>('/path/teach', jsonBody(body, signal));
}

/** 실행 결과에 대한 티키 반응 + 도착 시 도전 지도 고르기 */
export function reactTiki(request: ApiRequest, body: PathReactRequest, signal?: AbortSignal) {
  return request<PathReactResponse>('/path/react', jsonBody(body, signal));
}
