// 지금 듣고 있는 발화 상태를 화면 두 곳(마이크 버튼이 있는 화면, 자막을 그리는 ChatThread)이 함께 본다.
//
// 대화 화면은 다른 작업이 쓰고 있어 건드리지 않는다. 그래서 컨텍스트 대신 아주 작은 구독 저장소를 둔다.
// 상태는 한 번에 한 발화뿐이라 전역 하나로 충분하다.

import { useSyncExternalStore } from 'react';
import type { VoiceState } from './protocol';
import { initialVoiceState } from './protocol';

export interface VoiceSessionState extends VoiceState {
  /** 듣기 시작한 뒤 흐른 시간(초). 60초 상한과 50초 안내에 쓴다. */
  elapsedSeconds: number;
}

const initial: VoiceSessionState = { ...initialVoiceState, elapsedSeconds: 0 };

let current: VoiceSessionState = initial;
const listeners = new Set<() => void>();

export function getVoiceSession(): VoiceSessionState {
  return current;
}

export function setVoiceSession(next: VoiceSessionState): void {
  current = next;
  listeners.forEach((listener) => listener());
}

export function resetVoiceSession(): void {
  setVoiceSession(initial);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 자막·안내를 그리는 쪽에서 쓴다. */
export function useVoiceSession(): VoiceSessionState {
  return useSyncExternalStore(subscribe, getVoiceSession, getVoiceSession);
}
