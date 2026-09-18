import { CATALOG, FORESTS } from '../data/catalog';
import { CONDITIONS, JUDGMENTS, inquiryComplete, inquiryGuard, inquiryTransition } from './inquiry';
import {
  CHALLENGE_JUDGMENT_LABEL,
  PREDICTION_LABEL,
  deriveSkills,
  emptyThinking,
  thinkingComplete,
  thinkingGuard,
  thinkingTransition,
} from './thinking';
import type {
  Draft,
  Answer,
  LearningEvent,
  Level,
  Rubric,
  SessionRecord,
  Story,
  Track,
  VillageData,
} from '../types/village';

export function count(text: string) {
  return [...text.replace(/\s/g, '')].length;
}
export function localDate(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
export function average(r: Rubric) {
  return Math.round((r.observe + r.reason + r.express) / 3);
}
export function score(text: string): Rubric {
  const n = count(text);
  return {
    observe: Math.min(
      100,
      15 +
        Math.min(45, n) +
        (/보|단서|관찰|달라|같|다른|발자국|젖|그림자|무게/.test(text) ? 30 : 0),
    ),
    reason: Math.min(
      100,
      10 +
        Math.min(45, n) +
        (/때문|왜냐|그래서|만약|이유|확인|비교|모르|알 수/.test(text) ? 35 : 0),
    ),
    express: Math.min(
      100,
      20 + Math.round(Math.min(65, n)) + (/[.!?]|어요|해요|생각/.test(text) ? 10 : 0),
    ),
  };
}
export function gateSize(data: VillageData) {
  // Thinking-skill records carry no score, so they never tune the writing gate.
  const last = data.sessions.find((s) => s.source === 'local' && s.rubric)?.rubric;
  const level: Level =
    data.settings.autoTune && last
      ? average(last) < 40
        ? '쉬움'
        : average(last) >= 75
          ? '도전'
          : '보통'
      : data.settings.gate;
  return { 쉬움: 8, 보통: 15, 도전: 25 }[level];
}
export function blockedKeyword(keyword: string) {
  return /(살인|자살|자해|성폭|성관계|음란|포르노|마약|폭탄|고문|죽이|죽여)/i.test(
    keyword.replace(/\s/g, ''),
  );
}
export function makeStory(id: string, keyword: string): Story {
  if (id === 'courage')
    return {
      title: '처음 무대에 서는 날',
      keyword,
      scenes: [
        `“${keyword}”를 생각하는 날, 토끼와 곰은 작은 음악회를 준비했어요.`,
        '토끼가 “틀리면 어떡하지?”라며 무대 뒤에서 망설였어요. 곰도 처음에는 두근거렸대요.',
        '두 친구는 무대에 오르기 전에 서로의 마음을 나누기로 했어요.',
        '토끼는 준비한 만큼 천천히 노래했어요. 곰은 옆에서 박자를 맞춰 주었어요. 작은 한 걸음도 소중한 용기였어요.',
      ],
      branches: [
        '곰이 “어떤 부분이 걱정돼?”라고 물었어요. 토끼는 첫 소절을 같이 연습해 달라고 부탁했어요.',
        '곰이 “나도 처음에는 떨렸어”라고 말했어요. 토끼는 혼자만 그런 게 아니라는 걸 알고 숨을 천천히 쉬었어요.',
      ],
    };
  if (id === 'waiting')
    return {
      title: '천천히 완성하는 우리 그림',
      keyword,
      scenes: [
        `“${keyword}”를 생각하며 토끼와 곰이 커다란 그림을 그려요.`,
        '토끼는 벌써 색칠을 마쳤지만 곰은 아직 선을 그리고 있어요. 토끼는 빨리 전시하고 싶었어요.',
        '두 친구는 원하는 것이 무엇인지 말해 보기로 했어요.',
        '토끼와 곰은 서로의 속도를 맞추어 그림을 완성했어요. 함께 기다린 시간도 그림의 한 부분이 되었어요.',
      ],
      branches: [
        '토끼가 “어떤 부분을 더 그리고 싶어?”라고 물었어요. 곰은 좋아하는 나무를 자세히 그리고 싶다고 말했어요.',
        '토끼가 “나는 우리 그림을 빨리 보여 주고 싶어”라고 말했어요. 곰은 남은 부분을 함께 그려 보자고 했어요.',
      ],
    };
  return {
    title: '함께 만드는 작은 다리',
    keyword,
    scenes: [
      `“${keyword}”를 생각하는 날, 토끼와 곰은 시냇가에 작은 다리를 만들기로 했어요.`,
      '토끼는 빨리 건너고 싶었어요. 곰은 다리가 튼튼한지 더 살펴보고 싶었지요. “우리 생각이 다른 것 같아.”',
      '두 친구는 잠시 멈추고 서로의 생각을 나누기로 했어요.',
      '토끼와 곰은 함께 살펴보고 다리를 고쳤어요. 서로의 마음을 물어보니 혼자서는 떠올리지 못한 생각이 생겼어요.',
    ],
    branches: [
      '토끼가 “무엇이 걱정돼?”라고 물었어요. 곰은 흔들리는 나무판을 가리켰어요. 토끼는 고개를 끄덕였어요.',
      '토끼가 “나는 빨리 건너고 싶었어”라고 말했어요. 곰은 마음을 이해한 뒤, 흔들리는 나무판을 함께 살펴보자고 했어요.',
    ],
  };
}
export function createDraft(track: Track, activityId: string, min: number, keyword = ''): Draft {
  const activity = CATALOG.find((a) => a.id === activityId && a.track === track);
  if (!activity) throw new Error('활동을 찾을 수 없어요.');
  const at = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    track,
    activityId,
    title: activity.title,
    startedAt: at,
    updatedAt: at,
    min,
    step: 0,
    text: '',
    answers: [],
    followup: '',
    hints: 0,
    ...(activityId === 'first-inquiry' ? { thinking: emptyThinking() } : {}),
    lab: {
      mode: activityId === 'balance' ? 'balance' : activityId === 'custom' ? 'custom' : 'shadow',
      topic: '',
      value: 50,
      low: false,
      high: false,
      a: '',
      b: '',
      source: '',
      prediction: '',
    },
    theater: { keyword, story: null, scene: 0, choice: null, emotion: '', approved: false },
  };
}
export function hasObservations(d: Draft) {
  return d.lab.mode === 'custom'
    ? count(d.lab.a) >= 3 &&
        count(d.lab.b) >= 3 &&
        d.lab.a.replace(/\s/g, '') !== d.lab.b.replace(/\s/g, '')
    : d.lab.low && d.lab.high;
}
export function writingStep(d: Draft) {
  return d.track === 'forest'
    ? d.step >= 1 && d.step <= 3
    : d.track === 'lab'
      ? [1, 3, 4].includes(d.step)
      : d.step === 3;
}
export function guard(d: Draft): string | null {
  if (d.activityId === 'first-inquiry') return d.thinking ? thinkingGuard(d) : inquiryGuard(d);
  if (writingStep(d) && count(d.text) < d.min)
    return `공백을 빼고 ${d.min}자 이상, 내 생각을 먼저 적어 주세요.`;
  if (d.track === 'lab') {
    if (d.step === 0 && d.lab.mode === 'custom' && count(d.lab.topic) < 2)
      return '궁금한 주제를 두 글자 이상 적어 주세요.';
    if (d.step === 2 && !hasObservations(d))
      return d.lab.mode === 'custom'
        ? '서로 다른 두 가지 관찰을 각각 세 글자 이상 적어 주세요.'
        : '30 이하와 70 이상의 두 조건을 모두 관찰해 주세요.';
  }
  if (d.track === 'theater') {
    if (d.step === 0 && count(d.theater.keyword) < 2)
      return '이야기에 담을 마음 키워드를 두 글자 이상 적어 주세요.';
    if (d.step === 1 && !d.theater.approved)
      return '보호자가 대본과 두 가지 분기를 먼저 확인해 주세요.';
    if (d.step === 2 && (d.theater.scene !== 3 || d.theater.choice === null))
      return '이야기를 끝까지 보고 내가 할 행동을 골라 주세요.';
    if (d.step === 3 && !d.theater.emotion) return '이야기를 보며 느낀 마음을 하나 골라 주세요.';
  }
  return null;
}
// All progress changes pass this pure transition function; disabled buttons are only a UI aid.
export function transition(draft: Draft, event: LearningEvent): { draft: Draft; error?: string } {
  if (draft.activityId === 'first-inquiry')
    return draft.thinking ? thinkingTransition(draft, event) : inquiryTransition(draft, event);
  const d = structuredClone(draft);
  const fail = (error: string) => ({ draft, error });
  if (event.type === 'text') d.text = event.text.slice(0, 2000);
  if (event.type === 'hint') d.hints++;
  if (event.type === 'lab-value' && d.track === 'lab' && d.step === 2) {
    d.lab.value = Math.max(10, Math.min(90, event.value));
    d.lab.low ||= d.lab.value <= 30;
    d.lab.high ||= d.lab.value >= 70;
  }
  if (event.type === 'observation' && d.track === 'lab' && d.step === 2)
    d.lab[event.field] = event.value.slice(0, 400);
  if (event.type === 'approve' && d.track === 'theater' && d.step === 1) d.theater.approved = true;
  if (event.type === 'emotion' && d.track === 'theater' && d.step === 3)
    d.theater.emotion = event.emotion;
  if (event.type === 'scene' && d.track === 'theater' && d.step === 2) {
    if (event.direction === 1 && d.theater.scene === 1 && d.theater.choice === null)
      return fail('내가 할 행동을 먼저 골라 주세요.');
    d.theater.scene = Math.min(3, Math.max(0, d.theater.scene + event.direction));
  }
  if (event.type === 'choice' && d.track === 'theater' && d.step === 2 && d.theater.scene === 1) {
    if (![0, 1].includes(event.choice) || !d.theater.story)
      return fail('선택을 다시 확인해 주세요.');
    d.theater.choice = event.choice;
    d.theater.story.scenes[2] = d.theater.story.branches[event.choice] ?? '';
    d.theater.scene = 2;
  }
  if (event.type === 'advance') {
    const error = guard(d);
    if (error) return fail(error);
    if (d.track === 'forest') {
      if (d.step >= 4) return { draft };
      if (d.step >= 1) {
        const question = FORESTS[d.activityId]?.questions[d.step - 1] ?? '';
        d.answers.push({ question, text: d.text.trim() });
        d.followup = `“${d.text.trim().slice(0, 100)}”라고 말했구나. 직접 본 것과 더 확인하고 싶은 것은 무엇일까?`;
        d.text = '';
      }
    }
    if (d.track === 'lab') {
      if (d.step >= 5) return { draft };
      if (d.step === 0) {
        if (blockedKeyword(d.lab.topic))
          return fail('이 주제로는 활동을 준비할 수 없어요. 다른 주제를 골라 주세요.');
        if (d.lab.mode === 'custom' && /그림자|빛/.test(d.lab.topic)) {
          d.lab.mode = 'shadow';
          d.title = '그림자는 왜 달라질까?';
        } else if (d.lab.mode === 'custom' && /저울|무게/.test(d.lab.topic)) {
          d.lab.mode = 'balance';
          d.title = '저울은 언제 나란해질까?';
        } else if (d.lab.mode === 'custom') d.title = `${d.lab.topic} 관찰 노트`;
      }
      if (writingStep(d)) {
        if (d.step === 1) d.lab.prediction = d.text.trim();
        const question =
          d.step === 1
            ? '관찰하기 전, 내 예상'
            : d.step === 3
              ? '직접 관찰해서 발견한 것'
              : '다른 조건에서도 그럴까? 더 확인하고 싶은 것';
        d.answers.push({ question, text: d.text.trim() });
        d.followup = `“${d.text.trim().slice(0, 100)}”라고 생각했구나. 다른 조건에서도 같을지, 어떻게 확인할 수 있을까?`;
        d.text = '';
      }
    }
    if (d.track === 'theater') {
      if (d.step >= 4) return { draft };
      if (d.step === 0) {
        if (blockedKeyword(d.theater.keyword))
          return fail(
            '이 키워드로는 이야기를 준비할 수 없어요. 보호자와 다른 키워드를 골라 주세요.',
          );
        d.theater.story = makeStory(d.activityId, d.theater.keyword);
      }
      if (d.step === 3) {
        d.answers.push({ question: '친구에게 건넬 말과 그 이유', text: d.text.trim() });
        d.text = '';
      }
    }
    d.step++;
  }
  d.updatedAt = new Date().toISOString();
  return { draft: d };
}
export function readyToComplete(d: Draft) {
  if (d.activityId === 'first-inquiry')
    return d.thinking ? thinkingComplete(d) : inquiryComplete(d);
  if (d.track === 'forest')
    return d.step === 4 && d.answers.length === 3 && d.answers.every((a) => count(a.text) >= d.min);
  if (d.track === 'lab')
    return (
      d.step === 5 &&
      hasObservations(d) &&
      d.answers.length === 3 &&
      d.answers.every((a) => count(a.text) >= d.min)
    );
  return (
    d.step === 4 &&
    d.theater.approved &&
    d.theater.scene === 3 &&
    d.theater.choice !== null &&
    Boolean(d.theater.emotion) &&
    d.answers.length === 1 &&
    count(d.answers[0]?.text ?? '') >= d.min
  );
}
export function scoreAnswers(answers: Answer[]): Rubric {
  const scores = answers.map((a) => score(a.text));
  return Object.fromEntries(
    (['observe', 'reason', 'express'] as const).map((k) => [
      k,
      scores.length ? Math.round(scores.reduce((sum, r) => sum + r[k], 0) / scores.length) : 0,
    ]),
  ) as Rubric;
}
export function toRecord(d: Draft): SessionRecord {
  if (!readyToComplete(d)) throw new Error('모든 단계를 마친 뒤 기록을 남길 수 있어요.');
  const t = d.thinking;
  if (t) {
    const taught = t.exchanges.find((x) => x.convinced) ?? t.exchanges[t.exchanges.length - 1];
    const answers: Answer[] = [
      {
        question: '처음 예측과 이유',
        text: `${PREDICTION_LABEL[t.prediction ?? 'unknown']}\n이유: ${t.reasonSkipped ? '아직 설명하기 어려웠어요.' : t.reason}`,
      },
      { question: '생각 친구에게 한 설명', text: taught?.message ?? '' },
      {
        question: t.judgment ? JUDGMENTS[t.judgment] : '지금 내 생각',
        text: `${t.final}\n이유: ${t.finalReason}`,
      },
      {
        question: '친구의 새 예측 판단',
        text: t.challenge?.judgment
          ? `${CHALLENGE_JUDGMENT_LABEL[t.challenge.judgment]}\n이유: ${t.challenge.reason}`
          : '',
      },
    ];
    return {
      id: d.id,
      track: d.track,
      activityId: d.activityId,
      title: d.title,
      date: localDate(),
      completedAt: new Date().toISOString(),
      durationMinutes: Math.max(1, Math.round((Date.now() - Date.parse(d.startedAt)) / 60000)),
      source: 'local',
      text: answers.map((a) => a.text).join('\n\n'),
      answers,
      favorite: false,
      thinking: { ...t, skills: deriveSkills(t) },
    };
  }
  const q = d.inquiry;
  const answers = q
    ? [
        { question: '처음 생각과 이유', text: `${q.initial}\n이유: ${q.reason}` },
        { question: '내가 확인한 뜻', text: q.meaning },
        {
          question: '내가 살펴본 조건과 결과',
          text: q.observed.map((c) => `${CONDITIONS[c].label}: ${CONDITIONS[c].result}`).join('\n'),
        },
        {
          question: q.judgment ? JUDGMENTS[q.judgment] : '',
          text: `${q.final}\n이유: ${q.finalReason}`,
        },
      ]
    : d.answers;
  const rubric = scoreAnswers(
    q
      ? [
          { question: '처음 생각', text: `${q.initial} ${q.reason}` },
          { question: '지금 생각', text: `${q.final} ${q.finalReason}` },
        ]
      : answers,
  );
  return {
    id: d.id,
    track: d.track,
    activityId: d.activityId,
    title: d.title,
    date: localDate(),
    completedAt: new Date().toISOString(),
    durationMinutes: Math.max(1, Math.round((Date.now() - Date.parse(d.startedAt)) / 60000)),
    source: 'local',
    text: answers.map((a) => a.text).join('\n\n'),
    answers,
    rubric,
    favorite: false,
    ...(q ? { inquiry: q } : {}),
    ...(d.track === 'lab' && !q ? { observations: d.lab } : {}),
    ...(d.track === 'theater' && d.theater.story
      ? { story: d.theater.story, choice: d.theater.choice ?? 0, emotion: d.theater.emotion }
      : {}),
  };
}
