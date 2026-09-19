import type { Model } from '../schema';
import { CATALOG, FORESTS, PLACES } from '../../data/catalog';

export const now = () => new Date().toISOString();
export const id = (kind: string) => `mock-${kind}-${crypto.randomUUID()}`;
export type Story = Model<'app__v1__schemas_conversation__StoryOut'>;
export const activities: Model<'ActivityDetail'>[] = CATALOG.map((a) => ({
  ...a,
  area: PLACES[a.track].area,
  place: PLACES[a.track].name,
  estimatedMinutes: a.duration,
  minCharacters: 8,
  intro: FORESTS[a.id]?.intro ?? a.description,
  clue: FORESTS[a.id]?.clue ?? null,
  steps:
    a.id === 'first-inquiry'
      ? ['처음 생각', '친구 생각', '공정한 실험', '지금 생각', '처음과 지금']
      : [...PLACES[a.track].steps],
  questions: FORESTS[a.id]?.questions ?? [
    '무엇이 궁금한가요?',
    '무엇을 발견했나요?',
    '생각이 어떻게 달라졌나요?',
  ],
  visuals: {
    kind: a.track,
    icon: PLACES[a.track].icon,
    color: PLACES[a.track].color,
    items:
      FORESTS[a.id]?.evidence ??
      (a.track === 'theater' ? ['기쁨', '걱정', '고마움', '용기'] : ['낮은 빛', '높은 빛']),
  },
}));

export function makeStory(title: string, body: string, category = 'SCIENCE'): Story {
  const at = now();
  return {
    id: id('story'),
    title,
    summary: body.slice(0, 100),
    body,
    category,
    thoughtJourney: {
      initialIdea: '처음에는 눈에 보이는 모습으로 생각했어요.',
      evidence: ['두 조건을 나란히 살펴보았어요.'],
      alternatives: ['다른 이유도 있을지 생각했어요.'],
      finalReflection: '다음에는 한 가지 조건만 바꾸어 확인하고 싶어요.',
    },
    topic: { id: null, title, category },
    favorite: false,
    version: 1,
    sourceConversationId: '',
    createdAt: at,
    updatedAt: at,
  };
}

