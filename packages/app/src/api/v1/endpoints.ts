// JJCP API v1 도메인 요청 함수. 순수 함수 — client 를 인자로 받는다.

import type { V1Client } from './client';
import type {
  AccountMeResponse,
  AiSource,
  Consent,
  ConsentCreateRequest,
  ConsentDocumentId,
  Consultation,
  ConsultationEligibility,
  ConsultationQuestion,
  ConsultationSummary,
  DataOverview,
  DeletionReason,
  DeletionRequest,
  DeletionScope,
  ExportDetail,
  ExportInclude,
  GuardianChild,
  GuardianInvitation,
  GuardianLink,
  GuardianPermission,
  Job,
  LegalDocument,
  ProfileOut,
  ProfileUpdateRequest,
  ProgressReport,
  ReportSummary,
  RetentionNotice,
  SafetyEventList,
  SettingsResponse,
  SettingsUpdateRequest,
  ShareRequest,
  ShareRequestResponse,
  ShareStatus,
  StoryPreview,
  UnlinkResult,
} from './types';
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
} from './types';
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

// --- F2 책장·단어·공유 ---
// 명세 12·13·14·15·28절. 모양은 실행 중인 서버로 확인했다.
// client.request 는 임의 헤더를 보내지 않으므로 충돌 검사는 본문 `version` 으로 한다.
// 서버는 If-Match 와 본문 version 을 같게 취급하고, 둘 다 없으면 400 INVALID_INPUT 을 준다(확인).

import type {
  BookCreateRequest,
  BookDetail,
  BookPatchRequest,
  BookResponse,
  BookSummary,
  CommunityReportResponse,
  FavoriteResponse,
  PublicStory,
  PublicStoryDetail,
  RecommendationFilter,
  RecommendationResponse,
  ReportReason,
  ShareAudience,
  StoryDetail,
  StoryEdited,
  StoryListQuery,
  StoryPatchRequest,
  StorySummary,
  WordbookEntryResponse,
  WordbookList,
  WordQuiz,
  WordQuizAnswerResponse,
  WordQuizMode,
  WordStatus,
} from './types';

// ---------- 나의 책장 (12절) ----------

export async function listStories(
  client: V1Client,
  query: StoryListQuery = {},
  signal?: AbortSignal,
) {
  return toPage<StorySummary>(
    await client.request<unknown>('/stories', { query: storyListQuery(query), signal }),
    'stories',
  );
}

export function getStoryDetail(client: V1Client, storyId: string, signal?: AbortSignal) {
  return client.request<StoryDetail>(`/stories/${id(storyId)}`, { signal });
}

/** 제목·본문 고치기. `version` 은 지금 화면에 띄운 이야기의 버전이다. */
export function editStory(
  client: V1Client,
  storyId: string,
  patch: StoryPatchRequest,
  version: number,
) {
  return client.request<StoryEdited>(`/stories/${id(storyId)}`, {
    method: 'PATCH',
    body: { ...patch, version },
  });
}

export function setStoryFavorite(client: V1Client, storyId: string, favorite: boolean) {
  return client.request<FavoriteResponse>(`/stories/${id(storyId)}/favorite`, {
    method: favorite ? 'PUT' : 'DELETE',
  });
}

export function deleteStory(client: V1Client, storyId: string) {
  return client.request<void>(`/stories/${id(storyId)}`, { method: 'DELETE' });
}

// ---------- 이야기책 (28절) ----------

export async function listBooks(
  client: V1Client,
  query: { status?: 'DRAFT' | 'COMPLETED'; cursor?: string; limit?: number } = {},
  signal?: AbortSignal,
) {
  return toPage<BookSummary>(await client.request<unknown>('/books', { query, signal }), 'books');
}

export function createBook(
  client: V1Client,
  body: BookCreateRequest,
  idempotencyKey = newIdempotencyKey(),
) {
  return client.request<BookResponse>('/books', { body, idempotencyKey });
}

export function getBook(client: V1Client, bookId: string, signal?: AbortSignal) {
  return client.request<BookResponse>(`/books/${id(bookId)}`, { signal });
}

export function editBook(
  client: V1Client,
  bookId: string,
  patch: BookPatchRequest,
  version: number,
) {
  return client.request<BookResponse>(`/books/${id(bookId)}`, {
    method: 'PATCH',
    body: { ...patch, version },
  });
}

export function addBookStory(client: V1Client, bookId: string, storyId: string, position?: number) {
  return client.request<BookResponse>(`/books/${id(bookId)}/stories`, {
    body: position === undefined ? { storyId } : { storyId, position },
  });
}

export function removeBookStory(client: V1Client, bookId: string, storyId: string) {
  return client.request<BookResponse>(`/books/${id(bookId)}/stories/${id(storyId)}`, {
    method: 'DELETE',
  });
}

export function completeBook(client: V1Client, bookId: string) {
  return client.request<BookResponse>(`/books/${id(bookId)}/complete`, { body: {} });
}

