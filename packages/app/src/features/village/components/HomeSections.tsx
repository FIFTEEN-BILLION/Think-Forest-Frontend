// 홈 화면 조각들. 값은 모두 `GET /home` 과 `GET /topics` 가 내려준 것만 쓴다.

import { Link } from 'react-router-dom';
import type {
  HomeCommunityStoryPreview,
  HomeRecentWord,
  HomeRecommendation,
  HomeResponse,
  TopicListItem,
} from '../../../api/v1/types';
import { Icon } from './Icon';

/** 주제 카테고리 코드 → 화면에 쓸 그림과 이름. 모르는 코드는 기본값으로 둔다. */
export const CATEGORY_LOOK: Record<string, { emoji: string; label: string; color: string }> = {
  SCIENCE: { emoji: '🧪', label: '과학', color: 'mint' },
  MATH: { emoji: '🔢', label: '수학', color: 'sky' },
  HISTORY: { emoji: '🏛️', label: '역사', color: 'lavender' },
  THINKING: { emoji: '💡', label: '생각놀이', color: 'mint' },
  DAILY_LIFE: { emoji: '🏠', label: '생활', color: 'sky' },
  NATURE: { emoji: '🌳', label: '자연', color: 'mint' },
  FEELINGS: { emoji: '💛', label: '마음', color: 'lavender' },
  IMAGINATION: { emoji: '✨', label: '상상', color: 'sky' },
};

export const categoryLook = (code?: string | null) =>
  CATEGORY_LOOK[code ?? ''] ?? { emoji: '💬', label: '이야기', color: 'mint' };

/** ISO 시각을 "오늘/어제/N일 전"으로. 이어하기 카드에만 쓴다. */
export function agoLabel(iso: string, now = Date.now()): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return '';
  const days = Math.floor((now - at) / 86_400_000);
  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  return `${days}일 전`;
}

/** 첫 번째 추천을 큰 배너로. 추천 이유는 서버 문장을 그대로 보여 준다. */
export function HomeHeroTopic({ topic }: { topic: HomeRecommendation }) {
  const look = categoryLook(topic.category);
  return (
    <section className="voice-hero">
      <div className="voice-hero-copy">
        <span className="tag lime">
          오늘의 추천 · 약 {topic.estimatedMinutes}분 · {look.label}
        </span>
        <h2>
          <em>{topic.title}</em>
        </h2>
        <p>{topic.reason}</p>
        <Link className="talk-cta" to={`/talk?topicId=${encodeURIComponent(topic.topicId)}`}>
          <span className="mic-orb">
            <Icon name="mic" />
          </span>
          <span>
            <strong>티키와 이야기 시작</strong>
            <small>누르고 말하면 돼요</small>
          </span>
          <Icon name="arrow" />
        </Link>
        <small className="safe-copy">
          <Icon name="shield" /> 외모·개인정보는 묻지 않는 안전한 대화예요.
        </small>
      </div>
      <div className="voice-hero-art">
        <div className="sun-doodle">☀️</div>
        <div className="tiki-character">🌱</div>
        <div className="ice-cup">{look.emoji}</div>
        <div className="speech-card">
          <strong>
            “왜 그렇게
            <br />
            생각했어?”
          </strong>
          <span>생각친구 티키</span>
        </div>
        <div className="sound-wave">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
    </section>
  );
}

export function HomeTopicGrid({ topics }: { topics: TopicListItem[] }) {
  return (
    <div className="topic-grid">
      {topics.map((topic, index) => {
        const look = categoryLook(topic.category);
        return (
          <Link
            className={`topic-card ${['mint', 'sky', 'lavender'][index % 3]}`}
            to={`/talk?topicId=${encodeURIComponent(topic.id)}`}
            key={topic.id}
          >
            <span className="topic-emoji">{look.emoji}</span>
            <div>
              <span className="eyebrow">{look.label}</span>
              <h3>{topic.title}</h3>
              {topic.hook && <p>{topic.hook}</p>}
              <small>
                약 {topic.estimatedMinutes ?? 10}분 · 자유롭게 이야기해요
                {topic.source === 'USER' ? ' · 내가 만든 주제' : ''}
              </small>
            </div>
            <span className="round-arrow">
              <Icon name="arrow" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/** 이어하기. 서버에 진행 중인 대화가 없으면 아무것도 그리지 않는다. */
export function HomeResumeCard({ resume }: { resume: HomeResponse['resume'] }) {
  if (!resume) return null;
  const ago = agoLabel(resume.updatedAt);
  return (
    <section className="continue-card">
      <div className="story-mini-cover">💬</div>
      <div>
        <span className="eyebrow">CONTINUE MY STORY</span>
        <h2>{resume.title}</h2>
        <p>{ago ? `${ago}에 하던 이야기예요. 더 이어가 볼까?` : '하던 이야기를 더 이어가 볼까?'}</p>
        <Link
          className="btn light"
          to={`/talk?conversationId=${encodeURIComponent(resume.conversationId)}`}
        >
          이어서 이야기하기 <Icon name="arrow" />
        </Link>
      </div>
    </section>
  );
}

export function HomeWordPeek({ words }: { words: HomeRecentWord[] }) {
  return (
    <section className="word-peek">
      <div className="row between">
        <div>
          <span className="eyebrow">NEW WORDS</span>
          <h2>오늘 만난 단어</h2>
        </div>
        <Link to="/words">보관함 보기 →</Link>
      </div>
      {words.length ? (
        words.slice(0, 2).map((item) => (
          <div className="peek-word" key={item.word}>
            <span>📖</span>
            <div>
              <strong>{item.word}</strong>
              <small>{item.meaning}</small>
            </div>
          </div>
        ))
      ) : (
        <p className="muted">티키와 이야기하면 새로 만난 단어가 여기에 모여요.</p>
      )}
    </section>
  );
}

export function HomeCommunityPeek({
  nickname,
  stories,
}: {
  nickname: string;
  stories: HomeCommunityStoryPreview[];
}) {
  if (!stories.length) return null;
  return (
    <section className="home-community">
      <div className="section-title">
        <div>
          <span className="eyebrow">FRIENDS&apos; STORIES</span>
          <h2>{nickname}가 즐겁게 읽을 친구들의 이야기</h2>
        </div>
        <Link to="/community">친구들의 책장 보기 →</Link>
      </div>
      <div className="home-story-grid">
        {stories.slice(0, 3).map((story) => (
          <Link to={`/community/${story.id}`} className="home-story-card" key={story.id}>
            <div className="home-story-art">
              <span>📚</span>
            </div>
            <div className="home-story-copy">
              <h3>{story.title}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** 이번 주 기록. 예전의 고정된 "4일째" 자리를 서버 값으로 채운다. */
export function HomeWeeklyBadge({ weekly }: { weekly: HomeResponse['weeklyActivity'] }) {
  return (
    <div className="streak">
      <span>🔥</span>
      <strong>{weekly.conversationDays}일째</strong>
      <small>이번 주 이야기 {weekly.completedStories}편</small>
    </div>
  );
}
