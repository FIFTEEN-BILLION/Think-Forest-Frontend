// 단어 보관함·친구들의 이야기 화면이 아직 쓰는 목데이터. 홈의 오늘의 주제(TODAY_TOPICS)는
// `GET /home` 추천과 `GET /topics` 로 바뀌어 지웠다.

export const WORDS = [
  {
    word: '결로',
    reading: '[결로]',
    meaning: '물체의 표면에 물방울이 생기는 현상이에요.',
    example: '차가운 컵 밖에 결로로 물방울이 생겼어요.',
    emoji: '💧',
    mastered: true,
  },
  {
    word: '추측',
    reading: '[추측]',
    meaning: '아직 확실하지 않지만, 알고 있는 것으로 미루어 생각하는 거예요.',
    example: '구름을 보고 비가 올 것이라고 추측했어요.',
    emoji: '🔎',
    mastered: true,
  },
  {
    word: '증발',
    reading: '[증발]',
    meaning: '물이 눈에 보이지 않는 수증기로 변해 공기 중으로 가는 거예요.',
    example: '젖은 바닥의 물이 햇빛에 증발했어요.',
    emoji: '☀️',
    mastered: false,
  },
  {
    word: '근거',
    reading: '[근거]',
    meaning: '생각이나 판단이 맞다고 믿게 해 주는 자료예요.',
    example: '컵이 안 새었다는 점은 내 생각의 근거예요.',
    emoji: '🧩',
    mastered: false,
  },
];

export const COMMUNITY_STORIES = [
  {
    id: 'community-1',
    author: '구름토끼',
    age: '8살',
    emoji: '🚀',
    title: '달에서 발견한 반짝이 돌',
    excerpt: '빛나는 돌이 어두운 길을 비추자, 우리는 달 뒤쪽으로 떠났어요.',
    likes: 24,
    category: '우주',
  },
  {
    id: 'community-2',
    author: '민트공룡',
    age: '9살',
    emoji: '🦕',
    title: '공룡이 우리 반에 전학 왔다',
    excerpt: '티라노는 큰 목소리 때문에 친구들이 놀랐다는 것을 알게 됐어요.',
    likes: 18,
    category: '친구',
  },
  {
    id: 'community-3',
    author: '별빛고래',
    age: '7살',
    emoji: '🌨️',
    title: '바람을 잡는 투명한 그물',
    excerpt: '그물 안에 바람이 차오르면 나뭇잎이 노래를 시작했어요.',
    likes: 31,
    category: '상상',
  },
];
