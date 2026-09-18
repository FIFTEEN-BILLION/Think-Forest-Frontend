import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Button, EmptyState, Notice, PageHeading } from '../components/ui';
import { COMMUNITY_STORIES } from '../data/experience';
import { useVillage } from '../providers/VillageProvider';

const storyBodies: Record<string, string[]> = {
  'community-1': [
    '달 표면을 걷다가 발밑에서 파란빛이 반짝였어요. 가까이 가 보니 손바닥만 한 돌이 어두운 길을 환하게 비추고 있었어요.',
    '나는 그 돌을 바로 가져가기보다 어디에서 왔는지 먼저 살펴보기로 했어요. 돌 주변에는 작은 별 모양 발자국이 이어져 있었거든요.',
    '발자국을 따라 달 뒤쪽으로 가자 길을 잃은 작은 탐사 로봇이 나타났어요. 반짝이 돌은 로봇이 집으로 돌아가기 위한 신호였어요.',
  ],
  'community-2': [
    '월요일 아침, 우리 반 문을 열고 티라노가 들어왔어요. 목소리가 너무 커서 친구들이 모두 깜짝 놀랐어요.',
    '티라노는 화가 난 것이 아니라 긴장하면 목소리가 커진다고 말했어요. 우리는 손을 들고 천천히 말하는 연습을 함께 했어요.',
    '점심시간에는 티라노가 긴 팔 대신 꼬리로 우유를 건네주었어요. 그날부터 우리는 서로 다른 점을 재미있는 장점으로 보기 시작했어요.',
  ],
  'community-3': [
    '바람이 너무 세게 불던 날, 나는 투명한 실로 커다란 그물을 만들었어요.',
    '그물에 바람이 차오르자 나뭇잎들이 서로 다른 높이의 소리를 냈어요. 마치 숲이 노래하는 것 같았어요.',
    '나는 바람을 가두는 대신 마을 사람들이 함께 들을 수 있도록 그물을 나무 사이에 걸어 두었어요.',
  ],
};