export function deleteBook(client: V1Client, bookId: string) {
  return client.request<void>(`/books/${id(bookId)}`, { method: 'DELETE' });
}

// ---------- 단어 보관함 (13절) ----------

export function getWordbook(
  client: V1Client,
  query: { status?: WordStatus; query?: string; cursor?: string; limit?: number } = {},
  signal?: AbortSignal,
) {
  return client.request<WordbookList>('/wordbook', { query, signal });
}

export function addWordbookEntry(
  client: V1Client,
  body: { word: string; messageId: string; conversationId?: string },
  idempotencyKey = newIdempotencyKey(),
) {
  return client.request<WordbookEntryResponse>('/wordbook/entries', { body, idempotencyKey });
}

export function getWordbookEntry(client: V1Client, entryId: string, signal?: AbortSignal) {
  return client.request<WordbookEntryResponse>(`/wordbook/entries/${id(entryId)}`, { signal });
}

export function editWordbookEntry(
  client: V1Client,
  entryId: string,
  patch: { status?: WordStatus; mySentence?: string | null },
) {
  return client.request<WordbookEntryResponse>(`/wordbook/entries/${id(entryId)}`, {
    method: 'PATCH',
    body: patch,
  });
}

export function deleteWordbookEntry(client: V1Client, entryId: string) {
  return client.request<void>(`/wordbook/entries/${id(entryId)}`, { method: 'DELETE' });
}

/** 퀴즈는 감싸는 키 없이 퀴즈 자체를 돌려준다(서버 확인). */
export function createWordQuiz(
  client: V1Client,
  body: { count?: number; mode?: WordQuizMode; status?: WordStatus } = {},
  idempotencyKey = newIdempotencyKey(),
) {
  return client.request<WordQuiz>('/word-quizzes', { body, idempotencyKey });
}

export function answerWordQuiz(
  client: V1Client,
  quizId: string,
  body: { questionId: string; optionId: string; clientAnsweredAt?: string },
) {
  return client.request<WordQuizAnswerResponse>(`/word-quizzes/${id(quizId)}/answers`, { body });
}

// ---------- 친구들의 이야기 (14절) ----------

export async function listCommunityStories(
  client: V1Client,
  query: {
    category?: string;
    recommendation?: RecommendationFilter;
    cursor?: string;
    limit?: number;
  } = {},
  signal?: AbortSignal,
) {
  return toPage<PublicStory>(
    await client.request<unknown>('/community/stories', { query, signal }),
    'stories',
  );
}

export async function getCommunityStory(
  client: V1Client,
  publicStoryId: string,
  signal?: AbortSignal,
) {
  const body = await client.request<{ story: PublicStoryDetail }>(
    `/community/stories/${id(publicStoryId)}`,
    { signal },
  );
  return body.story;
}

export function setRecommendation(client: V1Client, publicStoryId: string, recommended: boolean) {
  return client.request<RecommendationResponse>(
    `/community/stories/${id(publicStoryId)}/recommendation`,
    { method: recommended ? 'PUT' : 'DELETE' },
  );
}

export function reportCommunityStory(
  client: V1Client,
  publicStoryId: string,
  body: { reason: ReportReason; detail?: string },
) {
  return client.request<CommunityReportResponse>(
    `/community/stories/${id(publicStoryId)}/reports`,
    {
      body,
    },
  );
}

// ---------- 이야기 공유 (15절, 아이 쪽) ----------

export function requestShare(
  client: V1Client,
  storyId: string,
  body: { audience: ShareAudience; hideProfile: boolean },
  idempotencyKey = newIdempotencyKey(),
) {
  return client.request<ShareRequestResponse>(`/stories/${id(storyId)}/share-requests`, {
    body,
    idempotencyKey,
  });
}

export function getShareRequest(client: V1Client, requestId: string, signal?: AbortSignal) {
  return client.request<ShareRequestResponse>(`/share-requests/${id(requestId)}`, { signal });
}

export function cancelShareRequest(client: V1Client, requestId: string) {
  return client.request<ShareRequestResponse>(`/share-requests/${id(requestId)}`, {
    method: 'DELETE',
  });
}

// ---------- 순수 도우미 (화면에서 쓰는 계산·표시 규칙) ----------

/** 빈 값과 false 를 빼서 서버에 보낼 검색 조건만 남긴다. */
export function storyListQuery(
  filters: StoryListQuery,
): Record<string, string | number | undefined> {
  const trimmed = filters.query?.trim();
  return {
    query: trimmed || undefined,
    category: filters.category || undefined,
    favorite: filters.favorite ? 'true' : undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    cursor: filters.cursor || undefined,
    limit: filters.limit,
  };
}

/** 다른 기기에서 먼저 고쳤을 때. 서버 코드는 VERSION_CONFLICT 다(명세에는 이름이 없다). */
export function isVersionConflict(error: unknown): boolean {
  return (
    error instanceof V1Error &&
    error.status === 409 &&
    (error.code === 'VERSION_CONFLICT' || error.code === 'CONFLICT')
  );
}

