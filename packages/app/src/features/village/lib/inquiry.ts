import type { Draft, Inquiry, LearningEvent } from '../types';

export const INQUIRY_STEPS = ['처음 생각', '뜻 확인', '조건 바꾸기', '다시 생각', '처음과 지금'];
export const CONDITIONS = {
  low: {
    label: '빛을 낮게',
    value: 25,
    result: '그림자가 길게 뻗었어요.',
    detail: '빛을 낮게 두었을 때',
  },
  high: {
    label: '빛을 높게',
    value: 85,
    result: '그림자가 짧아졌어요.',
    detail: '빛을 높게 두었을 때',
  },
} as const;
export const JUDGMENTS = {
  keep: '처음 생각과 같아요',
  change: '생각이 달라졌어요',
  explore: '더 알아보고 싶어요',
} as const;
const size = (text: string) => [...text.replace(/\s/g, '')].length;
export function emptyInquiry(): Inquiry {
  return {
    initial: '',
    reason: '',
    question: '',
    meaning: '',
    confirmed: false,
    selected: null,
    observed: [],
    judgment: null,
    final: '',
    finalReason: '',
  };
}
function writingError(thought: string, reason: string, min: number) {
  if (size(thought) < 3) return '내 생각을 세 글자 이상 적어 줘.';
  if (size(reason) < 3) return '그렇게 생각한 이유도 세 글자 이상 적어 줘.';
  if (size(thought + reason) < min)
    return `생각과 이유를 합쳐 ${min}자 이상 적어 줘. 빈칸은 세지 않아.`;
  return null;
}
export function inquiryGuard(d: Draft): string | null {
  const q = d.inquiry;
  if (!q) return '첫 탐구를 다시 열어 줘.';
  if (d.step === 0) return writingError(q.initial, q.reason, d.min);
  if (d.step === 1) {
    if (!q.question) return '질문을 준비하고 있어.';
    if (size(q.meaning) < 3) return '내가 말하려던 뜻을 세 글자 이상 적어 줘.';
    if (!q.confirmed) return '내가 말하려던 뜻인지 확인해 줘.';
  }
  if (d.step === 2 && !(q.observed.includes('low') && q.observed.includes('high')))
    return '빛이 낮을 때와 높을 때, 두 결과를 모두 살펴봐 줘.';
  if (d.step === 3) {
    if (!q.judgment) return '지금 내 생각에 가까운 것을 하나 골라 줘.';
    return writingError(q.final, q.finalReason, d.min);
  }
  return null;
}
export function inquiryComplete(d: Draft) {
  const q = d.inquiry;
  return Boolean(
    q &&
    d.step === 4 &&
    !writingError(q.initial, q.reason, d.min) &&
    q.question &&
    size(q.meaning) >= 3 &&
    q.confirmed &&
    q.observed.includes('low') &&
    q.observed.includes('high') &&
    q.judgment &&
    !writingError(q.final, q.finalReason, d.min),
  );
}
export function inquiryTransition(
  draft: Draft,
  event: LearningEvent,
): { draft: Draft; error?: string } {
  const d = structuredClone(draft),
    q = d.inquiry;
  if (!q) return { draft, error: '첫 탐구를 다시 열어 줘.' };
  if (event.type === 'inquiry-field') {
    const allowed =
      d.step === 0
        ? ['initial', 'reason']
        : d.step === 1
          ? ['meaning']
          : d.step === 3
            ? ['final', 'finalReason']
            : [];
    if (!allowed.includes(event.field)) return { draft };
    q[event.field] = event.value.slice(0, 1000);
    if (event.field === 'meaning') q.confirmed = false;
  }
  if (event.type === 'inquiry-question' && d.step === 1 && !q.question) q.question = event.question;
  if (event.type === 'inquiry-confirm' && d.step === 1 && q.question) q.confirmed = event.confirmed;
  if (event.type === 'inquiry-select' && d.step === 2) q.selected = event.condition;
  if (
    event.type === 'inquiry-observe' &&
    d.step === 2 &&
    q.selected &&
    !q.observed.includes(q.selected)
  )
    q.observed.push(q.selected);
  if (event.type === 'inquiry-judge' && d.step === 3) {
    if (q.judgment !== event.judgment) {
      q.judgment = event.judgment;
      q.final = event.judgment === 'keep' ? q.meaning : '';
      q.finalReason = '';
    }
  }
  if (event.type === 'inquiry-back' && d.step === 1) {
    d.step = 0;
    d.inquiry = { ...emptyInquiry(), initial: q.initial, reason: q.reason };
  }
  if (event.type === 'advance') {
    const error = inquiryGuard(d);
    if (error) return { draft, error };
    if (d.step >= 4) return { draft };
    if (d.step === 0) q.meaning = q.initial.trim();
    d.step++;
  }
  d.updatedAt = new Date().toISOString();
  return { draft: d };
}

// A cancellable local adapter. No AI or network request occurs, including the error scenario.
export function requestInquiryQuestion(
  initial: string,
  reason: string,
  options: { fail: boolean; signal: AbortSignal },
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (size(initial) < 3 || size(reason) < 3) {
      reject(new Error('먼저 내 생각과 이유를 적어 줘.'));
      return;
    }
    if (options.signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timer = setTimeout(() => {
      options.signal.removeEventListener('abort', abort);
      if (options.fail) reject(new Error('질문을 가져오지 못했어요.'));
      else
        resolve(
          `“${initial.trim()}”라고 생각했구나. 빛을 위로 올리면 그림자가 어떻게 된다는 뜻이야? 아래 문장이 네 뜻과 맞는지 살펴봐 줘.`,
        );
    }, 650);
    options.signal.addEventListener('abort', abort, { once: true });
  });
}