export function seed() {
  const at = now();
  const profile: Model<'app__v1__schemas_accounts__ProfileOut'> = {
    id: 'mock-profile',
    nickname: '새싹',
    schoolOrGroup: '생각마을',
    gradeOrAgeBand: '초등학교 2학년',
    interests: ['동물', '우주', '만들기'],
    interestDetails: [],
    growthGoal: '내 생각의 이유 말하기',
    summary: '작은 궁금증을 발견하는 새싹이에요.',
    version: 1,
    role: 'OWNER',
    permissions: [],
    isDefault: true,
    needsFirstGreeting: false,
    createdAt: at,
    updatedAt: at,
  };
  const settings: Model<'SettingsOut'> = {
    profileId: profile.id,
    voiceEnabled: false,
    ttsEnabled: false,
    guardianPreviewEnabled: true,
    theme: 'LIGHT',
    retentionDays: 90,
    version: 1,
    updatedAt: at,
  };
  const stories = [
    makeStory(
      '얼음컵의 물방울은 어디서 왔을까?',
      '차가운 컵 바깥에 작은 물방울이 맺혔어요. 처음에는 컵 속 물이 새어 나온 줄 알았어요. 빈 컵과 차가운 컵을 비교하니 차가운 컵에서만 물방울이 보였어요. 공기 속의 물이 차가운 컵을 만나 모인다는 생각이 들었어요.',
    ),
    makeStory(
      '씨앗에게 필요한 세 가지 선물',
      '같은 날 심은 씨앗이 다르게 자랐어요. 물과 햇빛, 흙을 나누어 관찰했어요. 이번에는 물의 양을 같게 하고 햇빛만 다르게 해 보고 싶어요.',
      'NATURE',
    ),
    makeStory(
      '친구를 기다리는 마음',
      '그림을 천천히 그리는 친구에게 무엇을 그리고 싶은지 물어보았어요. 서로의 속도가 달라도 함께 완성하면 더 즐겁다는 걸 알게 되었어요.',
      'FEELINGS',
    ),
  ];
  stories.forEach((s, i) => {
    s.id = `mock-story-${i + 1}`;
  });
  stories[0]!.favorite = true;
  const words: Model<'WordbookEntryOut'>[] = [
    ['관찰', '사물이나 현상을 자세히 살펴보는 것', '작은 새싹이 자라는 모습을 관찰했어요.'],
    ['응결', '공기 속 수증기가 차가워져 물방울이 되는 것', '차가운 컵에 응결로 물방울이 맺혔어요.'],
    ['배려', '다른 사람의 마음과 처지를 생각하는 것', '친구가 말할 때 기다려 주는 것도 배려예요.'],
    [
      '가설',
      '어떤 일이 일어난 이유를 미리 생각해 보는 것',
      '햇빛이 있으면 더 잘 자랄 것이라는 가설을 세웠어요.',
    ],
  ].map(([word, meaning, example], i) => ({
    id: `mock-word-${i + 1}`,
    word: word!,
    reading: word!,
    meaning: meaning!,
    example: example!,
    mySentence: null,
    status: i === 0 ? 'FAMILIAR' : i === 1 ? 'PRACTICING' : 'NEW',
    source: { conversationId: null, messageId: null },
    meaningSource: 'fallback',
    sourceSentence: example!,
    lastReviewedAt: null,
    nextReviewAt: null,
    createdAt: at,
    updatedAt: at,
  }));
  const topics: Model<'TopicDetail'>[] = [
    [
      'topic_ice_cup',
      '얼음컵의 물방울은 어디서 왔을까?',
      'SCIENCE',
      '컵 바깥의 작은 물방울을 함께 관찰해 보자.',
    ],
    [
      'mock-topic-seed',
      '씨앗은 어떻게 봄이 온 걸 알까?',
      'NATURE',
      '작은 씨앗이 자라려면 무엇이 필요할까?',
    ],
    [
      'mock-topic-friend',
      '친구와 생각이 다르면 어떻게 할까?',
      'FEELINGS',
      '서로 다른 마음을 듣는 방법을 찾아보자.',
    ],
    [
      'mock-topic-moon',
      '달에 놀이터를 만든다면?',
      'IMAGINATION',
      '중력이 작은 곳에서 어떤 놀이를 할 수 있을까?',
    ],
  ].map(([topicId, title, category, hook]) => ({
    id: topicId!,
    title: title!,
    category: category!,
    hook: hook!,
    source: 'BANK',
    estimatedMinutes: 10,
    questions: ['네 생각은 어때?', '왜 그렇게 생각했어?', '다른 방법도 있을까?'],
  }));
  const community: Model<'PublicStoryDetail'>[] = stories.map((s, i) => ({
    id: `mock-public-${i + 1}`,
    title: s.title,
    excerpt: s.summary,
    body: s.body,
    category: s.category,
    author: { displayName: ['달빛토끼', '초록나무', '구름고래'][i]!, ageBand: '초등 저학년' },
    recommendationCount: [12, 8, 6][i]!,
    recommendedByMe: false,
    recommendationReason: '생각을 나누어요',
    guardianApproved: true,
    publishedAt: at,
    thoughtJourney: s.thoughtJourney,
  }));
  const books: Model<'BookDetail'>[] = [
    {
      id: 'mock-book-1',
      title: '새싹의 첫 생각책',
      introduction: '작은 궁금증이 모여 한 권의 책이 되었어요.',
      cover: { theme: 'green', emoji: '🌱' },
      status: 'COMPLETED',
      storyCount: 2,
      version: 1,
      createdAt: at,
      updatedAt: at,
      completedAt: at,
      introductionSource: 'fallback',
      stories: stories.slice(0, 2),
    },
  ];
  return { profile, settings, stories, words, topics, community, books };
}
