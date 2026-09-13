import type {
  ChallengeJudgment,
  ClaimEffect,
  Confidence,
  Draft,
  Effect,
  HelpLevel,
  LearningEvent,
  ShadowSetup,
  ShadowVariable,
  SkillId,
  SkillLevel,
  SkillResult,
  ThinkingChallenge,
  ThinkingInquiry,
} from '../types';
import { BASE_SETUP, VARIABLE_NAME, changedVars, isSetup } from './shadow';

// First inquiry v2: "teach the confused thinking friend".
// The child predicts first, designs fair tests, convinces the friend with evidence,
// then checks the friend's new prediction. The server decides persuasion; this file
// only keeps progress honest and derives thinking skills from recorded events.
export const THINKING_STEPS = [
  '처음 생각',
  '친구 생각',
  '공정한 실험',
  '친구 가르치기',
  '처음과 지금',
];
export const THINKING_STEP_HINTS = [
  '어떻게 될지 고르고, 이유와 확신을 남겨요.',
  '생각 친구가 이해한 내 생각을 확인하고, 친구의 다른 생각을 들어요.',
  '무엇을 바꿀지 직접 정해서 공정한 실험을 해요.',
  '실험 증거로 친구를 설득하고, 친구의 새 예측을 검사해요.',
  '처음과 지금, 내가 쓴 생각 기술을 돌아봐요.',
];
export const MAX_EXPERIMENTS = 5;
export const MAX_TEACH_FAILURES = 3;
// Model truth for the mission question; mirrors backend missions/shadow.py TRUTH.
const LIGHT_TRUTH: Effect = 'shorter';

export const PREDICTIONS: ClaimEffect[] = ['longer', 'shorter', 'same', 'unknown'];
export const PREDICTION_LABEL: Record<ClaimEffect, string> = {
  longer: '길어질 것 같아',
  shorter: '짧아질 것 같아',
  same: '그대로일 것 같아',
  unknown: '아직 모르겠어',
};
export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  1: '조금 확신해',
  2: '꽤 확신해',
  3: '아주 확신해',
};
export const CHALLENGE_JUDGMENT_LABEL: Record<ChallengeJudgment, string> = {
  agree: '친구 말이 맞아',
  disagree: '친구 말이 틀려',
  unsure: '아직 알 수 없어',
};
export const SKILL_LABEL: Record<SkillId, { name: string; describe: string }> = {
  predict: { name: '예측하고 이유 말하기', describe: '결과를 보기 전에 생각과 이유를 말했어요.' },
  fairTest: { name: '공정하게 비교하기', describe: '한 번에 하나만 바꾸어 실험했어요.' },
  evidence: { name: '증거로 설득하기', describe: '실험에서 본 것을 근거로 친구를 설득했어요.' },
  revise: { name: '증거에 맞춰 생각 정하기', describe: '실험 결과와 맞게 지금 생각을 말했어요.' },
  transfer: { name: '새 상황에 적용하기', describe: '친구의 새 예측이 맞는지 판단했어요.' },
};
export const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = {
  independent: '혼자 해냈어요',
  afterProbe: '질문을 듣고 해냈어요',
  afterExplanation: '설명을 듣고 해냈어요',
  notShown: '이번에는 보이지 않았어요',
};

const size = (text: string) => [...text.replace(/\s/g, '')].length;
const HELP_ORDER: HelpLevel[] = ['probe', 'hint', 'explanation'];

export function emptyThinking(): ThinkingInquiry {
  return {
    version: 2,
    prediction: null,
    reason: '',
    reasonSkipped: false,
    origin: 'adult',
    confidenceBefore: null,
    restatement: '',
    restatementConfirmed: false,
    claims: [],
    interpretSource: null,
    friendBeliefId: '',
    friendLine: '',
    friendVariable: null,
    checkPlan: '',
    experiments: [],
    exchanges: [],
    convinced: false,
    judgment: null,
    final: '',
    finalReason: '',
    confidenceAfter: null,
    challenge: null,
    finalClaims: [],
    skills: [],
  };
}

const isFair = (e: { base: ShadowSetup; compare: ShadowSetup }) =>
  changedVars(e.base, e.compare).length === 1;
export function fairObserved(q: ThinkingInquiry, variable: ShadowVariable) {
  return q.experiments.some(
    (e) => e.observed && isFair(e) && changedVars(e.base, e.compare)[0] === variable,
  );
}
export const teachFailures = (q: ThinkingInquiry) => q.exchanges.filter((x) => !x.convinced).length;
export const teachDone = (q: ThinkingInquiry) =>
  q.convinced || teachFailures(q) >= MAX_TEACH_FAILURES;
export const finalReady = (q: ThinkingInquiry) =>
  Boolean(q.judgment) && size(q.final) >= 1 && q.confidenceAfter !== null;