/** 충돌 응답이 알려 준 서버의 현재 버전. 없으면 null. */
export function conflictVersion(error: unknown): number | null {
  if (!(error instanceof V1Error)) return null;
  const value = error.details?.currentVersion;
  return typeof value === 'number' ? value : null;
}

export const STORY_CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: 'SCIENCE', label: '과학', emoji: '🧪' },
  { key: 'MATH', label: '수학', emoji: '🔢' },
  { key: 'HISTORY', label: '역사', emoji: '🏛️' },
  { key: 'NATURE', label: '자연', emoji: '🌳' },
  { key: 'FEELINGS', label: '마음', emoji: '💛' },
  { key: 'IMAGINATION', label: '상상', emoji: '✨' },
  { key: 'DAILY_LIFE', label: '내 일상', emoji: '🏠' },
  { key: 'THINKING', label: '생각', emoji: '💭' },
];

export function categoryLabel(key?: string | null): string {
  return STORY_CATEGORIES.find((c) => c.key === key)?.label ?? '이야기';
}

export function categoryEmoji(key?: string | null): string {
  return STORY_CATEGORIES.find((c) => c.key === key)?.emoji ?? '📖';
}

/** 기기에만 있는 기록. features 층을 import 하지 않으려고 모양만 받는다. */
export interface LocalShelfRecord {
  id: string;
  title: string;
  text: string;
  date: string;
  favorite: boolean;
  source: 'local' | 'mock';
}

export interface ShelfItem {
  id: string;
  title: string;
  summary: string;
  category: string | null;
  favorite: boolean;
  /** 정렬·표시에 쓰는 날짜(YYYY-MM-DD). */
  date: string;
  /** server = 서버에 저장됨, local = 이 기기에만, sample = 둘러보기용 예시. */
  origin: 'server' | 'local' | 'sample';
  version: number | null;
  href: string;
}

const day = (value: string) => (value.length >= 10 ? value.slice(0, 10) : value);

export function toShelfItem(story: StorySummary): ShelfItem {
  return {
    id: story.id,
    title: story.title,
    summary: story.summary,
    category: story.category,
    favorite: story.favorite,
    date: day(story.updatedAt || story.createdAt),
    origin: 'server',
    version: story.version,
    href: `/shelf/${story.id}`,
  };
}

/** 기기 기록이 서버 검색 조건에 맞는지. 카테고리를 고르면 카테고리가 없는 기기 기록은 빠진다. */
export function localShelfMatches(record: LocalShelfRecord, filters: StoryListQuery): boolean {
  if (filters.category) return false;
  if (filters.favorite && !record.favorite) return false;
  const text = `${record.title} ${record.text}`;
  const needle = filters.query?.trim();
  if (needle && !text.includes(needle)) return false;
  const date = day(record.date);
  if (filters.from && date < filters.from) return false;
  if (filters.to && date > filters.to) return false;
  return true;
}

/** 서버 이야기와 기기 기록을 한 목록으로 합친다. 최근 순, 서버 기록이 먼저. */
export function mergeShelf(
  stories: StorySummary[],
  records: LocalShelfRecord[],
  filters: StoryListQuery = {},
): ShelfItem[] {
  const local = records
    .filter((record) => localShelfMatches(record, filters))
    .map((record): ShelfItem => ({
      id: record.id,
      title: record.title,
      summary: record.text,
      category: null,
      favorite: record.favorite,
      date: day(record.date),
      origin: record.source === 'mock' ? 'sample' : 'local',
      version: null,
      href: `/shelf/${record.id}`,
    }));
  const rank = { server: 0, local: 1, sample: 2 };
  return [...stories.map(toShelfItem), ...local].sort(
    (a, b) => b.date.localeCompare(a.date) || rank[a.origin] - rank[b.origin],
  );
}

export const SHELF_ORIGIN_LABEL: Record<ShelfItem['origin'], string> = {
  server: '티키 서버에 저장',
  local: '이 기기에만 있어요',
  sample: '둘러보기용 예시',
};

/** 서버 이야기 id 인지. 기기 기록과 주소를 같이 쓰므로 여기서 갈린다. */
export function isServerStoryId(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.startsWith('sty_');
}

export const WORD_STATUS: { key: WordStatus; label: string; tone: string }[] = [
  { key: 'NEW', label: '처음 만났어요', tone: 'lavender' },
  { key: 'PRACTICING', label: '연습 중이에요', tone: 'gold' },
  { key: 'FAMILIAR', label: '이제 알아요', tone: 'teal' },
];

export function wordStatusLabel(status: WordStatus): string {
  return WORD_STATUS.find((s) => s.key === status)?.label ?? '단어';
}

export function wordStatusTone(status: WordStatus): string {
  return WORD_STATUS.find((s) => s.key === status)?.tone ?? 'teal';
}

