// JJCP API v1 계약 타입. API_SPEC.md(2·3·4·5·7·10·11·12절)와 구현 보충 결정 문서를 그대로 옮긴다.
// 명세에 글자 그대로 없는 부분은 "가정"이라고 적어 둔다.

import type { GreetingProcessing } from './greeting';

// ---------- 공통 ----------

export type SessionStatus = 'ACTIVE' | 'READY_TO_FINISH' | 'FINALIZING' | 'COMPLETED' | 'CANCELLED';
export type UserRole = 'CHILD' | 'GUARDIAN' | 'GUEST' | (string & {});
export type CompletionTrigger = 'BUTTON' | 'CHAT_END_INTENT';

export interface V1ErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
    requestId?: string | null;
  };
}

export interface ChoiceOption {
  id: string;
  label: string;
}

export interface NextInteraction {
  type: 'TEXT' | 'SINGLE_CHOICE';
  questionId: string;
  options: ChoiceOption[];
}

export type MessageAnswer =
  | { type: 'TEXT'; text?: string }
  | { type: 'SINGLE_CHOICE'; optionId: string; options?: ChoiceOption[] };

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  answer?: MessageAnswer | null;
  createdAt?: string;
}

export type MessageInput =
  { type: 'TEXT'; text: string } | { type: 'SINGLE_CHOICE'; optionId: string };

export interface SendMessageRequest {
  clientMessageId: string;
  /** 첫인사는 명세 예시에 없지만 서버가 무시해도 되므로 있으면 보낸다. */
  questionId?: string;
  input: MessageInput;
}

// ---------- 인증 ----------

export interface AuthUser {
  id: string;
  role: UserRole;
  needsFirstGreeting: boolean;
}

/** refresh·개발용 로그인 응답. 웹(쿠키 방식)은 refreshToken 이 없다. */
export interface TokenResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
  refreshExpiresIn: number;
  user: AuthUser;
}

export interface KakaoExchangeRequest {
  code: string;
  state: string;
  redirectUri: string;
}

export interface KakaoExchangeResponse extends TokenResponse {
  returnTo: string;
}

export interface DevLoginRequest {
  deviceKey: string;
  nickname?: string;
}

export interface MeResponse {
  user: AuthUser;
  profile: {
    id: string;
    nickname: string | null;
    gradeOrAgeBand: string | null;
    interests: string[];
    growthGoal: string | null;
  } | null;
}

// ---------- 티키와 첫인사 ----------

export type FirstGreetingField =
  'NICKNAME' | 'GRADE_OR_AGE' | 'INTEREST' | 'INTEREST_DETAIL' | 'GROWTH_GOAL';

export interface ProfileDraft {
  nickname: string | null;
  schoolOrGroup: string | null;
  gradeOrAgeBand: string | null;
  interests: string[];
  interestDetails: string[];
  growthGoal: string | null;
}

export interface FirstGreetingReadiness {
  ready: boolean;
  progress: number;
  missing: FirstGreetingField[];
}

/** POST /first-greeting/sessions 응답. GET 상세도 같은 모양이라고 가정한다(nextCursor·currentInteraction 선택). */
export interface FirstGreetingSession {
  sessionId: string;
  status: SessionStatus;
  messages: ChatMessage[];
  profileDraft: ProfileDraft;
  readiness: FirstGreetingReadiness;
  processing?: GreetingProcessing | null;
  profileRevision: number;
  deferredFields: string[];
  currentInteraction?: NextInteraction | null;
  nextCursor?: string | null;
}

export interface FirstGreetingCompletion {
  status: 'COMPLETED';
  profile: {
    nickname: string | null;
    gradeOrAgeBand: string | null;
    interests: string[];
    interestDetails: string[];
    growthGoal: string | null;
  };
  summary: string;
  completedAt: string;
}

export interface FirstGreetingMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  nextInteraction: NextInteraction | null;
  profileDraft: ProfileDraft;
  readiness: FirstGreetingReadiness;
  processing?: GreetingProcessing | null;
  profileRevision: number;
  deferredFields: string[];
  status: SessionStatus;
  endIntentDetected: boolean;
  completion?: FirstGreetingCompletion | null;
}

// ---------- 티키와 이야기 ----------

export type Dimension = 'EXPERIENCE' | 'IDEA' | 'REASON' | 'ALTERNATIVE' | 'REFLECTION';