export function challengeCorrect(ch: ThinkingChallenge) {
  if (!ch.judgment) return false;
  if (ch.confounded) return ch.judgment !== 'agree';
  return ch.judgment === (ch.friendCorrect ? 'agree' : 'disagree');
}

function stepError(q: ThinkingInquiry, step: number): string | null {
  if (step === 0) {
    if (!q.prediction) return '먼저 어떻게 될지 하나 골라 줘.';
    if (!q.reasonSkipped && size(q.reason) < 1)
      return '이유를 말해 주거나 “설명이 어려워요”를 골라 줘.';
    if (!q.confidenceBefore) return '얼마나 확신하는지 골라 줘.';
  }
  if (step === 1) {
    if (!q.friendLine) return '생각 친구가 네 생각을 읽고 있어.';
    if (!q.restatementConfirmed) return '친구가 이해한 내 생각이 맞는지 확인해 줘.';
  }
  if (step === 2) {
    if (q.experiments.some((e) => !e.observed)) return '만든 실험의 결과를 먼저 살펴봐 줘.';
    if (q.friendVariable && !fairObserved(q, q.friendVariable))
      return `친구 생각을 확인하려면 ${VARIABLE_NAME[q.friendVariable]}만 바꾼 실험을 해 봐.`;
    if (!fairObserved(q, 'lightHeight')) return '빛의 높이만 바꾼 실험도 해 봐.';
  }
  if (step === 3) {
    if (!teachDone(q)) return '실험 카드를 골라 생각 친구를 설득해 봐.';
    if (!q.judgment) return '지금 내 생각에 가까운 것을 골라 줘.';
    if (size(q.final) < 1) return '지금 내 생각을 말해 줘.';
    if (!q.confidenceAfter) return '지금은 얼마나 확신하는지 골라 줘.';
    if (!q.challenge) return '친구의 새 예측을 들어 봐.';
    if (!q.challenge.judgment) return '친구 예측이 맞는지 판단해 줘.';
    if (!q.challenge.observed) return '실험으로 확인해 봐.';
  }
  return null;
}
export function thinkingGuard(d: Draft): string | null {
  return d.thinking ? stepError(d.thinking, d.step) : '첫 탐구를 다시 열어 줘.';
}
export function thinkingComplete(d: Draft) {
  const q = d.thinking;
  return Boolean(q && d.step === 4 && [0, 1, 2, 3].every((s) => !stepError(q, s)));
}

// Levels come only from recorded events, never from text length.
export function deriveSkills(q: ThinkingInquiry): SkillResult[] {
  const ladder = (helped: number): SkillLevel =>
    helped <= 0 ? 'independent' : helped === 1 ? 'afterProbe' : 'afterExplanation';
  const fairIndex = q.experiments.findIndex(isFair);
  const unfairBefore = q.experiments
    .slice(0, Math.max(fairIndex, 0))
    .filter((e) => !isFair(e)).length;
  const convincedIndex = q.exchanges.findIndex((x) => x.convinced);
  const light = q.finalClaims.find((c) => c.variable === 'lightHeight');
  return [
    {
      skill: 'predict',
      level:
        q.prediction && q.prediction !== 'unknown' && !q.reasonSkipped && size(q.reason) > 0
          ? 'independent'
          : 'notShown',
      quote: q.reasonSkipped ? '' : q.reason,
    },
    { skill: 'fairTest', level: fairIndex < 0 ? 'notShown' : ladder(unfairBefore), quote: '' },
    {
      skill: 'evidence',
      level: convincedIndex < 0 ? 'notShown' : ladder(convincedIndex),
      quote: convincedIndex < 0 ? '' : (q.exchanges[convincedIndex]?.message ?? ''),
    },
    {
      skill: 'revise',
      level: light?.effect === LIGHT_TRUTH ? 'independent' : 'notShown',
      quote: q.final,
    },
    {
      skill: 'transfer',
      level: q.challenge && challengeCorrect(q.challenge) ? 'independent' : 'notShown',
      quote: q.challenge?.reason ?? '',
    },
  ];
}