/** 다음 복습 시각을 아이 말로. 점수 대신 이것만 보여 준다. */
export function nextReviewLabel(nextReviewAt: string | null, now = new Date()): string {
  if (!nextReviewAt) return '다시 만날 날은 아직 정하지 않았어요';
  const at = new Date(nextReviewAt);
  if (Number.isNaN(at.getTime())) return '다시 만날 날은 아직 정하지 않았어요';
  const days = Math.ceil((at.getTime() - now.getTime()) / 86400000);
  if (days <= 0) return '오늘 다시 만나 볼까요?';
  if (days === 1) return '내일 다시 만나요';
  return `${days}일 뒤에 다시 만나요`;
}

export const SHARE_AUDIENCE: { key: ShareAudience; label: string; help: string; icon: string }[] = [
  { key: 'FAMILY', label: '가족만', help: '연결된 보호자만 볼 수 있어요', icon: 'heart' },
  { key: 'INVITED', label: '초대한 친구', help: '초대를 받은 사람만 볼 수 있어요', icon: 'user' },
  {
    key: 'PEERS',
    label: '또래 친구',
    help: '보호자가 확인한 뒤 친구들 책장에 올라가요',
    icon: 'book',
  },
];

export function shareAudienceLabel(audience: ShareAudience): string {
  return SHARE_AUDIENCE.find((a) => a.key === audience)?.label ?? '또래 친구';
}

/** 공유 요청 상태를 아이 말로. cancellable 이면 아직 취소할 수 있다. */
export function shareStatusText(status: ShareStatus): {
  label: string;
  help: string;
  cancellable: boolean;
} {
  switch (status) {
    case 'DRAFT':
      return { label: '준비 중', help: '아직 보호자에게 보내지 않았어요.', cancellable: true };
    case 'PENDING_GUARDIAN':
      return {
        label: '보호자가 보는 중',
        help: '보호자 휴대폰으로 갔어요. 읽어 보고 “좋아” 해 주면 친구들이 볼 수 있어요.',
        cancellable: true,
      };
    case 'APPROVED':
      return {
        label: '보호자가 좋다고 했어요',
        help: '곧 친구들 책장에 올라가요.',
        cancellable: false,
      };
    case 'PUBLISHED':
      return {
        label: '친구들이 볼 수 있어요',
        help: '친구들의 이야기에서 만날 수 있어요.',
        cancellable: false,
      };
    case 'REJECTED':
      return {
        label: '조금 더 고쳐 볼까요',
        help: '보호자가 이유를 남겼어요. 고친 뒤 다시 보낼 수 있어요.',
        cancellable: false,
      };
    case 'CANCELLED':
      return { label: '내가 취소했어요', help: '언제든 다시 보낼 수 있어요.', cancellable: false };
    case 'HIDDEN':
    case 'REVOKED':
      return { label: '지금은 숨겨 뒀어요', help: '보호자가 공개를 멈췄어요.', cancellable: false };
    default:
      return { label: '확인 중', help: '상태를 불러오고 있어요.', cancellable: false };
  }
}

export const REPORT_REASONS: { key: ReportReason; label: string }[] = [
  { key: 'SCARY', label: '무서웠어요' },
  { key: 'MEAN_WORDS', label: '나쁜 말이 있어요' },
  { key: 'UNCOMFORTABLE_CONTENT', label: '불편한 내용이에요' },
  { key: 'PERSONAL_INFO', label: '누구인지 알 수 있는 내용이에요' },
  { key: 'COPIED', label: '베낀 것 같아요' },
  { key: 'OTHER', label: '다른 이유예요' },
];

/** 추천 토글을 목록에 바로 반영한다(응답을 기다리지 않는 화면 갱신). */
export function applyRecommendation<
  T extends { id: string; recommendationCount: number; recommendedByMe: boolean },
>(items: T[], storyId: string, recommended: boolean): T[] {
  return items.map((item) => {
    if (item.id !== storyId || item.recommendedByMe === recommended) return item;
    return {
      ...item,
      recommendedByMe: recommended,
      recommendationCount: Math.max(0, item.recommendationCount + (recommended ? 1 : -1)),
    };
  });
}

/** 책 속 이야기 순서 바꾸기. 범위를 벗어나면 그대로 둔다. */
export function reorderStories(storyIds: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= storyIds.length || to >= storyIds.length)
    return storyIds;
  const next = [...storyIds];
  const moved = next.splice(from, 1);
  next.splice(to, 0, ...moved);
  return next;
}

export function bookStoryIds(book: Pick<BookDetail, 'stories'>): string[] {
  return book.stories.map((story) => story.id);
}

// --- F4 음성·알림 ---
// 명세 20·21절. JSON 이 아닌 응답(읽어주기 mp3)과 multipart 업로드(녹음 파일)는
// 공용 client.request 가 다루지 못해 여기서 fetch 를 직접 쓴다. 401 이면 client.refresh() 로 한 번만 되살린다.

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

