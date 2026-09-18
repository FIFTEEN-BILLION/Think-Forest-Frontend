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
  audience: 'PEERS' | 'FAMILY' | 'INVITED';
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

export interface PublicStory {
  id: string;
  title: string;
  excerpt: string;
  author: { displayName: string; ageBand: string };
  category: string;
  recommendationCount: number;
  recommendedByMe: boolean;
  recommendationReason: string;
  guardianApproved?: boolean;
  publishedAt: string;
}

export interface ShareRequestResponse {
  shareRequest: ShareRequest;
  publicStory?: PublicStory | null;
}

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
