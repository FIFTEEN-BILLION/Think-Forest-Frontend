// 서버 채팅 화면(첫인사·이야기)이 함께 쓰는 순수 상태 도우미. React 에 의존하지 않는다.

import { V1Error } from './client';
import type {
  AuthUser,
  ChatMessage,
  ConversationReadiness,
  Dimension,
  FirstGreetingCompletion,
  FirstGreetingField,
  FirstGreetingReadiness,
  NextInteraction,
  ProfileDraft,
  SendMessageRequest,
  SessionStatus,
} from './types';

/** id 로 중복을 없애며 합친다. 이미 있는 메시지는 제자리에서 새 값으로 바꾸고, 새 메시지는 순서대로 뒤에 붙인다. */
export function mergeMessages(
  current: readonly ChatMessage[],
  incoming: readonly (ChatMessage | null | undefined)[],
): ChatMessage[] {
  const next = [...current];
  const index = new Map(next.map((message, i) => [message.id, i]));
  for (const message of incoming) {
    if (!message?.id) continue;
    const at = index.get(message.id);
    if (at === undefined) {
      index.set(message.id, next.length);
      next.push(message);
    } else next[at] = message;
  }
  return next;
}

export const isOpenStatus = (status: SessionStatus) =>
  status === 'ACTIVE' || status === 'READY_TO_FINISH';

/** 완료 버튼은 서버가 준비됐다고 알려 줄 때만 켠다. */
export const canFinish = (
  readiness: Pick<ConversationReadiness | FirstGreetingReadiness, 'ready'> | null | undefined,
  status: SessionStatus,
) => Boolean(readiness?.ready) && isOpenStatus(status);

