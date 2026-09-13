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
  rubric: Rubric;
  story?: Story;
  emotion?: string;
  choice?: number;
  observations?: Draft['lab'];
  favorite: boolean;
  inquiry?: Inquiry;
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
