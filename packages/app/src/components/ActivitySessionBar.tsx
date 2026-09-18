// 생각 모험 화면과 서버 활동 세션을 잇는 훅. 로컬 초안 엔진은 그대로 두고,
// 로그인했을 때만 자동 저장·단계 검사·완료를 서버에 맡긴다.

import { useCallback, useEffect, useRef, useState } from 'react';
import { V1Error } from '../api/v1/client';
import { stepMissingReasons } from '../api/v1/endpoints';
import type { ActivityEvent, ActivitySession } from '../api/v1/types';
import { useAuth } from '../providers/AuthProvider';
import type { Draft, LearningEvent } from '../types/village';
import { useVillage } from '../providers/VillageProvider';
import { Icon } from './Icon';
import { Notice } from './ui';
import {
  advanceSession,
  autosaveKey,
  cancelSession,
  completeSession,
  fetchSession,
  isLocalOnlyActivity,
  isStepNotReady,
  linkedSessionId,
  openSession,
  preAdvanceEvents,
  saveEvent,
  saveEvents,
  toServerEvent,
  writeLink,
} from './ActivitySync';

/** 자동 저장을 모으는 시간. 글자마다 서버로 보내지 않는다. */
const AUTOSAVE_MS = 800;

export interface ActivityFlow {
  /** 로컬 초안을 먼저 바꾸고, 연결된 서버 세션에도 같은 사건을 올린다. */
  send: (event: LearningEvent) => boolean;
  /** 서버가 단계 조건을 다시 검사한 뒤에만 다음 단계로 간다. */
  advance: () => void;
  /** 서버에 완료를 알리고 책장 기록을 만든 뒤 로컬 기록도 남긴다. */
  complete: (onDone?: (recordId: string) => void) => void;
  /** 작성 중인 모험을 정리할 때 서버 세션도 취소한다. */
  cancel: () => void;
  busy: boolean;
  /** 서버가 알려 준, 지금 단계에서 아직 못 채운 조건. */
  missing: string[];
  error: string;
  linked: boolean;
}

/** 서버 세션을 쓰는 활동인지. 두 미션은 자체 엔진이 있어 항상 이 기기에서만 진행한다. */
export function usesServerSession(draft: Draft | null) {
  return Boolean(draft) && !isLocalOnlyActivity(draft!.activityId);
}

