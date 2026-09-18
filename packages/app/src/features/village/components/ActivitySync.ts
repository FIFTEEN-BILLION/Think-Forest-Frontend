// 생각 모험 활동을 서버 세션(`/activity-sessions`)과 맞춘다. React 에 기대지 않는 순수 모듈이라
// node 테스트에서 그대로 불러 쓴다. 화면 쪽 훅은 ActivitySessionBar.tsx 에 있다.
//
// 로컬 초안 엔진(`lib/learning.ts`)은 그대로 둔다. 로그인했으면 단계 이동과 완료 판정만 서버가 맡고,
// 로그아웃·오프라인이면 지금까지처럼 이 기기에서만 진행한다.

import { V1Error } from '../../../api/v1/client';
import type { V1Client } from '../../../api/v1/client';
import {
  advanceActivitySession,
  cancelActivitySession,
  completeActivitySession,
  getActivitySession,
  patchActivitySession,
  startActivitySession,
} from '../../../api/v1/endpoints';
import type { ActivityEvent, ActivitySession } from '../../../api/v1/types';
import { writingStep } from '../lib/learning';
import type { Draft, LearningEvent } from '../types';

/** 자체 엔진과 자체 화면을 가진 두 미션. 서버 세션을 만들지 않고 로컬 초안으로만 진행한다. */
export const LOCAL_ONLY_ACTIVITIES = ['first-inquiry', 'path-teaching'];

export function isLocalOnlyActivity(activityId: string) {
  return LOCAL_ONLY_ACTIVITIES.includes(activityId);
}

// ---------- 로컬 초안 ↔ 서버 세션 연결 ----------

const LINK_KEY = 'jjcp.activitySessions';

/**
 * 초안 id 로 서버 세션 id 를 찾는다. `Draft` 타입은 다른 작업의 것이라 건드리지 않고
 * 연결만 따로 보관한다.
 */
export function readLinks(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LINK_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function linkedSessionId(draftId: string) {
  return readLinks()[draftId] ?? null;
}

export function writeLink(draftId: string, sessionId: string | null) {
  try {
    const links = readLinks();
    if (sessionId) links[draftId] = sessionId;
    else delete links[draftId];
    localStorage.setItem(LINK_KEY, JSON.stringify(links));
  } catch {
    // 저장소가 막혀 있으면 이번 화면에서만 서버와 맞춘다.
  }
}

// ---------- 사건 옮기기 ----------

const OBSERVATION_FIELD: Record<string, string> = { a: 'A', b: 'B' };

/**
 * 로컬 학습 사건을 서버 사건으로 옮긴다. 옮길 것이 없으면 null.
 * `advance` 는 사건이 아니라 별도 API 라 여기서 다루지 않는다.
 */
export function toServerEvent(event: LearningEvent): ActivityEvent | null {
  switch (event.type) {
    case 'text':
      return { type: 'TEXT', value: event.text };
    case 'hint':
      return { type: 'HINT' };
    case 'lab-value':
      return { type: 'LAB_VALUE', value: event.value };
    case 'observation':
      // 서버는 LOW_LIGHT·HIGH_LIGHT·A·B 만 받는다. 출처(source)는 보관할 자리가 없다.
      return OBSERVATION_FIELD[event.field]
        ? { type: 'OBSERVATION', field: OBSERVATION_FIELD[event.field], value: event.value }
        : null;
    case 'approve':
      return { type: 'APPROVE' };
    case 'emotion':
      return { type: 'EMOTION', value: event.emotion };
    case 'scene':
      return { type: 'SCENE', value: event.direction };
    case 'choice':
      return { type: 'CHOICE', value: event.choice };
    default:
      return null;
  }
}

/**
 * 단계를 넘기기 직전에 서버로 올려야 할 사건들.
 * 주제·키워드는 화면이 초안을 직접 고치므로 여기서 한 번에 맞춘다.
 */
export function preAdvanceEvents(draft: Draft): ActivityEvent[] {
  if (draft.track === 'lab' && draft.step === 0)
    return draft.lab.mode === 'custom' ? [{ type: 'TOPIC', value: draft.lab.topic }] : [];
  if (draft.track === 'theater' && draft.step === 0)
    return [{ type: 'KEYWORD', value: draft.theater.keyword }];
  // 글쓰기 단계는 자동 저장이 늦었을 수 있으니 마지막 문장을 확실히 올린다.
  return writingStep(draft) ? [{ type: 'TEXT', value: draft.text }] : [];
}

// ---------- 서버 호출 ----------

export const isConflict = (error: unknown) =>
  error instanceof V1Error && error.code === 'ACTIVITY_REVISION_CONFLICT';

export const isStepNotReady = (error: unknown) =>
  error instanceof V1Error && error.code === 'ACTIVITY_STEP_NOT_READY';

/** 자동 저장 한 건. 초안 번호가 어긋나면 최신 세션을 받아 그 번호로 한 번만 다시 보낸다. */
export async function saveEvent(
  client: V1Client,
  sessionId: string,
  revision: number,
  event: ActivityEvent,
): Promise<ActivitySession> {
  try {
    return (await patchActivitySession(client, sessionId, { clientRevision: revision, event }))
      .session;
  } catch (error) {
    if (!isConflict(error)) throw error;
    const latest = (await getActivitySession(client, sessionId)).session;
    return (
      await patchActivitySession(client, sessionId, {
        clientRevision: latest.revision,
        event,
      })
    ).session;
  }
}

/** 여러 사건을 차례로 저장한다. 마지막 세션 상태를 돌려준다. */
export async function saveEvents(
  client: V1Client,
  sessionId: string,
  revision: number,
  events: ActivityEvent[],
): Promise<ActivitySession | null> {
  let session: ActivitySession | null = null;
  let current = revision;
  for (const event of events) {
    session = await saveEvent(client, sessionId, current, event);
    current = session.revision;
  }
  return session;
}

export async function openSession(client: V1Client, activityId: string, keyword = '') {
  const body = keyword ? { activityId, keyword } : { activityId };
  return (await startActivitySession(client, body)).session;
}

export const fetchSession = async (client: V1Client, sessionId: string, signal?: AbortSignal) =>
  (await getActivitySession(client, sessionId, signal)).session;

export const advanceSession = async (client: V1Client, sessionId: string) =>
  (await advanceActivitySession(client, sessionId)).session;

export const completeSession = (client: V1Client, sessionId: string) =>
  completeActivitySession(client, sessionId);

export const cancelSession = (client: V1Client, sessionId: string) =>
  cancelActivitySession(client, sessionId);
