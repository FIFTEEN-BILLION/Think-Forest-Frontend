import type { GreetingProcessing } from '../api/v1/greeting';

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  source?: string;
}
export interface Interaction {
  type: string;
  questionId: string;
  options: { id: string; label: string }[];
}
export interface ChatSession {
  sessionId?: string;
  conversationId?: string;
  status: string;
  messages?: ChatMessage[];
  assistantMessage?: ChatMessage;
  userMessage?: ChatMessage;
  nextInteraction?: Interaction | null;
  currentInteraction?: Interaction | null;
  readiness: { ready: boolean; progress: number };
  processing?: GreetingProcessing | null;
  profileRevision?: number;
  deferredFields?: string[];
  storyId?: string;
  nextCursor?: string | null;
  topic?: { title: string };
  profileDraft?: {
    nickname: string | null;
    schoolOrGroup: string | null;
    gradeOrAgeBand: string | null;
    interests: string[];
    interestDetails?: string[];
    growthGoal?: string | null;
  };
  completion?: { story?: { id: string } };
}