export interface ConversationReadiness {
  ready: boolean;
  progress: number;
  coveredDimensions: Dimension[];
  missingDimensions: Dimension[];
}

export interface TopicSummary {
  id: string;
  title: string;
  category: string;
}

export interface Topic extends TopicSummary {
  source?: 'SYSTEM' | 'USER' | (string & {});
  /** 목록 응답의 추가 필드는 명세에 없다. 있으면 표시에 쓴다(가정). */
  question?: string | null;
  estimatedMinutes?: number | null;
}

export interface StartConversationRequest {
  topicId: string;
  inputMode: 'TEXT' | 'VOICE';
  locale: string;
}

export interface StartConversationResponse {
  conversationId: string;
  status: SessionStatus;
  topic: TopicSummary;
  assistantMessage: ChatMessage;
  nextInteraction: NextInteraction | null;
  readiness: ConversationReadiness;
}

/** GET /conversations/{id}. topic 은 명세 5절 예시에 없어 선택으로 둔다(가정). */
export interface ConversationDetail {
  conversationId: string;
  status: SessionStatus;
  topic?: TopicSummary | null;
  messages: ChatMessage[];
  nextCursor: string | null;
  currentInteraction: NextInteraction | null;
  readiness: ConversationReadiness;
  story?: Story | null;
  // 완료된 대화는 정리본 id 만 내려온다. 본문은 GET /stories/{id} 로 읽는다.
  storyId?: string | null;
}

export interface ConversationMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  nextInteraction: NextInteraction | null;
  readiness: ConversationReadiness;
  status: SessionStatus;
  endIntentDetected: boolean;
  completion?: ConversationCompletion | null;
}

export interface ThoughtJourney {
  initialIdea: string;
  evidence: string[];
  alternatives: string[];
  finalReflection: string;
}

export interface Story {
  id: string;
  title: string;
  summary: string;
  body: string;
  thoughtJourney: ThoughtJourney;
  createdAt: string;
}

export interface ConversationCompletion {
  status: 'COMPLETED';
  story: Story;
}

/** GET /conversations 목록 항목. 명세에 모양이 없어 최소 필드만 가정한다. */
export interface ConversationListItem {
  conversationId: string;
  status: SessionStatus;
  topic?: TopicSummary | null;
  title?: string | null;
  updatedAt?: string | null;
}

/** 목록 응답. 명세 27절(cursor·limit·nextCursor) 기준, 항목 키는 items 로 가정한다. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

// ---------- 홈 ----------

export interface HomeRecommendation {
  topicId: string;
  title: string;
  category: string;
  reason: string;
  estimatedMinutes: number;
}

export interface HomeResponse {
  profile: { nickname: string | null; needsFirstGreeting: boolean };
  recommendations: HomeRecommendation[];
  resume: { conversationId: string; title: string; updatedAt: string } | null;
  recentWords: unknown[];
  communityStories: unknown[];
  weeklyActivity: { conversationDays: number; completedStories: number };
}

// --- F2 책장·단어·공유 ---
// API_SPEC_V2.md 12·13·14·15·28절. 모양은 실행 중인 서버(`/openapi.json`)로 확인했다.

export type StoryCategory =
  | 'SCIENCE'
  | 'MATH'
  | 'HISTORY'
  | 'THINKING'
  | 'DAILY_LIFE'
  | 'NATURE'
  | 'FEELINGS'
  | 'IMAGINATION';

/** GET /stories 목록 항목. 본문(body)은 상세에만 있다. */
export interface StorySummary {
  id: string;
  title: string;
  summary: string;
  category: string;
  favorite: boolean;
  version: number;
  sourceConversationId: string;
  createdAt: string;
  updatedAt: string;
}

/** 서버 이야기 전문. 명세 12절 + 대화 완료 응답과 같은 모양. */
export interface StoryFull extends StorySummary {
  body: string;
  thoughtJourney: ThoughtJourney;
  topic: { id: string | null; title: string; category: string };
}

export interface WordUsed {
  id: string;
  word: string;
  meaning: string;
  status: WordStatus;
}

export interface SourceConversation {
  conversationId: string;
  topic: { id: string | null; title: string; category: string };
  status: string;
  messageCount: number;
  startedAt: string;
  completedAt: string | null;
}

