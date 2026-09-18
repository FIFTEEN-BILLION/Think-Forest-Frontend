// 서버 대화 화면(티키와 첫인사·티키와 이야기)이 함께 쓰는 채팅 조각. 기존 채팅 CSS 클래스를 그대로 쓴다.
import { useEffect, useRef } from 'react';
import type { ChatMessage, ChoiceOption } from '../../../api/v1/types';
import { useVillage } from '../state/VillageProvider';
import { MAX_UTTERANCE_SECONDS, useVoiceInput } from '../voice/useVoiceInput';
import type { VoiceInputOptions } from '../voice/useVoiceInput';
import { useReadAloud } from '../voice/useReadAloud';
import { useVoiceSession } from '../voice/session';

/**
 * 마이크 버튼이 부르는 훅. 실시간 스트리밍 음성 인식이 기본 방식이다(명세 20절).
 *
 * 화면 두 곳이 쓰는 모양(`{ listening, listen }`)은 그대로 둔다. 세 번째 인자는 예전 목업의
 * 예시 문장이었는데, 이제 가짜 문장을 흉내 내지 않으므로 쓰지 않는다.
 * 듣는 동안의 자막과 안내는 `ChatThread` 아래쪽 `VoiceSubtitle` 가 그린다.
 */
export function useSpeechInput(
  setText: (text: string) => void,
  onError: (message: string) => void,
  _sample?: string,
  options?: VoiceInputOptions,
) {
  const { listening, listen } = useVoiceInput(setText, onError, options ?? {});
  return { listening, listen };
}

/** 듣는 동안의 임시 자막과 안내. 자막은 화면에만 보이고 저장하지 않는다(명세 20.2). */
export function VoiceSubtitle() {
  const voice = useVoiceSession();
  if (voice.phase === 'idle' || voice.phase === 'done') return null;
  const listening = voice.phase === 'listening';
  const left = Math.max(0, MAX_UTTERANCE_SECONDS - voice.elapsedSeconds);
  return (
    <div
      className="chat-voice-subtitle"
      role="status"
      aria-live="polite"
      style={{
        display: 'grid',
        gap: '0.25rem',
        margin: '0.5rem 0 0',
        padding: '0.6rem 0.9rem',
        borderRadius: '0.9rem',
        background: voice.noticeKind === 'error' ? 'rgba(220,80,80,0.12)' : 'rgba(0,0,0,0.05)',
      }}
    >
      <small style={{ opacity: 0.75 }}>
        {listening ? `● 듣고 있어요 · ${left}초 남았어요` : voice.notice || '준비하고 있어요…'}
      </small>
      {voice.partial && (
        <p style={{ margin: 0, fontWeight: 600 }}>
          <span style={{ opacity: 0.6 }}>{voice.stablePrefix}</span>
          {voice.partial.startsWith(voice.stablePrefix)
            ? voice.partial.slice(voice.stablePrefix.length)
            : voice.partial}
        </p>
      )}
      {listening && voice.noticeKind === 'warning' && <small>{voice.notice}</small>}
    </div>
  );
}

export function ChatThread({
  messages,
  childName,
  pendingText,
  pendingFailed = false,
  thinking,
  variant,
}: {
  messages: readonly ChatMessage[];
  childName: string;
  pendingText?: string | null;
  pendingFailed?: boolean;
  thinking: boolean;
  variant: 'first' | 'talk';
}) {
  const threadRef = useRef<HTMLDivElement | null>(null);
  const { data, toast } = useVillage();
  const { speak, speakingId } = useReadAloud(toast);
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, pendingText, thinking]);
  // 읽어주기는 프로필에서 켠 경우에만, 그리고 아이가 버튼을 눌렀을 때만 소리를 낸다(명세 20.4).
  const readAloud = (messageId: string, text: string) =>
    data.settings.tts ? (
      <button
        type="button"
        className="text-back"
        aria-label={`티키의 말 듣기: ${text.slice(0, 20)}`}
        onClick={() => void speak(messageId, { messageId, text })}
      >
        {speakingId === messageId ? '⏸ 그만 듣기' : '🔊 읽어 주기'}
      </button>
    ) : null;
  const tiki = (key: string, text: string, readable = false) => (
    <div className="chat-message ai-message" key={key}>
      <span className="message-avatar">🌱</span>
      <div>
        <span className="message-name">티키</span>
        {variant === 'first' ? (
          <div className="first-message-copy">
            <p>{text}</p>
          </div>
        ) : (
          <p>{text}</p>
        )}
        {readable && readAloud(key, text)}
      </div>
    </div>
  );
  const child = (key: string, text: string, note?: string) => (
    <div className="chat-message child-message" key={key}>
      <div>
        <span className="message-name">{childName}</span>
        <p>{text}</p>
        {note && <small className="chat-pending-note">{note}</small>}
      </div>
      <span className="message-avatar child-avatar">{childName.slice(0, 1)}</span>
    </div>
  );
  return (
    <div
      className={
        variant === 'first' ? 'first-conversation-thread adaptive-thread' : 'conversation-thread'
      }
      ref={threadRef}
      aria-live="polite"
      aria-busy={thinking}
    >
      {messages.map((message) =>
        message.role === 'ASSISTANT'
          ? tiki(message.id, message.content, true)
          : child(message.id, message.content),
      )}
      {pendingText &&
        child('pending', pendingText, pendingFailed ? '아직 못 보냈어요' : '보내는 중…')}
      {thinking && tiki('thinking', '티키가 생각하는 중이에요…')}
      <VoiceSubtitle />
    </div>
  );
}

export function ChoiceButtons({
  options,
  disabled,
  onChoose,
}: {
  options: readonly ChoiceOption[];
  disabled: boolean;
  onChoose: (optionId: string) => void;
}) {
  const marks = ['A', 'B', 'C', 'D'];
  return (
    <div className="big-choices" role="group" aria-label="생각 고르기">
      {options.map((option, index) => (
        <button
          type="button"
          key={option.id}
          disabled={disabled}
          onClick={() => onChoose(option.id)}
        >
          <strong>{marks[index] ?? index + 1}</strong>
          <p>{option.label}</p>
        </button>
      ))}
    </div>
  );
}

/** 진행 막대. 점수가 아니라 이야기가 얼마나 모였는지만 보여 준다. */
export function ReadinessBar({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="session-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
