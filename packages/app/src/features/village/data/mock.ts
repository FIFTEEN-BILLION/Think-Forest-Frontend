import { CATALOG } from './catalog';
import { localDate, makeStory } from '../lib/learning';
import type { SessionRecord, VillageData } from '../types';

// Deliberately fictional records, always labeled and excluded from adaptive difficulty.
export function mockSessions(now = new Date()): SessionRecord[] {
  const examples = [
    [
      'honey',
      1,
      '식탁 아래 작은 발자국이 보였어요. 곰이 옆에 있었다고 가져갔다고 말할 수는 없어요.',
      '다람쥐가 무엇을 직접 보았는지 물어보고 싶어요.',
      '꿀단지를 옮기는 모습을 본 친구가 있는지 확인할래요.',
    ],
    [
      'shadow',
      2,
      '빛이 높아지면 그림자가 짧아질 것 같아요.',
      '빛을 낮추니 그림자가 길어졌고 높이니 짧아졌어요.',
      '막대기 높이를 같게 두고 다시 비교해 보고 싶어요.',
    ],
    [
      'kindness',
      3,
      '친구에게 무엇이 걱정되는지 물어보고 싶어요. 서로 다른 마음을 먼저 알면 함께 다리를 고칠 수 있기 때문이에요.',
      '',
      '',
    ],
    [
      'seed',
      4,
      '창가 화분에만 싹이 있고 다른 화분은 흙이 말랐어요.',
      '씨앗의 종류도 달라서 빛 때문인지 아직 모르겠어요.',
      '같은 씨앗과 같은 양의 물로 비교해야 해요.',
    ],
    [
      'balance',
      5,
      '양쪽 추의 무게가 같아지면 저울이 나란해질 것 같아요.',
      '왼쪽을 무겁게 하니 왼쪽이 내려갔어요.',
      '다른 무게로도 두 쪽이 같을 때 나란한지 확인하고 싶어요.',
    ],
    [
      'courage',
      6,
      '나도 처음에는 떨린다고 말해 줄래요. 같이 첫 소절을 연습하면 혼자라는 마음이 들지 않을 것 같아요.',
      '',
      '',
    ],
    [
      'umbrella',
      8,
      '우산이 젖었다는 것은 보이지만 이유는 아직 몰라요.',
      '분수에서 젖었을 수도 있어요.',
      '여우에게 어디서 우산을 썼는지 물어볼래요.',
    ],
    [
      'waiting',
      10,
      '친구가 그리고 싶은 것을 물어볼래요. 기다리는 동안 나도 나무를 자세히 살펴볼 수 있어요.',
      '',
      '',
    ],
    [
      'shadow',
      12,
      '그림자가 어떻게 움직이는지 궁금해요.',
      '빛을 움직였더니 그림자가 달라졌어요.',
      '다른 물건도 바꾸어 보고 싶어요.',
    ],
  ] as const;
  return examples.map(([id, days, first, second, third], index) => {
    const activity = CATALOG.find((a) => a.id === id)!;
    const at = new Date(now);
    at.setDate(at.getDate() - days);
    at.setHours(16, 10 + index, 0, 0);
    const answers = [first, second, third].filter(Boolean).map((text, i) => ({
      question:
        activity.track === 'theater'
          ? '친구에게 건넬 말과 그 이유'
          : ['처음 생각', '직접 살펴본 뒤의 생각', '더 확인하고 싶은 것'][i]!,
      text,
    }));
    return {
      id: `example-${id}-${index}`,
      track: activity.track,
      activityId: id,
      title: activity.title,
      date: localDate(at),
      completedAt: at.toISOString(),
      durationMinutes: activity.duration,
      source: 'mock',
      text: answers.map((a) => a.text).join('\n\n'),
      answers,
      rubric: { observe: 85 - index * 3, reason: 82 - index * 3, express: 88 - index * 2 },
      favorite: index === 0 || index === 2,
      ...(activity.track === 'theater'
        ? {
            story: {
              ...makeStory(id, activity.tags[0]!),
              scenes: makeStory(id, activity.tags[0]!).scenes.map((s, i) =>
                i === 2 ? makeStory(id, activity.tags[0]!).branches[0]! : s,
              ),
            },
            choice: 0,
            emotion: '뿌듯했어요',
          }
        : {}),
      ...(activity.track === 'lab'
        ? {
            observations: {
              mode: id === 'balance' ? ('balance' as const) : ('shadow' as const),
              topic: '',
              value: 80,
              low: true,
              high: true,
              a: '',
              b: '',
              source: '',
              prediction: first,
            },
          }
        : {}),
    };
  });
}
export function initialData(withExamples = true): VillageData {
  return {
    version: 1,
    profile: {
      name: '지우',
      grade: '초등학교 1학년',
      interests: ['공룡', '동물', '우주'],
      goal: '내 생각의 이유를 말하는 힘',
    },
    settings: {
      gate: '보통',
      autoTune: true,
      tts: true,
      parentPreview: true,
      theme: 'auto',
      retention: 90,
    },
    consent: { done: false, ageBand: '', guardian: '', noticeAt: null, thirdParty: false },
    onboarding: { step: 0, ageBand: '', guardian: '', acknowledged: false, childPolicy: false },
    diagnosis: null,
    diagnosticDraft: { index: 0, answers: ['', '', ''] },
    sessions: withExamples ? mockSessions() : [],
    safety: [],
    resume: null,
    summary: null,
  };
}
