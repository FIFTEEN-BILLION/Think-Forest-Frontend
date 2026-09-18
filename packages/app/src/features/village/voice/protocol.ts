// 음성 WebSocket 규약(명세 20.2~20.3)과 아이에게 보여 줄 말. 순수 모듈 — node 테스트에서 그대로 부른다.
//
// 흐름: START → PCM 조각 … → PARTIAL_TRANSCRIPT(자막, 저장하지 않음) → STOP → FINAL_TRANSCRIPT(입력창).
// 최종 문장은 절대 자동으로 보내지 않는다. 아이가 확인·수정하고 직접 보낸다.

/** 한 발화의 진행 단계. */
export type VoicePhase =
  | 'idle'
  | 'preparing' // 마이크 허락 받기 · 접속권 받기 · 연결 중
  | 'listening' // 듣는 중(자막이 바뀐다)
  | 'finishing' // STOP 을 보내고 최종 문장을 기다리는 중
  | 'recovering' // 스트리밍이 막혀 녹음한 소리를 파일로 보내는 중
  | 'done'
  | 'error';

export interface VoiceState {
  phase: VoicePhase;
  /** 화면 자막. 저장하지 않고 새 이벤트가 오면 통째로 바꾼다. */
  partial: string;
  /** 서버가 안정적이라고 알려 준 앞부분. */
  stablePrefix: string;
  /** 마지막으로 받은 자막 번호. 이보다 오래된 자막은 버린다. */
  sequence: number;
  /** 아이에게 보여 줄 안내 한 줄(오류·경고 모두). */
  notice: string;
  noticeKind: 'none' | 'hint' | 'warning' | 'error';
  /** 입력창에 넣을 확정 문장. */
  finalText: string;
  /** 마지막 오류 코드. 되살리기(재시도) 판단에 쓴다. */
  errorCode: string | null;
}

export const initialVoiceState: VoiceState = {
  phase: 'idle',
  partial: '',
  stablePrefix: '',
  sequence: 0,
  notice: '',
  noticeKind: 'none',
  finalText: '',
  errorCode: null,
};

// ---------- 서버 → 클라이언트 프레임 ----------

export type ServerFrame =
  | { type: 'PARTIAL_TRANSCRIPT'; sequence: number; text: string; stablePrefix: string }
  | {
      type: 'FINAL_TRANSCRIPT';
      streamId: string;
      text: string;
      confidence: number;
      durationMs: number | null;
    }
  | { type: 'WARNING'; code: string; retryable: boolean; message: string }
  | { type: 'ERROR'; code: string; retryable: boolean; message: string };

const str = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
const num = (value: unknown, fallback = 0) => (typeof value === 'number' ? value : fallback);

/** WebSocket 텍스트 프레임을 읽는다. 모양이 다르면 null(무시). */
export function parseServerFrame(raw: unknown): ServerFrame | null {
  if (typeof raw !== 'string') return null;
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!body || typeof body !== 'object') return null;
  const frame = body as Record<string, unknown>;
  switch (frame.type) {
    case 'PARTIAL_TRANSCRIPT':
      return {
        type: 'PARTIAL_TRANSCRIPT',
        sequence: num(frame.sequence),
        text: str(frame.text),
        stablePrefix: str(frame.stablePrefix),
      };
    case 'FINAL_TRANSCRIPT':
      return {
        type: 'FINAL_TRANSCRIPT',
        streamId: str(frame.streamId),
        text: str(frame.text),
        confidence: num(frame.confidence, 0),
        durationMs: typeof frame.durationMs === 'number' ? frame.durationMs : null,
      };
    case 'WARNING':
    case 'ERROR':
      return {
        type: frame.type,
        code: str(frame.code, 'UNKNOWN'),
        retryable: frame.retryable !== false,
        message: str(frame.message),
      };
    default:
      return null;
  }
}

// ---------- 아이에게 보여 줄 말 ----------

