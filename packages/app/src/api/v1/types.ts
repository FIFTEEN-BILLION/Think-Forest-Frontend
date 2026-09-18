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
