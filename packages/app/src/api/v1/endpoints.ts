// JJCP API v1 도메인 요청 함수. 순수 함수 — client 를 인자로 받는다.

import type { V1Client } from './client';
import { newIdempotencyKey, V1_BASE_URL } from './client';
import type {
  CompletionTrigger,
  ConversationCompletion,
  ConversationDetail,
  ConversationListItem,
  ConversationMessageResponse,
  DevLoginRequest,
  FirstGreetingCompletion,
  FirstGreetingMessageResponse,
  FirstGreetingSession,
  HomeResponse,
  MeResponse,
  Page,
  SendMessageRequest,
  SessionStatus,
  StartConversationRequest,
  StartConversationResponse,
  Topic,
  TokenResponse,
} from './types';

const id = (value: string) => encodeURIComponent(value);

/** 목록 응답을 Page 로 맞춘다. 명세에 키 이름이 없어 items 우선, 도메인 키(topics 등)나 배열도 받는다. */
export function toPage<T>(raw: unknown, key: string): Page<T> {
  if (Array.isArray(raw)) return { items: raw as T[], nextCursor: null };
  const body = (raw ?? {}) as Record<string, unknown>;
  const items = Array.isArray(body.items) ? body.items : Array.isArray(body[key]) ? body[key] : [];
  return {
    items: items as T[],
    nextCursor: typeof body.nextCursor === 'string' ? body.nextCursor : null,
  };
}

// ---------- 인증 ----------

/** 웹 카카오 로그인 시작 주소. 전체 페이지 이동으로 연다. */
export function kakaoAuthorizeUrl(returnTo: string, baseUrl = V1_BASE_URL) {
  return `${baseUrl.replace(/\/$/, '')}/auth/kakao/authorize?returnTo=${encodeURIComponent(returnTo)}`;
}

export async function devLogin(client: V1Client, body: DevLoginRequest) {
  const token = await client.request<TokenResponse>('/auth/dev/login', { body, auth: false });
  return client.acceptTokens(token);
}

export async function logout(client: V1Client) {
  try {
    await client.request<{ ok: boolean }>('/auth/logout', { body: { logoutFromKakao: false } });
  } finally {
    client.clearSession();
  }
}

export function getMe(client: V1Client, signal?: AbortSignal) {
  return client.request<MeResponse>('/me', { signal });
}

export function getHome(client: V1Client, signal?: AbortSignal) {
  return client.request<HomeResponse>('/home', { signal });
}

// ---------- 주제 ----------

export async function listTopics(
  client: V1Client,
  query: {
    recommended?: boolean;
    category?: string;
    query?: string;
    cursor?: string;
    limit?: number;
  },
  signal?: AbortSignal,
) {
  return toPage<Topic>(await client.request<unknown>('/topics', { query, signal }), 'topics');
}

// ---------- 티키와 첫인사 ----------

export function startFirstGreeting(client: V1Client, idempotencyKey = newIdempotencyKey()) {
  return client.request<FirstGreetingSession>('/first-greeting/sessions', {
    method: 'POST',
    idempotencyKey,
  });
}

export function getFirstGreeting(client: V1Client, sessionId: string, signal?: AbortSignal) {
  return client.request<FirstGreetingSession>(`/first-greeting/sessions/${id(sessionId)}`, {
    signal,
  });
}

export function sendFirstGreetingMessage(
  client: V1Client,
  sessionId: string,
  body: SendMessageRequest,
) {
  return client.request<FirstGreetingMessageResponse>(
    `/first-greeting/sessions/${id(sessionId)}/messages`,
    { body },
  );
}

export function completeFirstGreeting(
  client: V1Client,
  sessionId: string,
  trigger: CompletionTrigger = 'BUTTON',
  idempotencyKey = newIdempotencyKey(),
) {
  return client.request<FirstGreetingCompletion>(
    `/first-greeting/sessions/${id(sessionId)}/complete`,
    { body: { trigger }, idempotencyKey },
  );
}

// ---------- 티키와 이야기 ----------

export async function listConversations(
  client: V1Client,
  query: { status?: SessionStatus[]; cursor?: string; limit?: number },
  signal?: AbortSignal,
) {
  const raw = await client.request<unknown>('/conversations', {
    query: { status: query.status?.join(','), cursor: query.cursor, limit: query.limit },
    signal,
  });
  return toPage<ConversationListItem>(raw, 'conversations');
}

export function startConversation(
  client: V1Client,
  body: StartConversationRequest,
  idempotencyKey = newIdempotencyKey(),
) {
  return client.request<StartConversationResponse>('/conversations', { body, idempotencyKey });
}

export function getConversation(
  client: V1Client,
  conversationId: string,
  query: { messageCursor?: string; limit?: number } = {},
  signal?: AbortSignal,
) {
  return client.request<ConversationDetail>(`/conversations/${id(conversationId)}`, {
    query,
    signal,
  });
}

export function sendConversationMessage(
  client: V1Client,
  conversationId: string,
  body: SendMessageRequest,
) {
  return client.request<ConversationMessageResponse>(
    `/conversations/${id(conversationId)}/messages`,
    { body },
  );
}

export function completeConversation(
  client: V1Client,
  conversationId: string,
  trigger: CompletionTrigger = 'BUTTON',
  idempotencyKey = newIdempotencyKey(),
) {
  return client.request<ConversationCompletion>(`/conversations/${id(conversationId)}/complete`, {
    body: { trigger },
    idempotencyKey,
  });
}

/** 응답 모양은 명세에 없다. 상태만 쓰므로 느슨하게 받는다(가정). */
export function cancelConversation(
  client: V1Client,
  conversationId: string,
  idempotencyKey = newIdempotencyKey(),
) {
  return client.request<{ status?: SessionStatus } | undefined>(
    `/conversations/${id(conversationId)}/cancel`,
    { body: {}, idempotencyKey },
  );
}
