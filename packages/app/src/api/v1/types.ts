// JJCP API v1 계약 타입. API_SPEC.md(2·3·4·5·7·10·11·12절)와 구현 보충 결정 문서를 그대로 옮긴다.
// 명세에 글자 그대로 없는 부분은 "가정"이라고 적어 둔다.

// ---------- 공통 ----------

export type SessionStatus = 'ACTIVE' | 'READY_TO_FINISH' | 'FINALIZING' | 'COMPLETED' | 'CANCELLED';
export type UserRole = 'CHILD' | 'GUARDIAN' | (string & {});
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
