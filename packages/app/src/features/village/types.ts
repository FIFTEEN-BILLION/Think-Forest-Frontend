export type Track = 'forest' | 'lab' | 'theater';
export type Level = '쉬움' | '보통' | '도전';
export type Theme = 'auto' | 'light' | 'dark';
export type Rubric = { observe: number; reason: number; express: number };
export type Provenance = 'mock' | 'local';
export type Answer = { question: string; text: string };
export type Story = { title: string; keyword: string; scenes: string[]; branches: string[] };
export type LabMode = 'shadow' | 'balance' | 'custom';
export type InquiryCondition = 'low' | 'high';
export type InquiryJudgment = 'keep' | 'change' | 'explore';
export interface Inquiry {
  initial: string;
  reason: string;
  question: string;
  meaning: string;
  confirmed: boolean;
  selected: InquiryCondition | null;
  observed: InquiryCondition[];
  judgment: InquiryJudgment | null;
  final: string;
  finalReason: string;
}

// First inquiry v2: the "teach the confused thinking friend" engine.
export type ShadowVariable = 'lightHeight' | 'stickHeight' | 'distance' | 'brightness';
export interface ShadowSetup {
  lightHeight: 'low' | 'mid' | 'high';
  stickHeight: 'short' | 'tall';
  distance: 'near' | 'far';
  brightness: 'dim' | 'bright';
}
export type Effect = 'longer' | 'shorter' | 'same';
export type ClaimEffect = Effect | 'unknown';
export type Confidence = 1 | 2 | 3;
export type AiSource = 'ai' | 'fallback';
export type HelpLevel = 'probe' | 'hint' | 'explanation';
export type InputOrigin = 'example' | 'adult';
export type ChallengeJudgment = 'agree' | 'disagree' | 'unsure';
export type SkillId = 'predict' | 'fairTest' | 'evidence' | 'revise' | 'transfer';
export type SkillLevel = 'independent' | 'afterProbe' | 'afterExplanation' | 'notShown';
export interface ThinkingClaim {
  variable: ShadowVariable;
  effect: ClaimEffect;
}
export interface ThinkingExperiment {
  id: string;
  base: ShadowSetup;
  compare: ShadowSetup;
  baseLength: number;
  compareLength: number;
  prediction: Effect;
  observed: boolean;
  feedback: HelpLevel | null;
  surprise: string;
}
export interface TeachExchange {
  message: string;
  cardIds: string[];
  convinced: boolean;
  helpLevel: HelpLevel | null;
  reply: string;
  source: AiSource;
}
export interface ThinkingChallenge {
  id: string;
  line: string;
  base: ShadowSetup;
  compare: ShadowSetup;
  baseLength: number;
  compareLength: number;
  friendPrediction: Effect;
  confounded: boolean;
  friendCorrect: boolean;
  source: AiSource;
  judgment: ChallengeJudgment | null;
  reason: string;
  observed: boolean;
}
export interface SkillResult {
  skill: SkillId;
  level: SkillLevel;
  quote: string;
}
export interface ThinkingInquiry {
  version: 2;
  prediction: ClaimEffect | null;
  reason: string;
  reasonSkipped: boolean;
  origin: InputOrigin;
  confidenceBefore: Confidence | null;
  restatement: string;
  restatementConfirmed: boolean;
  claims: ThinkingClaim[];
  interpretSource: AiSource | null;
  friendBeliefId: string;
  friendLine: string;
  friendVariable: ShadowVariable | null;
  checkPlan: string;
  experiments: ThinkingExperiment[];
  exchanges: TeachExchange[];
  convinced: boolean;
  judgment: InquiryJudgment | null;
  final: string;
  finalReason: string;
  confidenceAfter: Confidence | null;
  challenge: ThinkingChallenge | null;
  finalClaims: ThinkingClaim[];
  skills: SkillResult[];
}

export interface Draft {
  id: string;
  track: Track;
  startedAt: string;
  updatedAt: string;
  min: number;
  step: number;
  activityId: string;
  title: string;
  text: string;
  answers: Answer[];
  followup: string;
  hints: number;
  inquiry?: Inquiry;
  thinking?: ThinkingInquiry;
  lab: {
    mode: LabMode;
    topic: string;
    value: number;
    low: boolean;
    high: boolean;
    a: string;
    b: string;
    source: string;
    prediction: string;
  };
  theater: {
    keyword: string;
    story: Story | null;
    scene: number;
    choice: number | null;
    emotion: string;
    approved: boolean;
  };
}

