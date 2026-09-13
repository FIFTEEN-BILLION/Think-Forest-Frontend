import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { mockSessions } from '../data/mock';
import { blockedKeyword, createDraft, gateSize, toRecord, transition } from '../lib/learning';
import { clearData, loadData, STORAGE_KEY } from '../lib/storage';
import type { Draft, LearningEvent, Track, VillageData } from '../types';

interface VillageContextValue {
  data: VillageData;
  update: (change: (data: VillageData) => VillageData) => boolean;
  storageError: string;
  toast: (message: string) => void;
  message: string;
  parentUnlocked: boolean;
  setParentUnlocked: (value: boolean) => void;
  start: (track: Track, id: string) => Draft | null;
  send: (event: LearningEvent) => boolean;
  finish: () => string | null;
  reset: () => boolean;
  restoreExamples: () => void;
}
const VillageContext = createContext<VillageContextValue | null>(null);
export function VillageProvider({ children }: PropsWithChildren) {
  const [initial] = useState(loadData);
  const [data, setData] = useState(initial.data);
  const current = useRef(data);
  const [storageError, setStorageError] = useState(initial.storageError);
  const [message, toast] = useState('');
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const update = useCallback((change: (data: VillageData) => VillageData) => {
    const next = change(current.current);
    current.current = next;
    setData(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStorageError('');
      return true;
    } catch {
      setStorageError(
        '이 기기에 저장하지 못했어요. 새로고침 전에 기록 관리에서 전체 기록을 내려받아 주세요.',
      );
      return false;
    }
  }, []);
  useEffect(() => {
    if (data.settings.theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = data.settings.theme;
  }, [data.settings.theme]);
  useEffect(() => {
    if (!data.settings.tts && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, [data.settings.tts]);
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => toast(''), 4500);
    return () => clearTimeout(id);
  }, [message]);
  useEffect(() => {
    // Do not overwrite an active draft with another tab's stale copy.
    const changed = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY)
        toast('다른 창에서 기록이 변경되었어요. 이 창의 작성 내용을 보관한 뒤 새로고침해 주세요.');
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);
  const start = (track: Track, id: string) => {
    if (current.current.resume) return current.current.resume;
    if (!current.current.consent.done) {
      toast('보호자와 함께 시작 안내를 먼저 확인해 주세요.');
      return null;
    }
    const draft = createDraft(track, id, gateSize(current.current));
    update((prev) => ({ ...prev, resume: draft }));
    return draft;
  };
  const send = useCallback(
    (event: LearningEvent) => {
      const draft = current.current.resume;
      if (!draft) return false;
      const result = transition(draft, event);
      if (result.error) {
        const kw = draft.track === 'theater' ? draft.theater.keyword : draft.lab.topic;
        if (event.type === 'advance' && draft.step === 0 && blockedKeyword(kw))
          update((p) => ({
            ...p,
            safety: [
              {
                id: crypto.randomUUID(),
                at: new Date().toISOString(),
                keyword: kw,
                reason: '체험용 키워드 목록과 일치',
                source: 'local',
              },
              ...p.safety,
            ].slice(0, 20) as VillageData['safety'],
          }));
        toast(result.error);
        return false;
      }
      update((p) => ({ ...p, resume: result.draft }));
      return true;
    },
    [update],
  );
  const finish = () => {
    const draft = current.current.resume;
    if (!draft) return null;
    try {
      const record = toRecord(draft);
      update((p) => ({
        ...p,
        sessions: [record, ...p.sessions.filter((s) => s.id !== record.id)],
        resume: null,
        summary: null,
      }));
      return record.id;
    } catch {
      toast('아직 남은 활동이 있어요. 모든 단계를 마쳐 주세요.');
      return null;
    }
  };
  const reset = () => {
    try {
      const next = clearData();
      current.current = next;
      setData(next);
      setParentUnlocked(false);
      setStorageError('');
      toast('이 기기의 리액트 생각숲 기록을 삭제했어요.');
      return true;
    } catch {
      toast('저장소에 접근할 수 없어 삭제하지 못했어요.');
      return false;
    }
  };
  const restoreExamples = () => {
    update((p) => ({
      ...p,
      sessions: [...p.sessions.filter((s) => s.source === 'local'), ...mockSessions()],
      summary: null,
    }));
    toast('예시 기록을 다시 채웠어요. 직접 작성한 기록도 보관되어 있어요.');
  };
  return (
    <VillageContext.Provider
      value={{
        data,
        update,
        storageError,
        message,
        toast,
        parentUnlocked,
        setParentUnlocked,
        start,
        send,
        finish,
        reset,
        restoreExamples,
      }}
    >
      {children}
    </VillageContext.Provider>
  );
}
export function useVillage() {
  const value = useContext(VillageContext);
  if (!value) throw new Error('VillageProvider is required');
  return value;
}
