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