export function useActivityFlow(draft: Draft | null): ActivityFlow {
  const { client, status } = useAuth();
  const { send: localSend, finish: localFinish, toast } = useVillage();
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState('');
  const revision = useRef(0);
  // 자동 저장은 보낸 순서대로 처리해야 초안 번호가 어긋나지 않는다.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const latest = useRef(draft);
  // 자동 저장을 모아 두는 칸(본문·관찰 A/B). 칸마다 따로 모았다가 한 번씩 보낸다.
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<string, ActivityEvent>());

  const draftId = draft?.id ?? null;
  const active = status === 'signedIn' && usesServerSession(draft);
  // 모험을 시작할 때 저장해 둔 연결. 새로고침해도 같은 서버 세션으로 이어진다.
  const storedId = active && draftId ? linkedSessionId(draftId) : null;
  // 서버에 없거나 이미 끝난 세션. 연결을 끊고 이 기기 초안으로만 이어 간다.
  const [dropped, setDropped] = useState<string | null>(null);
  const sessionId = storedId && storedId !== dropped ? storedId : null;

  useEffect(() => {
    latest.current = draft;
  });

  const adopt = useCallback((session: ActivitySession | null) => {
    if (session) revision.current = session.revision;
  }, []);

  // 새로고침·이어하기: 연결된 서버 세션의 최신 초안 번호를 받아 둔다.
  useEffect(() => {
    if (!storedId || !draftId) return;
    const controller = new AbortController();
    fetchSession(client, storedId, controller.signal).then(
      (session) => {
        if (controller.signal.aborted) return;
        adopt(session);
        if (session.status !== 'ACTIVE') setDropped(storedId);
      },
      (failure: unknown) => {
        if (controller.signal.aborted) return;
        // 서버에 없거나 내 세션이 아니면 연결을 지우고 이 기기 기록으로 계속한다.
        // 잠깐 끊긴 것(네트워크·5xx)은 연결을 그대로 두고 다음 저장에서 다시 맞춘다.
        if (failure instanceof V1Error && (failure.status === 404 || failure.status === 403)) {
          writeLink(draftId, null);
          setDropped(storedId);
        }
      },
    );
    return () => controller.abort();
  }, [client, draftId, storedId, adopt]);

  const enqueue = useCallback((task: () => Promise<unknown>) => {
    queue.current = queue.current.then(task, task);
    return queue.current;
  }, []);

  const save = useCallback(
    (id: string, serverEvent: ActivityEvent) =>
      enqueue(async () => {
        try {
          adopt(await saveEvent(client, id, revision.current, serverEvent));
          setError('');
        } catch {
          // 자동 저장이 한 번 실패해도 진행을 막지 않는다. 다음 저장이나 단계 이동에서 다시 맞춘다.
          setError('서버 자동 저장이 늦어지고 있어요. 이 기기에는 저장되어 있어요.');
        }
      }),
    [adopt, client, enqueue],
  );

  /**
   * 글자를 칠 때마다 보내지 않는다. 잠깐 멈추면 그때 한 번 저장한다.
   * 모아 둔 것을 버려도 `preAdvanceEvents` 가 단계를 넘기기 전에 마지막 값을 올린다.
   */
  const dropPending = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    pending.current.clear();
  }, []);

  useEffect(() => dropPending, [dropPending]);

  const send = useCallback(
    (event: LearningEvent) => {
      const ok = localSend(event);
      if (!ok || !active || !sessionId) return ok;
      // 지금 초안을 기준으로 옮긴다. 슬라이더는 경계를 처음 넘을 때만 사건이 나온다.
      const serverEvent = toServerEvent(event, latest.current ?? undefined);
      if (!serverEvent) return ok;
      const key = autosaveKey(serverEvent);
      if (!key) {
        void save(sessionId, serverEvent);
        return ok;
      }
      pending.current.set(key, serverEvent);
      const running = timers.current.get(key);
      if (running) clearTimeout(running);
      timers.current.set(
        key,
        setTimeout(() => {
          const queued = pending.current.get(key);
          timers.current.delete(key);
          pending.current.delete(key);
          if (queued) void save(sessionId, queued);
        }, AUTOSAVE_MS),
      );
      return ok;
    },
    [active, localSend, save, sessionId],
  );

  const advance = useCallback(() => {
    const current = latest.current;
    if (!current) return;
    dropPending();
    setMissing([]);
    if (!active || !sessionId) {
      localSend({ type: 'advance' });
      return;
    }
    setBusy(true);
    void enqueue(async () => {
      try {
        adopt(await saveEvents(client, sessionId, revision.current, preAdvanceEvents(current)));
        adopt(await advanceSession(client, sessionId));
        setError('');
        localSend({ type: 'advance' });
      } catch (failure) {
        if (isStepNotReady(failure)) setMissing(stepMissingReasons(failure));
        else {
          setError(
            failure instanceof Error && failure.message
              ? failure.message
              : '다음 단계로 가지 못했어요. 잠시 뒤에 다시 눌러 주세요.',
          );
        }
      } finally {
        setBusy(false);
      }
    });
  }, [active, adopt, client, enqueue, dropPending, localSend, sessionId]);

  const complete = useCallback(
    (onDone?: (recordId: string) => void) => {
      dropPending();
      const finishLocally = () => {
        const id = localFinish();
        if (id && draftId) writeLink(draftId, null);
        if (id) onDone?.(id);
        return id;
      };
      if (!active || !sessionId) {
        finishLocally();
        return;
      }
      setBusy(true);
      setMissing([]);
      void enqueue(async () => {
        try {
          adopt(
            await saveEvents(
              client,
              sessionId,
              revision.current,
              preAdvanceEvents(latest.current!),
            ),
          );
          await completeSession(client, sessionId);
          setError('');
          finishLocally();
        } catch (failure) {
          if (isStepNotReady(failure)) setMissing(stepMissingReasons(failure));
          else
            setError(
              failure instanceof Error && failure.message
                ? failure.message
                : '책장에 남기지 못했어요. 잠시 뒤에 다시 눌러 주세요.',
            );
        } finally {
          setBusy(false);
        }
      });
    },
    [active, adopt, client, draftId, enqueue, dropPending, localFinish, sessionId],
  );

  const cancel = useCallback(() => {
    dropPending();
    if (!draftId) return;
    const id = sessionId;
    writeLink(draftId, null);
    if (id) setDropped(id);
    if (!active || !id) return;
    void enqueue(() => cancelSession(client, id).catch(() => undefined));
  }, [active, client, draftId, enqueue, dropPending, sessionId]);

  useEffect(() => {
    if (error) toast(error);
  }, [error, toast]);

  return { send, advance, complete, cancel, busy, missing, error, linked: Boolean(sessionId) };
}

/**
 * 모험을 시작할 때 서버 세션을 연다. 로그아웃·오프라인이면 아무것도 하지 않고
 * 이 기기 초안으로만 진행한다.
 */
export async function beginServerSession(
  client: ReturnType<typeof useAuth>['client'],
  draft: Draft,
) {
  if (isLocalOnlyActivity(draft.activityId)) return null;
  try {
    const session = await openSession(client, draft.activityId, draft.theater.keyword);
    writeLink(draft.id, session.sessionId);
    return session;
  } catch {
    return null;
  }
}

/** 서버가 알려 준 진행 조건과 저장 상태를 그대로 보여 준다. */
export function ActivitySessionNotice({ flow }: { flow: ActivityFlow }) {
  if (flow.missing.length)
    return (
      <Notice>
        {flow.missing.map((reason) => (
          <span className="block" key={reason}>
            {reason}
          </span>
        ))}
      </Notice>
    );
  if (!flow.linked) return null;
  return (
    <span className="autosave">
      <Icon name="check" />
      {flow.busy ? '서버에 저장하는 중…' : '서버에 자동 저장됨'}
    </span>
  );
}
