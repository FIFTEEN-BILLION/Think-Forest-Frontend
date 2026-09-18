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

// --- F2 책장·단어·공유 ---
// 명세 12·13·14·15·28절. 모양은 실행 중인 서버로 확인했다.
// client.request 는 임의 헤더를 보내지 않으므로 충돌 검사는 본문 `version` 으로 한다.
// 서버는 If-Match 와 본문 version 을 같게 취급하고, 둘 다 없으면 400 INVALID_INPUT 을 준다(확인).

import { V1Error } from './client';
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
  ShareRequestResponse,
  ShareStatus,
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
