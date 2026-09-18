import type { CatalogActivity, Track } from '../types/village';

export const PLACES = {
  forest: {
    name: '우리 아이 생각친구, 티키',
    area: '사고력',
    color: 'violet',
    icon: 'tree',
    line: '단서를 살펴보고, 내 생각의 이유를 찾아요.',
    description: '이야기 속 작은 단서를 모아 나만의 생각을 꺼내는 곳',
    steps: [
      '이야기 만나기',
      '내 생각 꺼내기',
      '새 단서 살펴보기',
      '생각 정리하기',
      '모험 돌아보기',
    ],
  },
  lab: {
    name: '호기심 실험실',
    area: '과학 · 수학 · 역사',
    color: 'teal',
    icon: 'flask',
    line: '직접 바꾸고 관찰하며, 궁금함을 발견해요.',
    description: '궁금한 것을 예상하고 직접 바꾸며 발견하는 곳',
    steps: [
      '활동 준비하기',
      '먼저 예상하기',
      '직접 관찰하기',
      '발견 설명하기',
      '다시 생각하기',
      '발견 돌아보기',
    ],
  },
  theater: {
    name: '마음극장',
    area: '인성 · 애니메이션',
    color: 'coral',
    icon: 'theater',
    line: '이야기 속 친구가 되어, 서로의 마음을 읽어요.',
    description: '친구의 마음을 만나고 내가 건넬 말을 생각하는 곳',
    steps: [
      '이야기 준비하기',
      '보호자 미리보기',
      '이야기와 선택',
      '내 마음 표현하기',
      '마음 돌아보기',
    ],
  },
} as const;
export const TRACKS: Track[] = ['forest', 'lab', 'theater'];
export const GRADES = ['미취학', ...Array.from({ length: 6 }, (_, i) => `초등학교 ${i + 1}학년`)];
export const INTERESTS = ['공룡', '동물', '우주', '식물', '음악', '만들기', '옛날이야기', '운동'];
export const RUBRIC = [
  { key: 'observe', label: '관찰력', color: '--c1', symbol: '●' },
  { key: 'reason', label: '이유 찾기', color: '--c2', symbol: '■' },
  { key: 'express', label: '표현력', color: '--c3', symbol: '▲' },
] as const;
export const FORESTS: Record<
  string,
  { title: string; intro: string; clue: string; questions: string[]; evidence: string[] }
