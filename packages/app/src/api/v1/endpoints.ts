// JJCP API v1 도메인 요청 함수. 순수 함수 — client 를 인자로 받는다.

import type { V1Client } from './client';
import { newIdempotencyKey, V1_BASE_URL, V1Error } from './client';
import type {
  ActivityCompleteResponse,
  ActivityDetail,
  ActivityItem,
  ActivityPatchRequest,
  ActivitySession,
  ActivityStartRequest,
  ActivityTrack,
  MissingCondition,
  TopicCategory,
  TopicCategoryCreateRequest,
  TopicCategoryUpdateRequest,
  TopicCreateRequest,
  TopicCreateResponse,
  TopicDetail,
  TopicListItem,
  CompletionTrigger,
  Story,
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

export function getStory(client: V1Client, storyId: string, signal?: AbortSignal) {
  return client.request<{ story: Story }>(`/stories/${id(storyId)}`, { signal });
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

// --- F1 홈·주제·활동 ---

/** 서버가 409 로 돌려준 단계 조건을 아이에게 보여 줄 문장으로 바꾼다. */
export function stepMissingReasons(error: unknown): string[] {
  if (!(error instanceof V1Error)) return [];
  const conditions = error.details?.conditions;
  if (Array.isArray(conditions)) {
    const messages = conditions
      .map((item) => (item as MissingCondition | null)?.message)
      .filter((message): message is string => Boolean(message));
    if (messages.length) return messages;
  }
  return error.message ? [error.message] : [];
}

// ---------- 주제 ----------

export function getTopic(client: V1Client, topicId: string, signal?: AbortSignal) {
  return client.request<{ topic: TopicDetail }>(`/topics/${id(topicId)}`, { signal });
}

/** 안전하지 않은 주제는 422 `UNSAFE_TOPIC` 으로 거절된다. 저장도 대화 생성도 하지 않는다. */
export function createTopic(
  client: V1Client,
  body: TopicCreateRequest,
  idempotencyKey = newIdempotencyKey(),
) {
  return client.request<TopicCreateResponse>('/topics', { body, idempotencyKey });
}

export async function listTopicPage(
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
  return toPage<TopicListItem>(
    await client.request<unknown>('/topics', { query, signal }),
    'topics',
  );
}

// ---------- 주제 카테고리 ----------

export async function listTopicCategories(client: V1Client, signal?: AbortSignal) {
  return toPage<TopicCategory>(
    await client.request<unknown>('/topic-categories', { signal }),
    'categories',
  );
}

export function createTopicCategory(client: V1Client, body: TopicCategoryCreateRequest) {
  return client.request<{ category: TopicCategory }>('/topic-categories', { body });
}

/** 기본 카테고리를 고치면 403 `CATEGORY_NOT_EDITABLE` 이 온다. */
export function updateTopicCategory(
  client: V1Client,
  categoryId: string,
  body: TopicCategoryUpdateRequest,
) {
  return client.request<{ category: TopicCategory }>(`/topic-categories/${id(categoryId)}`, {
    method: 'PATCH',
    body,
  });
}

export function deleteTopicCategory(client: V1Client, categoryId: string) {
  return client.request<void>(`/topic-categories/${id(categoryId)}`, { method: 'DELETE' });
}

// ---------- 생각 모험 활동 ----------

export async function listActivities(
  client: V1Client,
  query: {
    query?: string;
    track?: ActivityTrack;
    area?: string;
    cursor?: string;
    limit?: number;
  } = {},
  signal?: AbortSignal,
) {
  return toPage<ActivityItem>(
    await client.request<unknown>('/activities', { query, signal }),
    'activities',
  );
}

export function getActivity(client: V1Client, activityId: string, signal?: AbortSignal) {
  return client.request<{ activity: ActivityDetail }>(`/activities/${id(activityId)}`, { signal });
}

// ---------- 활동 세션 ----------

export function startActivitySession(
  client: V1Client,
  body: ActivityStartRequest,
  idempotencyKey = newIdempotencyKey(),
) {
  return client.request<{ session: ActivitySession }>('/activity-sessions', {
    body,
    idempotencyKey,
  });
}

export function getActivitySession(client: V1Client, sessionId: string, signal?: AbortSignal) {
  return client.request<{ session: ActivitySession }>(`/activity-sessions/${id(sessionId)}`, {
    signal,
  });
}

/** 자동 저장. 초안 번호가 어긋나면 409 `ACTIVITY_REVISION_CONFLICT` 가 온다. */
export function patchActivitySession(
  client: V1Client,
  sessionId: string,
  body: ActivityPatchRequest,
) {
  return client.request<{ session: ActivitySession }>(`/activity-sessions/${id(sessionId)}`, {
    method: 'PATCH',
    body,
  });
}

/** 서버가 단계 조건을 다시 검사한다. 부족하면 409 `ACTIVITY_STEP_NOT_READY`. */
export function advanceActivitySession(client: V1Client, sessionId: string) {
  return client.request<{ session: ActivitySession }>(
    `/activity-sessions/${id(sessionId)}/advance`,
    { body: {} },
  );
}

/** 완료하면 서버가 책장 기록을 만든다. */
export function completeActivitySession(
  client: V1Client,
  sessionId: string,
  idempotencyKey = newIdempotencyKey(),
) {
  return client.request<ActivityCompleteResponse>(`/activity-sessions/${id(sessionId)}/complete`, {
    body: {},
    idempotencyKey,
  });
}

export function cancelActivitySession(client: V1Client, sessionId: string) {
  return client.request<void>(`/activity-sessions/${id(sessionId)}`, { method: 'DELETE' });
}
