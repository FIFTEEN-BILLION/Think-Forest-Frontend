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
  storyId?: string;
  nextCursor?: string | null;
  topic?: { title: string };
  completion?: { story?: { id: string } };
}