/**
 * 오류마다 서로 다른 말을 보여 준다(명세 20.3: 권한 거부·무음·끊김·서버 지연을 구분한다).
 * 서버 문구가 오면 그대로 쓰되, 여기 있는 코드는 아이 말투로 다시 쓴다.
 */
export const VOICE_MESSAGES: Record<string, string> = {
  // 서버가 보내는 코드
  NO_SPEECH_DETECTED: '목소리가 들리지 않았어요. 마이크에 조금 더 가까이 와서 다시 말해 볼까요?',
  TICKET_INVALID: '연결 시간이 지났어요. 마이크 버튼을 한 번 더 눌러 주세요.',
  UTTERANCE_TOO_LONG: '한 번에 1분까지 들을 수 있어요. 여기까지 들은 말을 적어 둘게요.',
  UTTERANCE_ENDING_SOON: '이제 슬슬 마무리해 볼까요? 곧 그만 들을게요.',
  AI_TEMPORARILY_UNAVAILABLE: '티키 귀가 잠깐 쉬고 있어요. 조금 뒤에 다시 하거나 글로 써도 좋아요.',
  STREAMING_UNAVAILABLE: '지금은 말하면서 바로 받아 적을 수 없어요. 녹음해서 보내 볼게요.',
  SPEECH_UNAVAILABLE: '지금은 음성을 쓸 수 없어요. 글로 말해 주세요.',
  CONSENT_REQUIRED: '보호자가 마이크 사용을 허락해야 들을 수 있어요. 오늘은 글로 써 볼까요?',
  RATE_LIMITED: '오늘은 이야기를 많이 했어요. 내일 또 만나요.',
  UNSUPPORTED_AUDIO: '이 소리 형식은 읽을 수 없어요. 글로 써도 괜찮아요.',
  AUDIO_TOO_LARGE: '녹음이 너무 길어요. 조금 짧게 말해 볼까요?',
  UNSAFE_CONTENT: '이 말은 티키가 들을 수 없어요. 다른 말로 해 볼까요?',
  // 브라우저·기기에서 나는 일
  MIC_DENIED: '마이크를 쓸 수 없어요. 주소창 옆 자물쇠에서 마이크를 허락해 주세요.',
  MIC_MISSING: '마이크를 찾지 못했어요. 글로 써도 괜찮아요.',
  MIC_BUSY: '다른 앱이 마이크를 쓰고 있어요. 그 앱을 끄고 다시 눌러 주세요.',
  MIC_UNSUPPORTED: '이 브라우저는 마이크로 듣기를 지원하지 않아요. 글로 써 주세요.',
  SILENT: '아무 소리도 들리지 않았어요. 마이크가 켜져 있는지 보고 다시 말해 볼까요?',
  DISCONNECTED: '연결이 끊어졌어요. 마이크를 다시 눌러 주세요.',
  NETWORK_ERROR: '인터넷 연결을 확인하고 다시 눌러 주세요.',
  RECORDING_FALLBACK: '녹음한 소리를 티키에게 보내는 중이에요…',
  TYPING_ONLY: '지금은 말로 하기 어려워요. 글로 써도 티키는 잘 들어요.',
};

export function voiceMessage(code: string, serverMessage?: string): string {
  return VOICE_MESSAGES[code] ?? (serverMessage?.trim() || VOICE_MESSAGES.TYPING_ONLY) ?? '';
}

/** 스트리밍이 막혔을 때 녹음 파일로 한 번 더 해 볼 만한 오류인가(명세 20.3). */
export function shouldRetryWithRecording(code: string): boolean {
  return (
    code === 'STREAMING_UNAVAILABLE' ||
    code === 'AI_TEMPORARILY_UNAVAILABLE' ||
    code === 'DISCONNECTED' ||
    code === 'NETWORK_ERROR' ||
    code === 'TICKET_INVALID'
  );
}

// ---------- 상태 기계 ----------

export type VoiceAction =
  | { type: 'PREPARE' }
  | { type: 'OPEN' }
  | { type: 'FRAME'; frame: ServerFrame }
  | { type: 'STOP' }
  | { type: 'RECOVER' }
  | { type: 'LOCAL_ERROR'; code: string; message?: string }
  | { type: 'RECOVERED'; text: string }
  | { type: 'CLOSED' }
  | { type: 'RESET' };