/** GET /stories/{id} */
export interface StoryDetail {
  story: StoryFull;
  wordsUsed: WordUsed[];
  sourceConversation: SourceConversation | null;
}

/** PATCH /stories/{id}. edited=false 면 바뀐 내용이 없어 버전이 그대로다. */
export interface StoryEdited {
  story: StoryFull;
  edited: boolean;
}

export interface StoryPatchRequest {
  title?: string;
  summary?: string;
  body?: string;
  version?: number;
}

/** PUT·DELETE /stories/{id}/favorite */
export interface FavoriteResponse {
  story: { id: string; favorite: boolean; version: number; updatedAt: string };
}

export interface StoryListQuery {
  query?: string;
  category?: string;
  favorite?: boolean;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

// ---------- 이야기책 (28절) ----------

export type BookStatus = 'DRAFT' | 'COMPLETED';

export interface BookCover {
  theme?: string | null;
  emoji?: string | null;
}

export interface BookSummary {
  id: string;
  title: string;
  introduction: string;
  cover: BookCover | null;
  status: BookStatus;
  storyCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface BookDetail extends BookSummary {
  introductionSource?: 'ai' | 'fallback' | null;
  stories: StorySummary[];
}

export interface BookResponse {
  book: BookDetail;
}

export interface BookCreateRequest {
  title: string;
  storyIds?: string[];
  generateIntroduction?: boolean;
  cover?: BookCover | null;
}

export interface BookPatchRequest {
  title?: string;
  introduction?: string;
  cover?: BookCover | null;
  /** 순서 바꾸기: 수록 이야기 전체를 원하는 차례로 보낸다. */
  storyIds?: string[];
  version?: number;
}

// ---------- 단어 보관함 (13절) ----------

export type WordStatus = 'NEW' | 'PRACTICING' | 'FAMILIAR';
export type WordQuizMode = 'MEANING_TO_WORD' | 'WORD_TO_MEANING' | 'FILL_IN_BLANK';

export interface WordbookEntry {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  example: string;
  mySentence: string | null;
  status: WordStatus;
  source: { conversationId: string | null; messageId: string | null };
  meaningSource: 'ai' | 'fallback';
  sourceSentence: string;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 점수가 아니라 상태 개수다. 화면에서도 점수처럼 보이지 않게 쓴다. */
export interface WordbookSummary {
  total: number;
  familiar: number;
  practicing: number;
  new: number;
  newThisWeek: number;
  dueForReview: number;
}

export interface WordbookList {
  summary: WordbookSummary;
  items: WordbookEntry[];
  nextCursor: string | null;
}

export interface WordbookEntryResponse {
  entry: WordbookEntry;
}

export interface WordQuizQuestion {
  id: string;
  index: number;
  prompt: string;
  options: ChoiceOption[];
  answered: boolean;
}

/** POST /word-quizzes 응답은 감싸는 키 없이 퀴즈 자체를 준다(서버 확인). */
export interface WordQuiz {
  id: string;
  mode: WordQuizMode;
  status: 'IN_PROGRESS' | 'COMPLETED';
  questionCount: number;
  answeredCount: number;
  questions: WordQuizQuestion[];
  createdAt: string;
  completedAt: string | null;
}

export interface WordQuizAnswerResponse {
  result: { questionId: string; correct: boolean; correctOptionId: string };
  entry: WordbookEntry;
  quiz: {
    id: string;
    status: 'IN_PROGRESS' | 'COMPLETED';
    questionCount: number;
    answeredCount: number;
  };
}

// ---------- 친구들의 이야기 (14절) ----------

export type RecommendationFilter = 'SIMILAR_AGE' | 'SAME_CATEGORY' | 'POPULAR' | 'NEW';
export type ReportReason =
  'UNCOMFORTABLE_CONTENT' | 'SCARY' | 'PERSONAL_INFO' | 'COPIED' | 'MEAN_WORDS' | 'OTHER';

/** 작성자 표시는 서버가 준 것만 쓴다. 실명·학교는 응답에 없다. */
export interface PublicAuthor {
  displayName: string;
  ageBand: string;
}

export interface PublicStory {
  id: string;
  title: string;
  excerpt: string;
  author: PublicAuthor;
  category: string;
  recommendationCount: number;
  recommendedByMe: boolean;
  recommendationReason: string;
  guardianApproved?: boolean;
  publishedAt: string;
}

export interface PublicStoryDetail extends PublicStory {
  body: string;
  thoughtJourney: Partial<ThoughtJourney>;
  mine?: boolean;
}

export interface RecommendationResponse {
  storyId: string;
  recommendationCount: number;
  recommendedByMe: boolean;
}

export interface CommunityReportResponse {
  report: {
    id: string;
    publicStoryId: string;
    reason: ReportReason;
    detail: string | null;
    status: 'OPEN' | 'RESOLVED';
    createdAt: string;
  };
  storyStatus: string;
}

// ---------- 이야기 공유 (15절, 아이 쪽) ----------

export type ShareAudience = 'PEERS' | 'FAMILY' | 'INVITED';
export type ShareStatus =
  | 'DRAFT'
  | 'PENDING_GUARDIAN'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'HIDDEN'
  | 'REVOKED';

export interface ShareRequest {
  id: string;
  storyId: string;
  status: ShareStatus;
  audience: ShareAudience;
  hideProfile: boolean;
  requestedBodyVersion: number;
  confirmedBodyVersion?: number | null;
  publicStoryId?: string | null;
  rejectReason?: string | null;
  pendingReason?: string | null;
  requestedAt: string;
  decidedAt?: string | null;
  updatedAt: string;
}

export interface ShareRequestResponse {
  shareRequest: ShareRequest;
  publicStory?: PublicStory | null;
}

// --- F4 음성·알림 ---
// 명세 20절(음성 입력과 읽어주기), 21절(알림과 기기). 백엔드 `app/v1/routers/{speech_v1,notifications}.py` 와 맞춘다.

export interface SpeechAudioFormat {
  encoding: 'PCM_S16LE';
  sampleRate: 16000;
  channels: 1;
}

export interface SpeechStreamTicketRequest {
  conversationId?: string;
  questionId?: string;
  locale?: string;
  audio?: SpeechAudioFormat;
}

export interface SpeechStreamTicket {
  streamId: string;
  /** 한 번만 쓸 수 있고 약 30초 뒤 만료된다. 다시 쓰지 않는다. */
  ticket: string;
  webSocketUrl: string;
  expiresAt: string;
}

/** 스트리밍이 막혔을 때 녹음 파일로 한 번 재시도한 결과. */
export interface SpeechTranscript {
  text: string;
  confidence: number;
  durationMs: number | null;
}

export interface SpeechSynthesisRequest {
  conversationId?: string;
  /** 티키 메시지 id. 주면 서버가 그 메시지 본문을 읽어 준다. */
  messageId?: string;
  text?: string;
}

export type DevicePlatform = 'IOS' | 'ANDROID' | 'WEB';

export interface DeviceRequest {
  platform: DevicePlatform;
  pushToken: string;
  installationId?: string;
  appVersion?: string;
  locale?: string;
}

export interface Device {
  id: string;
  platform: DevicePlatform;
  installationId: string | null;
  appVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  pushEnabled: boolean;
  shareRequests: boolean;
  safetyNotices: boolean;
  activitySummary: boolean;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  items: NotificationItem[];
  unreadCount: number;
  nextCursor: string | null;
}

// --- F1 홈·주제·활동 ---
// 라이브 서버(`/openapi.json`)에서 확인한 모양이다. 명세와 다른 곳은 주석으로 남긴다.

/** GET /home 의 미리보기 항목. 명세 10절은 빈 배열만 보여 준다. */
export interface HomeRecentWord {
  word: string;
  meaning: string;
}
export interface HomeCommunityStoryPreview {
  id: string;
  title: string;
}

/** 목록 응답의 주제. 명세 11절 예시에 없는 `hook`(한 줄 소개)을 서버가 내려준다. */
export interface TopicListItem extends Topic {
  hook?: string | null;
}

/** GET /topics/{id}. 대표 질문 목록이 함께 온다. */
export interface TopicDetail extends TopicListItem {
  questions: string[];
}

/** POST /topics 가 받는 기본 카테고리. 사용자 카테고리 id 는 받지 않는다. */
export type TopicCategoryId =
  | 'SCIENCE'
  | 'MATH'
  | 'HISTORY'
  | 'THINKING'
  | 'DAILY_LIFE'
  | 'NATURE'
  | 'FEELINGS'
  | 'IMAGINATION';

export interface TopicCreateRequest {
  title: string;
  category: TopicCategoryId;
}

export interface TopicSafety {
  allowed: boolean;
  reason: string | null;
}

export interface TopicCreateResponse {
  topic: { id: string; title: string; category: string; source: string };
  safety: TopicSafety;
}

export interface TopicCategory {
  id: string;
  name: string;
  kind: 'DEFAULT' | 'USER';
  order: number;
  /** 아이콘 이름(magnifier·puzzle·castle·lightbulb·book·star). */
  visual: string;
  /** 기본 카테고리는 false — 수정·삭제할 수 없다. */
  editable: boolean;
}

export interface TopicCategoryCreateRequest {
  name: string;
  order?: number | null;
}

export interface TopicCategoryUpdateRequest {
  name?: string | null;
  order?: number | null;
}

// ---------- 생각 모험 활동 ----------

export type ActivityTrack = 'forest' | 'lab' | 'theater';

export interface ActivityItem {
  id: string;
  track: ActivityTrack;
  /** 영역 표시(사고력 · 과학 · 수학 · 역사 · 인성) */
  area: string;
  /** 활동이 있는 곳의 이름 */
  place: string;
  title: string;
  subtitle: string;
  level: string;
  tags: string[];
  description: string;
  estimatedMinutes: number;
  /** 글쓰기 단계에서 공백을 뺀 최소 글자 수 */
  minCharacters: number;
}

export interface ActivityVisuals {
  kind: string;
  icon: string;
  color: string;
  items: string[];
}

export interface ActivityDetail extends ActivityItem {
  intro: string;
  clue: string | null;
  steps: string[];
  questions: string[];
  visuals: ActivityVisuals;
}

export interface ActivityAnswer {
  question: string;
  text: string;
}

export interface ActivityStep {
  index: number;
  label: string;
  total: number;
  /** 이 단계가 글쓰기 단계인가 */
  writing: boolean;
}

/** 서버가 보관하는 초안. 로컬 Draft 와 같은 모양이라 그대로 비교할 수 있다. */
export interface ActivityDraftState {
  text: string;
  answers: ActivityAnswer[];
  followup: string;
  hints: number;
  lab: Record<string, unknown>;
  theater: Record<string, unknown>;
  inquiry: Record<string, unknown> | null;
  path: Record<string, unknown> | null;
}

/** 지금 단계에서 아직 못 채운 조건. 아이에게 그대로 보여 줄 문장이 담겨 있다. */
export interface MissingCondition {
  code: string;
  message: string;
}

export type ActivitySessionStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface ActivitySession {
  sessionId: string;
  activityId: string;
  track: ActivityTrack;
  title: string;
  status: ActivitySessionStatus;
  /** 자동 저장 번호. PATCH 의 clientRevision 에 그대로 넣는다. */
  revision: number;
  step: ActivityStep;
  minCharacters: number;
  draft: ActivityDraftState;
  missing: MissingCondition[];
  readyToComplete: boolean;
  storyId: string | null;
  startedAt: string;
  updatedAt: string;
}

export type ActivityEventType =
  | 'TEXT'
  | 'HINT'
  | 'TOPIC'
  | 'KEYWORD'
  | 'LAB_VALUE'
  | 'OBSERVATION'
  | 'APPROVE'
  | 'SCENE'
  | 'CHOICE'
  | 'EMOTION'
  | 'INQUIRY'
  | 'RUN';

export interface ActivityEvent {
  type: ActivityEventType;
  /** OBSERVATION 은 LOW_LIGHT·HIGH_LIGHT·A·B 만 받는다. */
  field?: string | null;
  value?: unknown;
}

export interface ActivityStartRequest {
  activityId: string;
  /** 마음극장 활동의 마음 키워드 */
  keyword?: string;
}

export interface ActivityPatchRequest {
  clientRevision: number;
  event: ActivityEvent;
}

export interface ActivityStory {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  answers: ActivityAnswer[];
  createdAt: string;
}

export interface ActivityCompleteResponse {
  session: ActivitySession;
  story: ActivityStory;
}

// --- F3 보호자·설정·기록 ---
// 명세 15(보호자 쪽)·16·17·18·22·23·26·29절. 실제 서버 `/openapi.json`(2026-09-18)으로 모양을 맞췄다.

export type ConsentDocumentId =
  'privacy_child' | 'ai_conversation' | 'voice_retention' | 'community_share' | (string & {});
export type GuardianPermission =
  'VIEW_PROFILE' | 'VIEW_STORIES' | 'VIEW_REPORTS' | 'REVIEW_SHARING' | 'MANAGE_DATA';
export type ProfileRole = 'OWNER' | 'GUARDIAN';
export type JobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
export type AiSource = 'ai' | 'fallback';

// ---------- 프로필과 설정 (17절) ----------

export interface ProfileOut {
  id: string;
  nickname: string;
  schoolOrGroup?: string | null;
  gradeOrAgeBand?: string | null;
  interests?: string[];
  interestDetails?: string[];
  growthGoal?: string | null;
  summary?: string;
  version: number;
  role: ProfileRole;
  permissions: GuardianPermission[];
  isDefault: boolean;
  needsFirstGreeting: boolean;
  createdAt: string;
  updatedAt: string;
}

/** `/me` 의 profiles 항목. 프로필 고르기에만 쓰는 축약형이다. */
export interface MeProfileItem {
  id: string;
  nickname: string;
  gradeOrAgeBand?: string | null;
  interests?: string[];
  growthGoal?: string | null;
  role: ProfileRole;
  permissions: GuardianPermission[];
  isDefault: boolean;
  needsFirstGreeting: boolean;
}

/** `/me` 실제 응답. 위쪽 MeResponse 는 profiles 가 없던 시절 모양이라 여기서 넓힌다. */
export interface AccountMeResponse extends MeResponse {
  profiles: MeProfileItem[];
}

export interface ProfileUpdateRequest {
  nickname?: string;
  schoolOrGroup?: string | null;
  gradeOrAgeBand?: string | null;
  interests?: string[];
  growthGoal?: string | null;
  makeDefault?: boolean;
}

export type SettingsTheme = 'AUTO' | 'LIGHT' | 'DARK';
export type RetentionDays = 30 | 90 | 180 | 365;

export interface SettingsOut {
  profileId: string;
  ttsEnabled: boolean;
  guardianPreviewEnabled: boolean;
  theme: SettingsTheme;
  retentionDays: number;
  version: number;
  updatedAt: string;
}

/** 보관기간을 줄였을 때만 내려온다. 무엇이 언제 지워지는지 그대로 보여 준다. */
export interface RetentionNotice {
  previousDays: number;
  retentionDays: number;
  effectiveAt: string;
  deletesBefore: string;
  deletesNow: boolean;
  targets: string[];
  message: string;
}

export interface SettingsResponse {
  settings: SettingsOut;
  retentionNotice?: RetentionNotice | null;
}

export interface SettingsUpdateRequest {
  ttsEnabled?: boolean;
  guardianPreviewEnabled?: boolean;
  theme?: SettingsTheme;
  retentionDays?: RetentionDays;
}

// ---------- 약관과 동의 (26절) ----------

export interface LegalDocument {
  id: ConsentDocumentId;
  title: string;
  version: string;
  locale: string;
  required: boolean;
  summary: string;
  body: string;
  draft?: boolean;
  draftNotice: string;
}

export interface Consent {
  id: string;
  profileId: string;
  documentId: ConsentDocumentId;
  documentVersion: string;
  status: 'GRANTED' | 'REVOKED';
  current: boolean;
  actor: { userId: string; role: string };
  grantedAt: string;
  revokedAt?: string | null;
}

export interface ConsentCreateRequest {
  profileId: string;
  guardianConfirmed?: boolean;
  items: { documentId: ConsentDocumentId; version?: string; agreed?: boolean }[];
  actor?: 'GUARDIAN' | 'CHILD' | (string & {});
}

// ---------- 아이·보호자 연결 (16절) ----------

export interface GuardianLink {
  id: string;
  profileId: string;
  userId: string;
  role: ProfileRole;
  permissions: GuardianPermission[];
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
  revokedAt?: string | null;
}

export interface GuardianInvitation {
  id: string;
  profileId: string;
  /** 한 번만 쓸 수 있는 초대 토큰. 링크와 코드로 같이 보여 준다. */
  token: string;
  permissions: GuardianPermission[];
  expiresAt: string;
  createdAt: string;
}

export interface GuardianChild {
  profileId: string;
  linkId: string;
  nickname: string;
  gradeOrAgeBand?: string | null;
  role: ProfileRole;
  permissions: GuardianPermission[];
  isDefault: boolean;
  needsFirstGreeting: boolean;
  updatedAt: string;
}

export interface UnlinkResult {
  ok?: boolean;
  linkId: string;
  /** 연결 해제는 기록 삭제가 아니다. 서버도 false 를 준다. */
  dataDeleted?: boolean;
  message?: string;
}

// ---------- 공유 승인 (15절 보호자 쪽) ----------

/** 승인 화면에서 미리 보여 줄 본문. 보호자 연결 계정은 `/stories/{id}` 를 못 읽을 수 있다. */
export interface StoryPreview {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  version: number;
  updatedAt: string;
}

// ---------- 성장 리포트 (18절) ----------

export interface ProgressReport {
  profileId: string;
  period: { from: string; to: string };
  activity: {
    activeDays: number;
    completedStories: number;
    continuedStories: number;
    newWords: number;
  };
  observedBehaviors: {
    fullSentenceResponses: number;
    reasonExplanations: number;
    alternativeIdeas: number;
    revisedIdeas: number;
  };
  timeline: { date: string; conversations: number; completedStories: number; responses: number }[];
  categoryBreakdown: { category: string; completedStories: number }[];
  /** 진단이 아니라는 안내. 화면에 그대로 보여 준다. */
  notice?: string;
}

export interface ReportSummary {
  id: string;
  profileId: string;
  period: { from: string; to: string };
  status: 'CURRENT' | 'STALE';
  source: AiSource;
  summary: {
    highlights: string[];
    suggestions: string[];
    conversationTips: string[];
    evidenceStoryIds: string[];
  };
  notice?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------- 안전 (23절) ----------

export interface SafetyEvent {
  id: string;
  category: string;
  needsAttention: boolean;
  guidance: string;
  occurredAt: string;
}

export interface SafetyEventList {
  items: SafetyEvent[];
  nextCursor: string | null;
  notice: string;
}

// ---------- 보호자 상담 (29절) ----------

export interface ConsultationEligibility {
  profileId: string;
  eligible: boolean;
  period: string;
  reason: string;
  daysRemaining: number;
  completedStories: number;
  alreadyCreated: boolean;
}

export interface ConsultationQuestion {
  id: string;
  question: string;
  answer: string;
  source: AiSource;
  createdAt: string;
}

export interface ConsultationSummary {
  id: string;
  profileId: string;
  period: string;
  source: AiSource;
  createdAt: string;
}

export interface Consultation extends ConsultationSummary {
  consultation: {
    observedBehaviors: string[];
    examples: string[];
    questionsToTry: string[];
    evidenceStoryIds: string[];
  };
  questions?: ConsultationQuestion[];
  notice?: string;
}

// ---------- 내 데이터 (22절) ----------

export interface DataOverview {
  profileId?: string | null;
  counts: Record<string, number>;
  retention: Record<string, number>;
  hiddenScopes?: string[];
  pendingDeletionRequestId?: string | null;
  generatedAt: string;
}

export interface Job {
  id: string;
  type: 'DATA_EXPORT' | 'DATA_DELETION' | 'ACCOUNT_DELETION';
  status: JobStatus;
  createdAt: string;
  updatedAt?: string | null;
  completedAt?: string | null;
  error?: string | null;
}

export interface ExportDetail {
  job: Job;
  include: string[];
  byteSize: number;
  /** url 에 이미 token 이 붙어 있다. 그대로 쓴다. */
  download?: { url: string; token: string; expiresAt: string } | null;
}

export type ExportInclude = 'PROFILE' | 'CONVERSATIONS' | 'STORIES' | 'WORDBOOK' | 'REPORTS';
export type DeletionScope = 'ALL_CHILD_DATA' | 'CONVERSATIONS' | 'STORIES' | 'WORDBOOK' | 'EXPORTS';
export type DeletionReason = 'USER_REQUEST' | 'NO_LONGER_USED' | 'PRIVACY_CONCERN' | 'OTHER';

export interface DeletionRequest {
  id: string;
  kind: 'DATA' | 'ACCOUNT';
  scope: string;
  status: JobStatus;
  reason: string;
  profileId?: string | null;
  targetId?: string | null;
  hiddenAt?: string | null;
  effectiveAt: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellable: boolean;
  result?: Record<string, unknown>;
  createdAt: string;
}
