// 첫 탐구(그림자) 사고력 엔진 API 계약. 백엔드 app/schemas/inquiry.py 와 함께 고친다.

import type { ApiRequest } from './client';
import { jsonBody } from './client';
import type { AiMeta } from './types';

export type ShadowVariableId = 'lightHeight' | 'stickHeight' | 'distance' | 'brightness';
export type EffectId = 'longer' | 'shorter' | 'same';
export type ClaimEffectId = EffectId | 'unknown';
export type InputOrigin = 'example' | 'adult' | 'child';
export type SetupPayload = Record<ShadowVariableId, string>;

export interface ClaimPayload {
  variable: ShadowVariableId;
  effect: ClaimEffectId;
}
export interface ExperimentPayload {
  base: SetupPayload;
  compare: SetupPayload;
}
/** 친구 대사·분석의 출처. fallback 이면 규칙 기반 준비된 대사다. */
export interface InquiryMeta extends AiMeta {
  source: 'ai' | 'fallback';
}

export interface ShadowMission {
  id: string;
  question: string;
  variables: {
    id: ShadowVariableId;
    name: string;
    up: string;
    levels: { id: string; label: string }[];
  }[];
  baseSetup: SetupPayload;
  table: { setup: Record<string, string>; length: number }[];
  designFeedback: Record<'none' | 'probe' | 'hint' | 'explanation', string>;
  friendBeliefs: {
    id: string;
    line: string;
    variable: ShadowVariableId;
    claimedEffect: EffectId;
  }[];
  truth: Record<ShadowVariableId, EffectId>;
  facts: Record<ShadowVariableId, string>;
  modelNote: string;
  parentQuestion: string;
  childDataMode: 'demo' | 'child';
  aiAvailable: boolean;
}

export interface InterpretRequest {
  prediction: ClaimEffectId;
  reason: string;
  reasonSkipped: boolean;
  inputOrigin: InputOrigin;
}
export interface InterpretResponse extends InquiryMeta {
  claims: ClaimPayload[];
  uncertain: boolean;
  restatement: string;
  friendBeliefId: string;
  friendLine: string;
}

export interface TeachRequest {
  beliefId: string;
  message: string;
  cards: ExperimentPayload[];
  attempt: number;
  inputOrigin: InputOrigin;
}
export interface TeachResponse extends InquiryMeta {
  claim: ClaimPayload | null;
  usesEvidence: boolean;
  convinced: boolean;
  missing: 'evidence' | 'fairness' | 'variable' | 'direction' | null;
  helpLevel: 'probe' | 'hint' | 'explanation' | null;
  friendReply: string;
}

export interface ChallengeRequest {
  beliefId: string;
  convinced: boolean;
  experiments: ExperimentPayload[];
  finalText: string;
  finalReason: string;
  inputOrigin: InputOrigin;
}
export interface ChallengePayload {
  id: string;
  line: string;
  base: SetupPayload;
  compare: SetupPayload;
  baseLength: number;
  compareLength: number;
  friendPrediction: EffectId;
  confounded: boolean;
  friendCorrect: boolean;
}
export interface ChallengeResponse extends InquiryMeta {
  challenge: ChallengePayload;
  finalClaims: ClaimPayload[];
}

export function getShadowMission(request: ApiRequest, signal?: AbortSignal) {
  return request<ShadowMission>('/missions/shadow', { signal });
}

/** 처음 생각 이해 + 생각 친구의 다른 생각 */
export function interpretThought(
  request: ApiRequest,
  body: InterpretRequest,
  signal?: AbortSignal,
) {
  return request<InterpretResponse>('/inquiry/interpret', jsonBody(body, signal));
}

/** 친구 가르치기. 설득 여부는 서버 규칙이 판정한다. */
export function teachFriend(request: ApiRequest, body: TeachRequest, signal?: AbortSignal) {
  return request<TeachResponse>('/inquiry/teach', jsonBody(body, signal));
}

/** 새 상황 도전 */
export function requestChallenge(
  request: ApiRequest,
  body: ChallengeRequest,
  signal?: AbortSignal,
) {
  return request<ChallengeResponse>('/inquiry/challenge', jsonBody(body, signal));
}