// --- F3 보호자·설정·기록 ---
// 명세 15(보호자 쪽)·16·17·18·22·23·26·29절. 요청 함수와, 화면이 같이 쓰는 순수 판정 함수.

// ---------- 프로필과 설정 (17절) ----------

/** `/me` 를 프로필 목록까지 받아 읽는다. 기존 getMe 는 모양이 좁아 그대로 둔다. */
export function getAccountMe(client: V1Client, signal?: AbortSignal) {
  return client.request<AccountMeResponse>('/me', { signal });
}

export async function getProfile(client: V1Client, profileId: string, signal?: AbortSignal) {
  const body = await client.request<{ profile: ProfileOut }>(`/profiles/${id(profileId)}`, {
    signal,
  });
  return body.profile;
}

/**
 * 낙관적 잠금. 명세 17절은 `If-Match: "3"` 헤더를 쓰지만, 이 클라이언트는 임의 헤더를 보내지
 * 않으므로 서버가 같이 받는 본문 `version` 을 쓴다. 어긋나면 409 VERSION_CONFLICT.
 */
export async function updateProfile(
  client: V1Client,
  profileId: string,
  body: ProfileUpdateRequest,
  version: number,
) {
  const result = await client.request<{ profile: ProfileOut }>(`/profiles/${id(profileId)}`, {
    method: 'PATCH',
    body: { ...body, version },
  });
  return result.profile;
}

export function getProfileSettings(client: V1Client, profileId: string, signal?: AbortSignal) {
  return client.request<SettingsResponse>(`/profiles/${id(profileId)}/settings`, { signal });
}

/** version 을 주면 설정도 같은 방식으로 충돌을 막는다. */
export function updateProfileSettings(
  client: V1Client,
  profileId: string,
  body: SettingsUpdateRequest,
  version?: number,
) {
  return client.request<SettingsResponse>(`/profiles/${id(profileId)}/settings`, {
    method: 'PATCH',
    body: version === undefined ? body : { ...body, version },
  });
}

// ---------- 약관과 동의 (26절) ----------

export async function listLegalDocuments(client: V1Client, locale = 'ko-KR', signal?: AbortSignal) {
  const body = await client.request<{ items: LegalDocument[] }>('/legal-documents', {
    query: { locale },
    auth: false,
    signal,
  });
  return body.items ?? [];
}

export async function listConsents(client: V1Client, profileId: string, signal?: AbortSignal) {
  const body = await client.request<{ items: Consent[] }>('/consents', {
    query: { profileId },
    signal,
  });
  return body.items ?? [];
}

export async function recordConsents(client: V1Client, body: ConsentCreateRequest) {
  const result = await client.request<{ items: Consent[] }>('/consents', { body });
  return result.items ?? [];
}

export async function revokeConsent(client: V1Client, consentId: string) {
  const body = await client.request<{ consent: Consent }>(`/consents/${id(consentId)}`, {
    method: 'DELETE',
  });
  return body.consent;
}

// ---------- 아이·보호자 연결 (16절) ----------

export async function createGuardianInvitation(
  client: V1Client,
  body: { profileId: string; permissions?: GuardianPermission[]; expiresInMinutes?: number },
) {
  const result = await client.request<{ invitation: GuardianInvitation }>(
    '/guardian-links/invitations',
    { body },
  );
  return result.invitation;
}

export function acceptGuardianInvitation(client: V1Client, token: string) {
  return client.request<{ link: GuardianLink; profile: ProfileOut }>(
    `/guardian-links/invitations/${id(token)}/accept`,
    { method: 'POST', body: {} },
  );
}

export async function listGuardianChildren(client: V1Client, signal?: AbortSignal) {
  const body = await client.request<{ items: GuardianChild[] }>('/guardian/children', { signal });
  return body.items ?? [];
}

export async function listGuardianLinks(
  client: V1Client,
  profileId?: string,
  signal?: AbortSignal,
) {
  const body = await client.request<{ items: GuardianLink[] }>('/guardian-links', {
    query: { profileId },
    signal,
  });
  return body.items ?? [];
}

export async function updateGuardianLink(
  client: V1Client,
  linkId: string,
  permissions: GuardianPermission[],
) {
  const body = await client.request<{ link: GuardianLink }>(`/guardian-links/${id(linkId)}`, {
    method: 'PATCH',
    body: { permissions },
  });
  return body.link;
}

/** 연결만 끊는다. 아이 기록은 지우지 않는다(응답 dataDeleted 로 확인). */
export function deleteGuardianLink(client: V1Client, linkId: string) {
  return client.request<UnlinkResult>(`/guardian-links/${id(linkId)}`, { method: 'DELETE' });
}

// ---------- 공유 승인 (15절 보호자 쪽) ----------

/** status 를 주지 않으면 서버는 확인 대기 건만 준다. 지난 것까지 보려면 'ALL' 을 준다. */
export async function listGuardianShareRequests(
  client: V1Client,
  query: { status?: ShareStatus | 'ALL'; profileId?: string; cursor?: string; limit?: number } = {},
  signal?: AbortSignal,
) {
  const body = await client.request<{ items: ShareRequest[]; nextCursor: string | null }>(
    '/guardian/share-requests',
    { query, signal },
  );
  return { items: body.items ?? [], nextCursor: body.nextCursor ?? null };
}

