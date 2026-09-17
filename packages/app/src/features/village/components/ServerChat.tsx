// 서버 대화 화면(티키와 첫인사·티키와 이야기)이 함께 쓰는 채팅 조각. 기존 채팅 CSS 클래스를 그대로 쓴다.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, ChoiceOption } from '../../../api/v1/types';

type SpeechEvent = { results: ArrayLike<{ 0: { transcript: string } }> };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

/** 브라우저 음성 인식. 지원하지 않는 브라우저에서는 기존처럼 예시 문장을 채운다. */
export function useSpeechInput(
  setText: (text: string) => void,
  onError: (message: string) => void,
  sample: string,
) {
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  useEffect(() => () => recognition.current?.stop(), []);
  const listen = useCallback(() => {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const SpeechRecognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    setListening(true);
    if (!SpeechRecognition) {
      window.setTimeout(() => {
        setText(sample);
        setListening(false);
      }, 1200);
      return;
    }
    const instance = new SpeechRecognition();
    recognition.current = instance;
    instance.lang = 'ko-KR';
    instance.interimResults = true;
    instance.continuous = false;
    instance.onresult = (event) =>
      setText(
        Array.from(event.results)
          .map((result) => result[0].transcript)
          .join(''),
      );
    instance.onend = () => setListening(false);
    instance.onerror = () => {
      setListening(false);
      onError('음성을 듣지 못했어요. 글로 써도 괜찮아요.');
    };
    instance.start();
  }, [listening, onError, sample, setText]);
  return { listening, listen };
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
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, pendingText, thinking]);
  const tiki = (key: string, text: string) => (
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
          ? tiki(message.id, message.content)
          : child(message.id, message.content),
      )}
      {pendingText &&
        child('pending', pendingText, pendingFailed ? '아직 못 보냈어요' : '보내는 중…')}
      {thinking && tiki('thinking', '티키가 생각하는 중이에요…')}
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