export function thinkingTransition(
  draft: Draft,
  event: LearningEvent,
): { draft: Draft; error?: string } {
  const d = structuredClone(draft),
    q = d.thinking;
  if (!q) return { draft, error: '첫 탐구를 다시 열어 줘.' };
  const fail = (error: string) => ({ draft, error });
  const experiment = (id: string) => q.experiments.find((e) => e.id === id);

  switch (event.type) {
    case 'think-predict':
      if (d.step === 0) q.prediction = event.prediction;
      break;
    case 'think-reason':
      if (d.step === 0) {
        q.reason = event.value.slice(0, 500);
        q.origin = event.origin;
        if (event.value.trim()) q.reasonSkipped = false;
      }
      break;
    case 'think-skip-reason':
      if (d.step === 0) q.reasonSkipped = event.skipped;
      break;
    case 'think-confidence':
      if (event.when === 'before' && d.step === 0) q.confidenceBefore = event.value;
      if (event.when === 'after' && d.step === 3 && !q.challenge) q.confidenceAfter = event.value;
      break;
    case 'think-interpret':
      if (d.step === 1 && !q.friendLine) {
        q.claims = event.claims;
        q.restatement = event.restatement.slice(0, 200);
        q.friendBeliefId = event.friendBeliefId;
        q.friendLine = event.friendLine.slice(0, 200);
        q.friendVariable = event.friendVariable;
        q.interpretSource = event.source;
        q.restatementConfirmed = false;
      }
      break;
    case 'think-restatement':
      if (d.step === 1 && q.friendLine) q.restatementConfirmed = event.confirmed;
      break;
    case 'think-back':
      if (d.step === 1) {
        d.step = 0;
        d.thinking = {
          ...emptyThinking(),
          prediction: q.prediction,
          reason: q.reason,
          reasonSkipped: q.reasonSkipped,
          origin: q.origin,
          confidenceBefore: q.confidenceBefore,
        };
      }
      break;
    case 'think-plan':
      if (d.step === 1) q.checkPlan = event.value.slice(0, 300);
      break;
    case 'think-experiment': {
      if (d.step !== 2) break;
      if (q.experiments.length >= MAX_EXPERIMENTS) return fail('실험은 다섯 번까지 할 수 있어.');
      if (q.experiments.some((e) => !e.observed)) return fail('앞 실험의 결과를 먼저 살펴봐 줘.');
      if (!isSetup(event.compare) || experiment(event.id)) return fail('실험을 다시 만들어 줘.');
      if (![event.baseLength, event.compareLength].every((n) => Number.isFinite(n) && n > 0))
        return fail('실험 결과를 계산하지 못했어. 다시 해 볼까?');
      const changed = changedVars(BASE_SETUP, event.compare);
      if (!changed.length) return fail('무엇을 바꿀지 하나 이상 골라 줘.');
      const unfairBefore = q.experiments.filter((e) => !isFair(e)).length;
      q.experiments.push({
        id: event.id,
        base: { ...BASE_SETUP },
        compare: { ...event.compare },
        baseLength: event.baseLength,
        compareLength: event.compareLength,
        prediction: event.prediction,
        observed: false,
        feedback: changed.length > 1 ? HELP_ORDER[Math.min(unfairBefore, 2)]! : null,
        surprise: '',
      });
      break;
    }
    case 'think-observe': {
      const e = experiment(event.id);
      if (d.step === 2 && e) e.observed = true;
      break;
    }
    case 'think-surprise': {
      const e = experiment(event.id);
      if (d.step === 2 && e?.observed) e.surprise = event.value.slice(0, 300);
      break;
    }
    case 'think-teach': {
      if (d.step !== 3 || q.convinced) break;
      const observed = new Set(q.experiments.filter((e) => e.observed).map((e) => e.id));
      if (!event.exchange.cardIds.every((id) => observed.has(id)))
        return fail('살펴본 실험 카드만 보여 줄 수 있어.');
      q.exchanges.push({
        ...event.exchange,
        message: event.exchange.message.slice(0, 500),
        reply: event.exchange.reply.slice(0, 300),
      });
      q.convinced = event.exchange.convinced;
      break;
    }
    case 'think-judge':
      if (d.step === 3 && teachDone(q) && !q.challenge && q.judgment !== event.judgment) {
        q.judgment = event.judgment;
        q.final = event.judgment === 'keep' ? q.restatement : '';
        q.finalReason = '';
      }
      break;
    case 'think-final':
      if (d.step === 3 && q.judgment && !q.challenge) q[event.field] = event.value.slice(0, 500);
      break;
    case 'think-challenge':
      if (d.step === 3 && !q.challenge && teachDone(q) && finalReady(q)) {
        if (!isSetup(event.challenge.base) || !isSetup(event.challenge.compare))
          return fail('새 예측을 다시 받아 줘.');
        q.challenge = { ...event.challenge, judgment: null, reason: '', observed: false };
        q.finalClaims = event.finalClaims;
      }
      break;
    case 'think-challenge-judge':
      if (d.step === 3 && q.challenge && !q.challenge.observed)
        q.challenge.judgment = event.judgment;
      break;
    case 'think-challenge-reason':
      if (d.step === 3 && q.challenge && !q.challenge.observed)
        q.challenge.reason = event.value.slice(0, 300);
      break;
    case 'think-challenge-observe':
      if (d.step === 3 && q.challenge?.judgment) q.challenge.observed = true;
      break;
    case 'advance': {
      const error = stepError(q, d.step);
      if (error) return fail(error);
      if (d.step >= 4) return { draft };
      if (d.step === 3) q.skills = deriveSkills(q);
      d.step++;
      break;
    }
    default:
      return { draft };
  }
  d.updatedAt = new Date().toISOString();
  return { draft: d };
}