/** 보호자가 읽은 버전을 반드시 같이 보낸다. 어긋나면 409 SHARE_VERSION_MISMATCH. */
export function approveShareRequest(
  client: V1Client,
  requestId: string,
  confirmedBodyVersion: number,
  profileId?: string,
) {
  return client.request<ShareRequestResponse>(`/guardian/share-requests/${id(requestId)}/approve`, {
    body: { confirmedBodyVersion, confirmedRedactions: true },
    query: { profileId },
  });
}

export function rejectShareRequest(
  client: V1Client,
  requestId: string,
  reason: string,
  profileId?: string,
) {
  return client.request<ShareRequestResponse>(`/guardian/share-requests/${id(requestId)}/reject`, {
    body: { reason },
    query: { profileId },
  });
}

export function revokeShareRequest(
  client: V1Client,
  requestId: string,
  reason?: string,
  profileId?: string,
) {
  return client.request<ShareRequestResponse>(`/guardian/share-requests/${id(requestId)}/revoke`, {
    body: { reason: reason ?? null },
    query: { profileId },
  });
}

/** 승인 전에 공개될 본문을 읽는다. 연결 보호자 계정은 못 읽을 수 있어 null 로 돌려준다. */
export async function getStoryPreview(client: V1Client, storyId: string, signal?: AbortSignal) {
  try {
    const body = await client.request<{ story: StoryPreview }>(`/stories/${id(storyId)}`, {
      signal,
    });
    return body.story ?? null;
  } catch {
    return null;
  }
}

// ---------- 성장 리포트 (18절) ----------

export function getProgressReport(
  client: V1Client,
  query: { profileId?: string; period?: '7d' | '30d' | '90d' },
  signal?: AbortSignal,
) {
  return client.request<ProgressReport>('/reports/progress', { query, signal });
}

export async function createReportSummary(
  client: V1Client,
  body: { profileId?: string; from?: string; to?: string },
  idempotencyKey = newIdempotencyKey(),
) {
  const result = await client.request<{ summary: ReportSummary; reused?: boolean }>(
    '/reports/summaries',
    { body, idempotencyKey },
  );
  return result;
}

export async function getReportSummary(
  client: V1Client,
  summaryId: string,
  profileId?: string,
  signal?: AbortSignal,
) {
  const body = await client.request<{ summary: ReportSummary }>(
    `/reports/summaries/${id(summaryId)}`,
    { query: { profileId }, signal },
  );
  return body.summary;
}

// ---------- 안전 (23절) ----------

export function listSafetyEvents(
  client: V1Client,
  query: { profileId?: string; cursor?: string; limit?: number } = {},
  signal?: AbortSignal,
) {
  return client.request<SafetyEventList>('/guardian/safety-events', { query, signal });
}

// ---------- 보호자 상담 (29절) ----------

export function getConsultationEligibility(
  client: V1Client,
  query: { profileId?: string; period?: string } = {},
  signal?: AbortSignal,
) {
  return client.request<ConsultationEligibility>('/guardian/consultations/eligibility', {
    query,
    signal,
  });
}

export async function listConsultations(
  client: V1Client,
  profileId?: string,
  signal?: AbortSignal,
) {
  const body = await client.request<{ items: ConsultationSummary[] }>('/guardian/consultations', {
    query: { profileId },
    signal,
  });
  return body.items ?? [];
}

export async function createConsultation(
  client: V1Client,
  body: { profileId?: string; period?: string },
  idempotencyKey = newIdempotencyKey(),
) {
  const result = await client.request<{ consultation: Consultation }>('/guardian/consultations', {
    body,
    idempotencyKey,
  });
  return result.consultation;
}

export async function getConsultation(
  client: V1Client,
  consultationId: string,
  profileId?: string,
  signal?: AbortSignal,
) {
  const body = await client.request<{ consultation: Consultation }>(
    `/guardian/consultations/${id(consultationId)}`,
    { query: { profileId }, signal },
  );
  return body.consultation;
}

export async function askConsultationQuestion(
  client: V1Client,
  consultationId: string,
  question: string,
  profileId?: string,
) {
  const body = await client.request<{ question: ConsultationQuestion }>(
    `/guardian/consultations/${id(consultationId)}/questions`,
    { body: { question }, query: { profileId } },
  );
  return body.question;
}

// ---------- 내 데이터 (22절) ----------

export function getDataOverview(client: V1Client, signal?: AbortSignal) {
  return client.request<DataOverview>('/data/overview', { signal });
}

export async function createDataExport(
  client: V1Client,
  body: { profileId?: string; format?: 'JSON'; include?: ExportInclude[] },
  idempotencyKey = newIdempotencyKey(),
) {
  const result = await client.request<{ job: Job }>('/data-exports', { body, idempotencyKey });
  return result.job;
}