> = {
  honey: {
    title: '사라진 꿀단지의 단서',
    intro:
      '토끼가 소풍 자리에 돌아왔어요. 식탁 위에 있던 꿀단지가 보이지 않아요. 곰은 나무 옆에 서 있고, 식탁 아래에는 작은 발자국이 있어요.',
    clue: '다람쥐가 “나는 빈 바구니만 옮겼어”라고 말했어요. 아직 꿀단지를 옮기는 모습을 본 친구는 없어요. 곰이 근처에 있었다는 것만으로 알 수 있을까요?',
    questions: [
      '어떤 단서가 눈에 들어왔나요? 그 단서로 무엇을 생각했나요?',
      '새로운 말을 듣고 생각이 달라졌나요? 더 확인하고 싶은 것을 적어 보세요.',
      '아직 모르는 것은 무엇인가요? 다음에 어떻게 알아볼지 내 문장으로 남겨요.',
    ],
    evidence: [
      '식탁 위에 꿀단지가 보이지 않아요.',
      '곰은 나무 옆에 서 있어요.',
      '식탁 아래에 작은 발자국이 있어요.',
    ],
  },
  seed: {
    title: '싹이 나지 않은 화분',
    intro:
      '같은 날 씨앗을 심었는데 창가 화분에서만 싹이 났어요. 문 옆 화분의 흙은 말라 있어요. 두 화분에 물을 준 양은 기록되어 있지 않아요.',
    clue: '창가 화분과 문 옆 화분에는 서로 다른 씨앗이 심어져 있었대요. 빛만 비교해도 괜찮을까요?',
    questions: [
      '두 화분에서 다른 점을 찾아볼까요? 왜 눈에 들어왔나요?',
      '처음 생각을 확인하려면 무엇을 같게 해야 할까요?',
      '아직 확실하지 않은 점과 다음에 해 보고 싶은 관찰을 적어 보세요.',
    ],
    evidence: [
      '같은 날 씨앗을 심었어요.',
      '문 옆 화분의 흙은 말라 있어요.',
      '물을 준 양은 기록되어 있지 않아요.',
    ],
  },
  umbrella: {
    title: '비가 오지 않은 날의 우산',
    intro:
      '맑은 날 아침, 여우가 젖은 우산을 들고 왔어요. 토끼는 “여우네 마을에는 비가 왔나 봐!”라고 말했어요. 우산 끝에서는 물방울이 떨어지고 있었어요.',
    clue: '여우의 집 앞에는 물을 뿜는 분수가 있어요. 여우는 우산이 어디서 젖었는지 아직 말하지 않았어요.',
    questions: [
      '직접 알 수 있는 것과 추측을 나누어 적어 볼까요?',
      '비 말고도 우산이 젖을 수 있는 이유가 있을까요?',
      '어떤 질문을 하면 확실하게 알 수 있을까요?',
    ],
    evidence: [
      '지금 이곳의 하늘은 맑아요.',
      '여우의 우산은 젖어 있어요.',
      '우산이 젖은 곳은 아직 몰라요.',
    ],
  },
};
export const CATALOG: CatalogActivity[] = [
  {
    id: 'path-teaching',
    track: 'lab',
    title: '티키에게 길 찾는 법 가르치기',
    subtitle: '내 규칙대로 움직이는 티키, 우체국까지 갈 수 있을까?',
    duration: 15,
    level: '쉬움',
    tags: ['티키 가르치기', '규칙', '시험해 보기'],
    description:
      '카드로 티키에게 규칙을 가르치고, 티키가 멈춘 까닭을 찾아 규칙을 고쳐요. 마지막엔 새 지도에서 혼자 해결해요.',
  },
  {
    id: 'first-inquiry',
    track: 'lab',
    title: '빛과 그림자, 나의 첫 탐구',
    subtitle: '빛을 높이면 그림자는 어떻게 될까?',
    duration: 10,
    level: '쉬움',
    tags: ['첫 탐구', '빛', '생각 비교'],
    description:
      '내 생각을 먼저 쓰고, 두 가지 조건을 살펴본 뒤 처음과 지금의 생각을 나란히 보아요.',
  },
  {
    id: 'honey',
    track: 'forest',
    title: '사라진 꿀단지의 단서',
    subtitle: '정말 곰이 가져갔을까?',
    duration: 12,
    level: '보통',
    tags: ['동물', '단서 찾기'],
    description: '토끼와 함께 보이는 사실과 아직 모르는 것을 나누어 봐요.',
  },
  {
    id: 'seed',
    track: 'forest',
    title: '싹이 나지 않은 화분',
    subtitle: '같은 날 심었는데 왜 다를까?',
    duration: 12,
    level: '도전',
    tags: ['식물', '다르게 생각하기'],
    description: '두 화분을 비교하며 무엇을 확인해야 하는지 생각해요.',
  },
  {
    id: 'umbrella',
    track: 'forest',
    title: '비가 오지 않은 날의 우산',
    subtitle: '젖었다고 모두 비 때문일까?',
    duration: 10,
    level: '쉬움',
    tags: ['일상', '사실과 추측'],
    description: '하나의 단서로 여러 가지 가능성을 열어 두는 연습을 해요.',
  },
  {
    id: 'shadow',
    track: 'lab',
    title: '그림자는 왜 달라질까?',
    subtitle: '빛의 높이와 그림자의 길이',
    duration: 15,
    level: '보통',
    tags: ['과학', '빛'],
    description: '먼저 예상하고 빛의 높이를 움직이며 두 조건을 비교해요.',
  },
  {
    id: 'balance',
    track: 'lab',
    title: '저울은 언제 나란해질까?',
    subtitle: '가벼움과 무거움의 발견',
    duration: 15,
    level: '보통',
    tags: ['수학', '무게'],
    description: '왼쪽 추의 무게를 바꾸며 기울기의 변화를 관찰해요.',
  },
  {
    id: 'custom',
    track: 'lab',
    title: '내가 정하는 궁금한 실험',
    subtitle: '과학부터 옛날 사람들의 생활까지',
    duration: 20,
    level: '도전',
    tags: ['자유 주제', '관찰 노트'],
    description: '직접 확인한 자료와 두 가지 관찰을 나의 활동지에 모아요.',
  },
  {
    id: 'kindness',
    track: 'theater',
    title: '함께 만드는 작은 다리',
    subtitle: '서로 다른 생각을 이어 주는 배려',
    duration: 12,
    level: '보통',
    tags: ['배려', '친구'],
    description: '토끼와 곰이 되어 서로의 말을 듣는 방법을 골라요.',
  },
  {
    id: 'courage',
    track: 'theater',
    title: '처음 무대에 서는 날',
    subtitle: '작은 용기를 건네는 한마디',
    duration: 12,
    level: '쉬움',
    tags: ['용기', '응원'],
    description: '두근거리는 친구에게 내가 해 줄 수 있는 말을 생각해요.',
  },
  {
    id: 'waiting',
    track: 'theater',
    title: '천천히 완성하는 우리 그림',
    subtitle: '기다리는 동안 알게 된 마음',
    duration: 12,
    level: '보통',
    tags: ['기다림', '협동'],
    description: '서로 다른 속도를 가진 친구들과 함께 그림을 완성해요.',
  },
];
export const DIAGNOSTIC = [
  {
    title: '살펴보기',
    question: '비가 그쳤어요. 길 한쪽만 젖어 있어요. 어떤 점이 눈에 들어오나요?',
    hint: '직접 눈에 보이는 것을 떠올려 봐요.',
  },
  {
    title: '이유 생각하기',
    question: '젖은 길 옆에는 호스가 있어요. 길이 젖은 이유를 어떻게 확인할까요?',
    hint: '다른 이유가 있을 수도 있을까요?',
  },
  {
    title: '내 말로 표현하기',
    question: '친구에게 내 생각을 설명한다면 어떻게 말할까요?',
    hint: '내 생각과 그 이유를 함께 말해 봐요.',
  },
];
export const EMOTIONS = [
  '걱정됐어요',
  '답답했어요',
  '궁금했어요',
  '안심됐어요',
  '뿌듯했어요',
  '잘 모르겠어요',
];
