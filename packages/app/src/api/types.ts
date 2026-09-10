// 자람마을 백엔드(`../backend`)의 API 계약을 그대로 옮긴 타입.
// 키는 camelCase. 백엔드 `app/schemas/*` 를 바꾸면 이 파일도 함께 고친다.

export type FollowupIntensity = 'gentle' | 'normal' | 'deep';
export type VocabLevel = 'easy' | 'normal' | 'rich';

/** 모든 AI 응답에 실리는 정직성 메타. 프론트가 배지로 쓴다. */
export interface AiMeta {
  /** 실제 Claude 호출이면 true, 규칙 기반 폴백이면 false */
  ai: boolean;
  /** 실패 사유/코드. 성공이면 null */
  error: string | null;
}

/** 아이 프로필. 모든 생성·채점 요청에 실려 나간다. */
export interface ChildContext {
  name?: string | null;
  ageBand?: string | null;
  grade?: string | null;
  interests?: string[];
  followupIntensity?: FollowupIntensity;
  vocabLevel?: VocabLevel;
}

/** 법정대리인 동의. 없으면 아이 발화를 저장하지 않는다(체험은 허용). */
export interface GuardianConsent {
  guardian: boolean;
}

export interface HealthResponse {
  ok: boolean;
}

// --- POST /diagnostic/assess ---------------------------------------------------

export interface DiagnosticAnswer {
  prompt: string;
  /** 건너뛰면 빈 문자열 */
  answer: string;
}

export interface DiagnosticAssessRequest {
  answers: DiagnosticAnswer[];
  child?: ChildContext;
}

export interface DiagnosticAssessResponse extends AiMeta {
  followupIntensity: FollowupIntensity;
  vocabLevel: VocabLevel;
  /** 이렇게 설정한 근거 문장(화면 노출) */
  rationale: string;
}

// --- POST /rubric/score ------------------------------------------------------

export interface RubricScoreRequest {
  question: string;
  answer: string;
  child?: ChildContext;
  /** guardian 이 true 일 때만 발화를 마스킹 후 저장 */
  consent?: GuardianConsent | null;
}

export interface RubricScoreResponse extends AiMeta {
  observe: number;
  reason: number;
  express: number;
  quote: string;
  followup: string;
  comment: string;
}

// --- POST /theater/script · GET /theater/library ----------------------------

export interface Scene {
  narration: string;
  line: string;
  emotion: string;
}

export interface ScriptRequest {
  keyword: string;
  child?: ChildContext;
}

export interface ScriptResponse extends AiMeta {
  /** 1차 금칙어 + 2차 AI 심사를 모두 통과했는지 */
  safe: boolean;
  /** 안전 판정 사유 또는 차단·실패 사유 */
  reason: string;
  title: string;
  scenes: Scene[];
  learn: string;
}

/** 검수 대본 라이브러리 항목(TH-09) */
export interface LibraryScript {
  id: string;
  keyword: string;
  title: string;
  scenes: Scene[];
  learn: string;
  parentNote: string;
}

// --- POST /lab/activity -----------------------------------------------------

export interface LabActivityRequest {
  topic: string;
  child?: ChildContext;
}

export interface QuizItem {
  q: string;
  options: string[];
  /** 정답 선택지 인덱스(0부터) */
  answer: number;
}

export interface LabActivityResponse extends AiMeta {
  title: string;
  ctrlLabel: string;
  ask: string;
  concept: string;
  quiz: QuizItem[];
}

// --- POST /report/summary --------------------------------------------------

export interface WeeklyScore {
  week: string;
  observe: number;
  reason: number;
  express: number;
}

export interface ReportSummaryRequest {
  sentences: string[];
  weeklyScores: WeeklyScore[];
}

export interface ReportSummaryResponse extends AiMeta {
  summary: string;
  next: string;
}

// --- GET /tech/panel ------------------------------------------------------

export interface CallLogEntry {
  purpose: string;
  model: string;
  latencyMs: number;
  ok: boolean;
  code: string;
  at: string;
}

export interface BlockLogEntry {
  stage: string;
  surface: string;
  term: string | null;
  reason: string;
  at: string;
}

export interface TechPanelResponse {
  aiEnabled: boolean;
  model: string;
  callCount: number;
  avgLatencyMs: number;
  calls: CallLogEntry[];
  blocks: BlockLogEntry[];
}