export function getDataExport(client: V1Client, exportId: string, signal?: AbortSignal) {
  return client.request<ExportDetail>(`/data-exports/${id(exportId)}`, { signal });
}

export async function createDataDeletionRequest(
  client: V1Client,
  body: { profileId?: string; scope: DeletionScope; confirmation: string; reason?: DeletionReason },
) {
  const result = await client.request<{ request: DeletionRequest }>('/data-deletion-requests', {
    body,
  });
  return result.request;
}

export async function getDataDeletionRequest(
  client: V1Client,
  requestId: string,
  signal?: AbortSignal,
) {
  const body = await client.request<{ request: DeletionRequest }>(
    `/data-deletion-requests/${id(requestId)}`,
    { signal },
  );
  return body.request;
}

export async function cancelDataDeletionRequest(client: V1Client, requestId: string) {
  const body = await client.request<{ request: DeletionRequest }>(
    `/data-deletion-requests/${id(requestId)}/cancel`,
    { body: {} },
  );
  return body.request;
}

export async function createAccountDeletionRequest(
  client: V1Client,
  body: { confirmation: string; reason?: DeletionReason },
) {
  const result = await client.request<{ request: DeletionRequest }>('/account-deletion-requests', {
    body,
  });
  return result.request;
}

export async function getAccountDeletionRequest(
  client: V1Client,
  requestId: string,
  signal?: AbortSignal,
) {
  const body = await client.request<{ request: DeletionRequest }>(
    `/account-deletion-requests/${id(requestId)}`,
    { signal },
  );
  return body.request;
}

export async function cancelAccountDeletionRequest(client: V1Client, requestId: string) {
  const body = await client.request<{ request: DeletionRequest }>(
    `/account-deletion-requests/${id(requestId)}/cancel`,
    { body: {} },
  );
  return body.request;
}

// ---------- 순수 판정·표시 함수 (화면과 테스트가 같이 쓴다) ----------

export const AI_CONSENT_DOCUMENT_ID = 'ai_conversation';

/** 지금 유효한 동의만 남긴다. 같은 문서는 가장 최근 것 하나만 본다. */
export function currentConsents(consents: Consent[]): Map<string, Consent> {
  const map = new Map<string, Consent>();
  for (const consent of consents) {
    const kept = map.get(consent.documentId);
    if (!kept || consent.grantedAt > kept.grantedAt) map.set(consent.documentId, consent);
  }
  for (const [key, consent] of map)
    if (consent.status !== 'GRANTED' || consent.current === false) map.delete(key);
  return map;
}

export function hasConsent(consents: Consent[], documentId: ConsentDocumentId): boolean {
  return currentConsents(consents).has(documentId);
}

/** 말로 답하기 권한도 보호자 동의에서 나온다(`voice_retention`). 서버가 이 기록으로 음성 API 를 연다. */
export const VOICE_CONSENT_DOCUMENT_ID = 'voice_retention';

export type AiMode = 'ai' | 'rule' | 'unknown';
export type VoiceMode = 'on' | 'off' | 'unknown';

/**
 * 아이 대화가 지금 AI 로 가는지 아닌지. 이 앱에서 가장 중요한 스위치다.
 * 로그인/프로필이 없으면 판단할 수 없으니 unknown.
 */
export function aiMode(options: {
  signedIn: boolean;
  profileId: string | null;
  consents: Consent[];
}): AiMode {
  if (!options.signedIn || !options.profileId) return 'unknown';
  return hasConsent(options.consents, AI_CONSENT_DOCUMENT_ID) ? 'ai' : 'rule';
}

export function aiModeLabel(mode: AiMode): string {
  if (mode === 'ai') return 'AI와 이야기해요';
  if (mode === 'rule') return '지금은 준비된 대사로 이야기해요';
  return 'AI 사용 여부를 아직 확인하지 못했어요';
}

/** 말로 답하기가 지금 열려 있는지. 판정 규칙은 AI 스위치와 같다. */
export function voiceMode(options: {
  signedIn: boolean;
  profileId: string | null;
  consents: Consent[];
}): VoiceMode {
  if (!options.signedIn || !options.profileId) return 'unknown';
  return hasConsent(options.consents, VOICE_CONSENT_DOCUMENT_ID) ? 'on' : 'off';
}

export function voiceModeLabel(mode: VoiceMode): string {
  if (mode === 'on') return '말로 답할 수 있어요';
  if (mode === 'off') return '지금은 글로만 답해요';
  return '말로 답하기 여부를 아직 확인하지 못했어요';
}

export function aiSourceLabel(source: AiSource | null | undefined): string {
  if (source === 'ai') return 'AI가 만든 문장';
  if (source === 'fallback') return '준비된 대사';
  return '—';
}