export function CommunityStoryScreen() {
  const { id } = useParams();
  const { toast } = useVillage();
  const story = COMMUNITY_STORIES.find((item) => item.id === id);
  const [liked, setLiked] = useState(false);
  if (!story)
    return (
      <EmptyState
        title="이 이야기를 찾지 못했어요."
        description="친구들의 책장에서 다른 이야기를 만나 보세요."
        to="/community"
        action="친구들의 이야기로"
      />
    );
  return (
    <>
      <Link className="back" to="/community">
        <Icon name="back" /> 친구들의 이야기
      </Link>
      <article className="community-detail">
        <header className="community-detail-cover">
          <div className="detail-emoji">{story.emoji}</div>
          <div>
            <span className="tag gold">보호자가 확인한 이야기</span>
            <h1>{story.title}</h1>
            <p>
              {story.author} · {story.age} · {story.category}
            </p>
          </div>
        </header>
        <div className="community-reader">
          <section className="story-reading panel">
            {(storyBodies[story.id] ?? [story.excerpt]).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <div className="story-finish">끝</div>
          </section>
          <aside className="story-side stack">
            <section className="panel">
              <h2>이 이야기가 좋았나요?</h2>
              <p className="muted">친구에게 따뜻한 추천을 남겨 주세요.</p>
              <Button
                className={liked ? 'light' : ''}
                aria-pressed={liked}
                onClick={() => {
                  setLiked((value) => !value);
                  toast(liked ? '추천을 취소했어요.' : '이야기를 추천했어요!');
                }}
              >
                <Icon name="heart" /> {liked ? '추천했어요' : '이야기 추천하기'}
              </Button>
            </section>
            <section className="panel story-question">
              <span className="eyebrow">생각 한 걸음 더</span>
              <h2>나라면 어떤 선택을 했을까?</h2>
              <Link className="btn light" to="/talk">
                티키와 이야기하기 <Icon name="arrow" />
              </Link>
            </section>
            <button
              className="report-link"
              onClick={() => toast('보호자에게 검토 요청을 보냈어요.')}
            >
              불편한 내용 알리기
            </button>
          </aside>
        </div>
      </article>
    </>
  );
}

export function ShareStoryScreen() {
  const { data, toast } = useVillage();
  const navigate = useNavigate();
  const records = data.sessions.filter((record) => record.source === 'local');
  const available = records.length ? records : data.sessions.slice(0, 2);
  const [selected, setSelected] = useState(available[0]?.id ?? '');
  const [audience, setAudience] = useState('또래 친구');
  const [hideProfile, setHideProfile] = useState(true);
  const record = available.find((item) => item.id === selected);
  return (
    <>
      <Link className="back" to="/community">
        <Icon name="back" /> 친구들의 이야기
      </Link>
      <PageHeading
        eyebrow="SHARE WITH CARE"
        title="내 이야기를 누구와 나눌까요?"
        description="보호자가 연결된 휴대폰에서 마지막으로 확인한 뒤 공개해요."
      />
      <div className="share-layout">
        <section className="panel share-form">
          <div className="field">
            <label htmlFor="share-story">공유할 이야기</label>
            <select id="share-story" value={selected} onChange={(e) => setSelected(e.target.value)}>
              {available.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="share-audience">
            <legend>보여 줄 사람</legend>
            {['가족만', '초대한 친구', '또래 친구'].map((item) => (
              <button
                type="button"
                className={audience === item ? 'selected' : ''}
                aria-pressed={audience === item}
                onClick={() => setAudience(item)}
                key={item}
              >
                <Icon
                  name={item === '가족만' ? 'heart' : item === '초대한 친구' ? 'user' : 'book'}
                />
                <strong>{item}</strong>
                <small>
                  {item === '가족만'
                    ? '연결된 보호자만'
                    : item === '초대한 친구'
                      ? '링크를 받은 사람만'
                      : '보호자 확인 후 책장에 공개'}
                </small>
              </button>
            ))}
          </fieldset>
          <label className="setting-row">
            <span>
              <strong>프로필 정보 가리기</strong>
              <p>학교와 실제 이름처럼 나를 알아볼 수 있는 정보는 숨겨요.</p>
            </span>
            <input
              type="checkbox"
              checked={hideProfile}
              onChange={(e) => setHideProfile(e.target.checked)}
            />
          </label>
          <Notice>
            공유 요청을 보내도 바로 공개되지 않아요. 보호자가 내용을 확인하고 승인해야 해요.
          </Notice>
          <Button
            disabled={!record}
            onClick={() => {
              toast('보호자에게 공유 확인을 요청했어요.');
              navigate('/community');
            }}
          >
            <Icon name="share" /> 보호자에게 확인 요청
          </Button>
        </section>
        <aside className="panel share-preview">
          <span className="eyebrow">공유 미리보기</span>
          <div className="share-book">📖</div>
          <h2>{record?.title ?? '공유할 이야기를 골라 주세요'}</h2>
          <p>{record?.text ?? '이야기를 선택하면 친구에게 보일 모습을 확인할 수 있어요.'}</p>
          <dl className="definition">
            <dt>공개 범위</dt>
            <dd>{audience}</dd>
            <dt>작성자 표시</dt>
            <dd>
              {hideProfile
                ? `${data.profile.name} · 나이만 표시`
                : `${data.profile.name} · 프로필 공개`}
            </dd>
          </dl>
        </aside>
      </div>
    </>
  );
}

export function CustomTopicScreen() {
  const { toast } = useVillage();
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('과학');
  const examples = useMemo(
    () => ['공룡은 왜 사라졌을까?', '구름은 어떻게 만들어질까?', '친구와 다투면 어떻게 말할까?'],
    [],
  );
  const start = () => {
    if (!topic.trim()) {
      toast('티키와 이야기할 주제를 적어 주세요.');
      return;
    }
    toast(`“${topic.trim()}” 이야기를 준비했어요!`);
    navigate(
      `/talk?topic=${encodeURIComponent(topic.trim())}&category=${encodeURIComponent(category)}`,
    );
  };
  return (
    <>
      <Link className="back" to="/">
        <Icon name="back" /> 오늘의 이야기
      </Link>
      <PageHeading
        eyebrow="MY OWN QUESTION"
        title="오늘은 무엇이 궁금해?"
        description="정답을 몰라도 괜찮아요. 티키와 이야기하고 싶은 것을 자유롭게 알려 주세요."
      />
      <div className="custom-topic-layout">
        <section className="panel custom-topic-form">
          <label htmlFor="custom-topic">내가 궁금한 것</label>
          <textarea
            id="custom-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="예: 비행기는 무거운데 어떻게 하늘을 날아?"
            maxLength={120}
            autoFocus
          />
          <div className="voice-topic">
            <button
              type="button"
              aria-label="음성으로 주제 말하기"
              onClick={() => setTopic('무지개는 왜 여러 색으로 보일까?')}
            >
              <Icon name="mic" />
            </button>
            <span>마이크를 누르고 말해도 돼요.</span>
            <small>{topic.length} / 120</small>
          </div>
          <fieldset className="topic-categories">
            <legend>어떤 이야기와 가까워?</legend>
            {['과학', '수학', '역사', '상상', '내 일상'].map((item) => (
              <button
                type="button"
                className={category === item ? 'selected' : ''}
                onClick={() => setCategory(item)}
                key={item}
              >
                {item}
              </button>
            ))}
          </fieldset>
          <Button onClick={start}>
            티키와 이야기 시작 <Icon name="arrow" />
          </Button>
        </section>
        <aside className="panel topic-inspiration">
          <div className="topic-spark">
            <Icon name="spark" />
          </div>
          <h2>이렇게 시작해도 좋아!</h2>
          <div className="inspiration-list">
            {examples.map((example) => (
              <button onClick={() => setTopic(example)} key={example}>
                {example}
                <Icon name="arrow" />
              </button>
            ))}
          </div>
          <Notice>
            외모, 개인정보, 위험한 내용은 묻지 않아요. 불편한 주제는 티키가 안전한 이야기로 바꿔
            도와줘요.
          </Notice>
        </aside>
      </div>
    </>
  );
}