export interface SessionRecord {
  id: string;
  track: Track;
  activityId: string;
  title: string;
  date: string;
  completedAt: string;
  durationMinutes: number;
  source: Provenance;
  text: string;
  answers: Answer[];
  // Absent for first inquiry v2 records: they show thinking skills, never scores.
  rubric?: Rubric;
  story?: Story;
  emotion?: string;
  choice?: number;
  observations?: Draft['lab'];
  favorite: boolean;
  inquiry?: Inquiry;
  thinking?: ThinkingInquiry;
}

export interface Diagnosis {
  level: Level;
  why: string;
  answers: string[];
  at: string;
}

export interface VillageData {
  version: 1;
  profile: { name: string; grade: string; interests: string[]; goal: string };
  settings: {
    gate: Level;
    autoTune: boolean;
    tts: boolean;
    parentPreview: boolean;
    theme: Theme;
    retention: 30 | 90 | 180;
  };
  consent: {
    done: boolean;
    ageBand: string;
    guardian: string;
    noticeAt: string | null;
    thirdParty: boolean;
  };
  onboarding: {
    step: number;
    ageBand: string;
    guardian: string;
    acknowledged: boolean;
    childPolicy: boolean;
  };
  diagnosis: Diagnosis | null;
  diagnosticDraft: { index: number; answers: string[] };
  sessions: SessionRecord[];
  safety: { id: string; at: string; keyword: string; reason: string; source: Provenance }[];
  resume: Draft | null;
  summary: {
    text: string;
    next: string;
    at: string;
    source: 'rule';
    recordIds: string[];
    includesMock: boolean;
  } | null;
}

export type LearningEvent =
  | {
      type: 'inquiry-field';
      field: 'initial' | 'reason' | 'meaning' | 'final' | 'finalReason';
      value: string;
    }
  | { type: 'inquiry-question'; question: string }
  | { type: 'inquiry-confirm'; confirmed: boolean }
  | { type: 'inquiry-select'; condition: InquiryCondition }
  | { type: 'inquiry-observe' }
  | { type: 'inquiry-judge'; judgment: InquiryJudgment }
  | { type: 'inquiry-back' }
  | { type: 'think-predict'; prediction: ClaimEffect }
  | { type: 'think-reason'; value: string; origin: InputOrigin }
  | { type: 'think-skip-reason'; skipped: boolean }
  | { type: 'think-confidence'; when: 'before' | 'after'; value: Confidence }
  | {
      type: 'think-interpret';
      claims: ThinkingClaim[];
      restatement: string;
      friendBeliefId: string;
      friendLine: string;
      friendVariable: ShadowVariable;
      source: AiSource;
    }
  | { type: 'think-restatement'; confirmed: boolean }
  | { type: 'think-back' }
  | { type: 'think-plan'; value: string }
  | {
      type: 'think-experiment';
      id: string;
      compare: ShadowSetup;
      prediction: Effect;
      baseLength: number;
      compareLength: number;
    }
  | { type: 'think-observe'; id: string }
  | { type: 'think-surprise'; id: string; value: string }
  | { type: 'think-teach'; exchange: TeachExchange }
  | { type: 'think-judge'; judgment: InquiryJudgment }
  | { type: 'think-final'; field: 'final' | 'finalReason'; value: string }
  | {
      type: 'think-challenge';
      challenge: Omit<ThinkingChallenge, 'judgment' | 'reason' | 'observed'>;
      finalClaims: ThinkingClaim[];
    }
  | { type: 'think-challenge-judge'; judgment: ChallengeJudgment }
  | { type: 'think-challenge-reason'; value: string }
  | { type: 'think-challenge-observe' }
  | { type: 'text'; text: string }
  | { type: 'hint' }
  | { type: 'advance' }
  | { type: 'lab-value'; value: number }
  | { type: 'observation'; field: 'a' | 'b' | 'source'; value: string }
  | { type: 'approve' }
  | { type: 'scene'; direction: 1 | -1 }
  | { type: 'choice'; choice: number }
  | { type: 'emotion'; emotion: string };

export interface CatalogActivity {
  id: string;
  track: Track;
  title: string;
  subtitle: string;
  duration: number;
  level: Level;
  tags: string[];
  description: string;
}
