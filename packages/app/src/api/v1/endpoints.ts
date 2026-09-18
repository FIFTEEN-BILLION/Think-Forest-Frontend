// JJCP API v1 도메인 요청 함수. 순수 함수 — client 를 인자로 받는다.

import type { V1Client } from './client';
import { newIdempotencyKey, V1_BASE_URL } from './client';
import type {
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

// --- F4 음성·알림 ---
// 명세 20·21절. JSON 이 아닌 응답(읽어주기 mp3)과 multipart 업로드(녹음 파일)는
// 공용 client.request 가 다루지 못해 여기서 fetch 를 직접 쓴다. 401 이면 client.refresh() 로 한 번만 되살린다.

import type {
  Device,
  DeviceRequest,
  NotificationItem,
  NotificationList,
  NotificationSettings,
  SpeechStreamTicket,
  SpeechStreamTicketRequest,
  SpeechSynthesisRequest,
  SpeechTranscript,
} from './types';
import { parseV1Error, V1Error } from './client';

/** 16kHz mono PCM s16le — 서버가 이 형식만 받는다(명세 20.1). */
export const PCM_AUDIO_FORMAT = { encoding: 'PCM_S16LE', sampleRate: 16000, channels: 1 } as const;

async function rawRequest(
  client: V1Client,
  path: string,
  init: {
    method: string;
    body?: BodyInit;
    accept?: string;
    contentType?: string;
    signal?: AbortSignal;
  },
): Promise<Response> {
  const url = `${client.baseUrl}${path}`;
  const call = (token: string | null) =>
    fetch(url, {
      method: init.method,
      headers: {
        Accept: init.accept ?? 'application/json',
        // FormData 는 브라우저가 boundary 를 붙여야 하므로 Content-Type 을 건드리지 않는다.
        ...(init.contentType ? { 'Content-Type': init.contentType } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body,
      credentials: 'same-origin',
      signal: init.signal,
    });
  let response: Response;
  try {
    response = await call(client.getSession()?.accessToken ?? null);
  } catch (error) {
    if ((error as { name?: string })?.name === 'AbortError') throw error;
    throw new V1Error(0, 'NETWORK_ERROR', '인터넷 연결을 확인해 주세요.');
  }
  if (response.status === 401) {
    const next = await client.refresh().catch(() => null);
    if (!next) throw new V1Error(401, 'UNAUTHORIZED', '다시 로그인해 주세요.');
    response = await call(next.accessToken);
  }
  if (!response.ok)
    throw parseV1Error(
      response.status,
      await response.text().catch(() => ''),
      response.headers?.get?.('X-Request-Id'),
    );
  return response;
}

// ---------- 20. 음성 ----------

/** 1회용 WebSocket 접속권. 끊기면 재사용하지 않고 새로 받는다(명세 20.1·20.3). */
export function createSpeechStreamTicket(
  client: V1Client,
  body: SpeechStreamTicketRequest = {},
  signal?: AbortSignal,
) {
  return client.request<SpeechStreamTicket>('/speech/stream-tickets', {
    method: 'POST',
    body: { locale: 'ko-KR', audio: PCM_AUDIO_FORMAT, ...body },
    signal,
  });
}

/** 스트리밍이 막혔을 때 기기에 남은 녹음을 한 번 보낸다(명세 20.3). */
export async function transcribeRecording(
  client: V1Client,
  recording: Blob,
  fileName = 'speech.webm',
  signal?: AbortSignal,
): Promise<SpeechTranscript> {
  const form = new FormData();
  form.append('file', recording, fileName);
  const response = await rawRequest(client, '/speech/transcriptions', {
    method: 'POST',
    body: form,
    signal,
  });
  return (await response.json()) as SpeechTranscript;
}

/** 티키가 한 말을 읽어 줄 mp3. 저장하지 않고 한 번 듣고 버린다(명세 20.5). */
export async function synthesizeSpeech(
  client: V1Client,
  body: SpeechSynthesisRequest,
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await rawRequest(client, '/speech/synthesis', {
    method: 'POST',
    body: JSON.stringify(body),
    contentType: 'application/json',
    accept: 'audio/mpeg',
    signal,
  });
  return await response.blob();
}

// ---------- 21. 알림과 기기 ----------

export function listNotifications(
  client: V1Client,
  query: { unreadOnly?: boolean; cursor?: string; limit?: number } = {},
  signal?: AbortSignal,
) {
  return client.request<NotificationList>('/notifications', { query, signal });
}

export function markNotificationRead(client: V1Client, notificationId: string) {
  return client.request<{ notification: NotificationItem }>(
    `/notifications/${id(notificationId)}/read`,
    { method: 'POST', body: {} },
  );
}

export function getNotificationSettings(client: V1Client, signal?: AbortSignal) {
  return client.request<{ settings: NotificationSettings }>('/notification-settings', { signal });
}

export function updateNotificationSettings(
  client: V1Client,
  patch: Partial<Omit<NotificationSettings, 'updatedAt'>>,
) {
  return client.request<{ settings: NotificationSettings }>('/notification-settings', {
    method: 'PATCH',
    body: patch,
  });
}

/** 푸시 토큰 등록. 네이티브 셸이 브리지로 토큰을 줄 때만 부른다(명세 21). */
export function registerDevice(client: V1Client, body: DeviceRequest) {
  return client.request<{ device: Device }>('/devices', { method: 'POST', body });
}

export function unregisterDevice(client: V1Client, deviceId: string) {
  return client.request<{ ok: boolean }>(`/devices/${id(deviceId)}`, { method: 'DELETE' });
}