const fail = (state: VoiceState, code: string, message?: string): VoiceState => ({
  ...state,
  phase: 'error',
  partial: '',
  stablePrefix: '',
  notice: voiceMessage(code, message),
  noticeKind: 'error',
  errorCode: code,
});

/**
 * 한 발화의 상태 전이. 부수효과가 없어 그대로 시험할 수 있다.
 * 끝난 뒤(done·error)에 늦게 도착한 프레임은 무시한다.
 */
export function reduceVoice(state: VoiceState, action: VoiceAction): VoiceState {
  switch (action.type) {
    case 'RESET':
      return initialVoiceState;
    case 'PREPARE':
      return {
        ...initialVoiceState,
        phase: 'preparing',
        notice: '마이크를 준비하고 있어요…',
        noticeKind: 'hint',
      };
    case 'OPEN':
      if (state.phase !== 'preparing') return state;
      return {
        ...state,
        phase: 'listening',
        notice: '듣고 있어요. 천천히 말해 보세요.',
        noticeKind: 'hint',
      };
    case 'STOP':
      if (state.phase !== 'listening') return state;
      return { ...state, phase: 'finishing', notice: '받아 적는 중이에요…', noticeKind: 'hint' };
    case 'RECOVER':
      return {
        ...state,
        phase: 'recovering',
        partial: '',
        stablePrefix: '',
        notice: VOICE_MESSAGES.RECORDING_FALLBACK ?? '',
        noticeKind: 'hint',
      };
    case 'RECOVERED':
      return {
        ...initialVoiceState,
        phase: 'done',
        finalText: action.text,
        notice: '들은 말을 적었어요. 고치고 보내도 괜찮아요.',
        noticeKind: 'hint',
      };
    case 'LOCAL_ERROR':
      return fail(state, action.code, action.message);
    case 'CLOSED':
      // 최종 문장을 받기 전에 끊기면 끊김으로 본다. 이미 끝났으면 그대로 둔다.
      if (state.phase === 'listening' || state.phase === 'finishing' || state.phase === 'preparing')
        return fail(state, 'DISCONNECTED');
      return state;
    case 'FRAME':
      return reduceFrame(state, action.frame);
    default:
      return state;
  }
}

function reduceFrame(state: VoiceState, frame: ServerFrame): VoiceState {
  if (state.phase === 'done' || state.phase === 'error' || state.phase === 'idle') return state;
  switch (frame.type) {
    case 'PARTIAL_TRANSCRIPT':
      // 늦게 도착한 오래된 자막은 버린다(명세 20.3).
      if (frame.sequence <= state.sequence) return state;
      return {
        ...state,
        phase: state.phase === 'preparing' ? 'listening' : state.phase,
        sequence: frame.sequence,
        partial: frame.text,
        stablePrefix: frame.stablePrefix,
      };
    case 'FINAL_TRANSCRIPT':
      if (!frame.text.trim()) return fail(state, 'NO_SPEECH_DETECTED');
      return {
        ...state,
        phase: 'done',
        partial: '',
        stablePrefix: '',
        finalText: frame.text.trim(),
        notice: '들은 말을 적었어요. 고치고 보내도 괜찮아요.',
        noticeKind: 'hint',
        errorCode: null,
      };
    case 'WARNING':
      return {
        ...state,
        notice: voiceMessage(frame.code, frame.message),
        noticeKind: 'warning',
      };
    case 'ERROR':
      return fail(state, frame.code, frame.message);
    default:
      return state;
  }
}

/** 접속권과 WebSocket 주소를 합친다. 접속권은 한 번만 쓰고 다시 쓰지 않는다(명세 20.1). */
export function streamSocketUrl(webSocketUrl: string, ticket: string): string {
  const separator = webSocketUrl.includes('?') ? '&' : '?';
  return `${webSocketUrl}${separator}ticket=${encodeURIComponent(ticket)}`;
}