export const PERMISSION_LABELS: Record<GuardianPermission, string> = {
  VIEW_PROFILE: '프로필 보기',
  VIEW_STORIES: '이야기 보기',
  VIEW_REPORTS: '리포트 보기',
  REVIEW_SHARING: '공유 승인하기',
  MANAGE_DATA: '기록 내보내기·삭제',
};

export const ALL_PERMISSIONS: GuardianPermission[] = [
  'VIEW_PROFILE',
  'VIEW_STORIES',
  'VIEW_REPORTS',
  'REVIEW_SHARING',
  'MANAGE_DATA',
];

export function permissionLabel(permission: string): string {
  return PERMISSION_LABELS[permission as GuardianPermission] ?? permission;
}

/** 초대 링크. 보호자가 브라우저에 붙여 넣으면 수락 화면이 열린다. */
export function invitationLink(token: string, origin?: string): string {
  const base = origin ?? (typeof location === 'undefined' ? '' : location.origin);
  return `${base.replace(/\/$/, '')}/guardian/invite/${encodeURIComponent(token)}`;
}

/** 초대 만료까지 남은 시간. 지났으면 null. */
export function minutesUntil(expiresAt: string, now = Date.now()): number | null {
  const left = Math.floor((Date.parse(expiresAt) - now) / 60000);
  return Number.isNaN(left) || left < 0 ? null : left;
}

export function retentionNoticeLines(notice: RetentionNotice | null | undefined): string[] {
  if (!notice) return [];
  const when = notice.deletesNow ? '오늘 정리할 때' : `${notice.effectiveAt.slice(0, 10)}부터`;
  return [
    notice.message,
    `지워지는 것: ${notice.targets.join(', ')}`,
    `적용 시점: ${when} · ${notice.deletesBefore.slice(0, 10)} 이전 기록`,
  ];
}

export const JOB_STATUS_LABELS: Record<string, string> = {
  QUEUED: '기다리는 중',
  RUNNING: '만드는 중',
  SUCCEEDED: '다 됐어요',
  FAILED: '실패했어요',
  CANCELLED: '취소했어요',
};

export function jobStatusLabel(status: string): string {
  return JOB_STATUS_LABELS[status] ?? status;
}

export const SHARE_STATUS_LABELS: Record<ShareStatus, string> = {
  DRAFT: '아이가 쓰는 중',
  PENDING_GUARDIAN: '보호자 확인 기다리는 중',
  APPROVED: '승인함',
  PUBLISHED: '친구들에게 보여요',
  REJECTED: '반려함',
  CANCELLED: '아이가 취소함',
  HIDDEN: '숨김',
  REVOKED: '공개를 멈춤',
};

export function shareStatusLabel(status: ShareStatus): string {
  return SHARE_STATUS_LABELS[status] ?? status;
}

/** 공개 전에 보호자가 꼭 봐야 하는 것들. 승인 화면에 그대로 적는다. */
export function sharePublicScope(request: ShareRequest): string[] {
  const audience =
    request.audience === 'PEERS'
      ? '또래 친구들'
      : request.audience === 'FAMILY'
        ? '연결된 가족'
        : '초대받은 사람';
  return [
    `보는 사람: ${audience}`,
    `이야기 제목과 본문 ${request.requestedBodyVersion}번째 판`,
    request.hideProfile ? '별명은 가리고 올려요' : '아이 별명이 함께 보여요',
    '실명, 학교 이름, 대화 원문 전체는 올라가지 않아요',
  ];
}

/** 409 응답의 details 로 "이야기가 바뀌었다"는 사실을 사람 말로 바꾼다. */
export function shareConflictMessage(details: Record<string, unknown>): string {
  const current = details.currentBodyVersion;
  return typeof current === 'number'
    ? `확인하신 뒤에 아이가 이야기를 고쳤어요. 지금은 ${current}번째 판이에요. 다시 읽고 승인해 주세요.`
    : '확인하신 뒤에 이야기가 바뀌었어요. 다시 불러온 내용을 읽고 승인해 주세요.';
}

/** 403 CONSENT_REQUIRED 의 details.documentIds 를 뽑는다. 동의 화면으로 보내는 데 쓴다. */
export function requiredConsentDocuments(details: Record<string, unknown>): string[] {
  const ids = details.documentIds;
  return Array.isArray(ids)
    ? ids.filter((value): value is string => typeof value === 'string')
    : [];
}

/** 서버 설정을 이 기기 설정(VillageProvider)으로 옮긴다. 로그아웃 상태에서는 기기 설정만 쓴다. */
export function toLocalSettings(settings: {
  ttsEnabled: boolean;
  guardianPreviewEnabled: boolean;
  theme: string;
  retentionDays: number;
}) {
  const retention = [30, 90, 180].includes(settings.retentionDays)
    ? (settings.retentionDays as 30 | 90 | 180)
    : 180;
  return {
    tts: settings.ttsEnabled,
    parentPreview: settings.guardianPreviewEnabled,
    theme: settings.theme.toLowerCase() as 'auto' | 'light' | 'dark',
    retention,
  };
}