/** 진행 막대용 값(0~100 정수). 점수로 보여 주지 않는다. */
export function progressValue(readiness: { progress?: number } | null | undefined) {
  const value = Number(readiness?.progress ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
}

export type AnswerDraft = { text: string } | { optionId: string };

/** 현재 질문 형식에 맞는 메시지 요청을 만든다. 보낼 수 없는 답이면 null. */
export function buildMessageRequest(
  clientMessageId: string,
  interaction: NextInteraction | null | undefined,
  answer: AnswerDraft,
): SendMessageRequest | null {
  const questionId = interaction?.questionId || undefined;
  if ('optionId' in answer) {
    if (interaction?.type !== 'SINGLE_CHOICE' || !questionId) return null;
    if (!interaction.options.some((option) => option.id === answer.optionId)) return null;
    return {
      clientMessageId,
      questionId,
      input: { type: 'SINGLE_CHOICE', optionId: answer.optionId },
    };
  }
  const text = answer.text.trim();
  if (!text) return null;
  return {
    clientMessageId,
    ...(questionId ? { questionId } : {}),
    input: { type: 'TEXT', text },
  };
}

export type SendFailureKind =
  | 'reload' // 질문이 바뀌었거나 세션이 없다 → 서버 상태를 다시 불러온다
  | 'retry' // AI 일시 실패·네트워크 → 같은 clientMessageId 로 다시 보낸다
  | 'wait' // 요청이 너무 많다 → 잠시 뒤 같은 id 로 다시 보낸다
  | 'unsafe' // 안전 정책 → 안내하고 입력은 남긴다
  | 'notReady' // 완료 조건 부족
  | 'signin' // 로그인 필요
  | 'error';

export function classifySendError(error: unknown): { kind: SendFailureKind; message: string } {
  if (!(error instanceof V1Error))
    return { kind: 'error', message: '티키가 답하지 못했어요. 다시 시도해 주세요.' };
  const { code, status } = error;
  if (code === 'QUESTION_MISMATCH' || code === 'SESSION_NOT_FOUND' || status === 404)
    return { kind: 'reload', message: '대화를 새로 불러왔어요. 지금 질문에 다시 답해 줘!' };
  if (code === 'UNSAFE_CONTENT' || status === 422)
    return {
      kind: 'unsafe',
      message: error.message || '그 이야기는 티키가 도와주기 어려워요. 다른 말로 해 볼까?',
    };
  if (code.endsWith('_NOT_READY'))
    return { kind: 'notReady', message: error.message || '조금 더 이야기한 뒤 마칠 수 있어요.' };
  if (status === 401) return { kind: 'signin', message: '다시 로그인해 주세요.' };
  if (status === 429)
    return { kind: 'wait', message: '티키가 잠깐 숨을 고르고 있어요. 조금 뒤 다시 보내 줘.' };
  if (code === 'AI_TEMPORARILY_UNAVAILABLE' || status === 503 || status === 0)
    return { kind: 'retry', message: '티키가 잠깐 생각에 빠졌어요. 같은 말을 다시 보내 볼게요.' };
  return { kind: 'error', message: error.message || '티키가 답하지 못했어요.' };
}

// ---------- 표시 문구 ----------

export const FIRST_GREETING_FIELDS: readonly { key: FirstGreetingField; label: string }[] = [
  { key: 'NICKNAME', label: '별명' },
  { key: 'GRADE_OR_AGE', label: '학년·나이' },
  { key: 'INTEREST', label: '좋아하는 것' },
  { key: 'INTEREST_DETAIL', label: '좋아하는 까닭' },
  { key: 'GROWTH_GOAL', label: '키우고 싶은 힘' },
];

/** 아이에게 보이는 생각 단계 이름. 점수나 평가 표현을 쓰지 않는다. */
export const DIMENSIONS: readonly { key: Dimension; label: string; emoji: string }[] = [
  { key: 'EXPERIENCE', label: '내가 본 것', emoji: '👀' },
  { key: 'IDEA', label: '내 생각', emoji: '💡' },
  { key: 'REASON', label: '그렇게 생각한 까닭', emoji: '🔍' },
  { key: 'ALTERNATIVE', label: '다른 가능성', emoji: '🔀' },
  { key: 'REFLECTION', label: '달라진 생각', emoji: '🌱' },
];

/** 첫인사에서 지금까지 티키가 기억한 내용을 칩으로 보여 줄 목록. */
export function profileDraftChips(draft: ProfileDraft | null | undefined) {
  if (!draft) return [];
  const chips: { key: string; label: string; value: string }[] = [];
  if (draft.nickname) chips.push({ key: 'nickname', label: '별명', value: draft.nickname });
  const grade = [draft.schoolOrGroup, draft.gradeOrAgeBand].filter(Boolean).join(' ');
  if (grade) chips.push({ key: 'grade', label: '학년·나이', value: grade });
  draft.interests.forEach((value, i) =>
    chips.push({ key: `interest-${i}`, label: '좋아하는 것', value }),
  );
  draft.interestDetails.forEach((value, i) =>
    chips.push({ key: `detail-${i}`, label: '좋아하는 까닭', value }),
  );
  if (draft.growthGoal)
    chips.push({ key: 'goal', label: '키우고 싶은 힘', value: draft.growthGoal });
  return chips;
}

type LocalProfile = { name: string; grade: string; interests: string[]; goal: string };

/** 첫인사 완료 프로필을 기존 로컬 프로필(VillageData.profile) 모양으로 옮긴다. 빈 값은 이전 값을 둔다. */
export function toLocalProfile(
  profile: FirstGreetingCompletion['profile'],
  previous: LocalProfile,
): LocalProfile {
  const interests = [...profile.interests, ...profile.interestDetails].filter(Boolean);
  return {
    name: profile.nickname || previous.name,
    grade: profile.gradeOrAgeBand || previous.grade,
    interests: interests.length ? interests : previous.interests,
    goal: profile.growthGoal || previous.goal,
  };
}

// ---------- 로그인 이동 ----------

/** 같은 사이트 안의 상대 경로만 허용한다. 로그인 화면 자신으로는 돌아가지 않는다. */
export function safeReturnTo(value: string | null | undefined, fallback = '/') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\'))
    return fallback;
  if (/^\/login(?:[/?#]|$)/.test(value) || value.startsWith('/api/')) return fallback;
  return value;
}

/**
 * `/login?returnTo=...&loginError=...` 을 읽는다. 서버가 returnTo 뒤에 `?loginError=` 를
 * 그대로 이어 붙여도(`returnTo=%2Ftalk?loginError=X`) 오류 코드를 찾는다.
 */
export function parseLoginParams(search: string) {
  const params = new URLSearchParams(search);
  let returnTo = params.get('returnTo') ?? '';
  let loginError = params.get('loginError');
  const nested = returnTo.match(/[?&]loginError=([^&#]*)/);
  if (nested) {
    loginError ??= decodeURIComponent(nested[1] ?? '');
    returnTo = returnTo.replace(/[?&]loginError=[^&#]*/, '').replace(/[?&]$/, '');
  }
  return { returnTo: safeReturnTo(returnTo), loginError: loginError || null };
}

/** 로그인 뒤 갈 곳. 첫인사가 필요하면 첫인사로 먼저 보낸다. */
export function postLoginPath(user: Pick<AuthUser, 'needsFirstGreeting'>, returnTo: string) {
  const target = safeReturnTo(returnTo);
  if (!user.needsFirstGreeting || target.startsWith('/first-talk')) return target;
  return target === '/' ? '/first-talk' : `/first-talk?next=${encodeURIComponent(target)}`;
}

export const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  AUTH_PROVIDER_UNAVAILABLE: '카카오 로그인을 잠시 쓸 수 없어요. 조금 뒤 다시 해 주세요.',
  ACCESS_DENIED: '카카오 로그인을 취소했어요.',
};

export const loginErrorMessage = (code: string | null) =>
  code ? (LOGIN_ERROR_MESSAGES[code] ?? '로그인하지 못했어요. 다시 시도해 주세요.') : '';
