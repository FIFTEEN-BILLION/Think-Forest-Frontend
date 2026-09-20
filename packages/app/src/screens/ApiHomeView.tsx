import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import type { Model } from '../api/schema';
import { contentAppearance } from '../components/contentAppearance';

export function ApiHomeView({
  home,
  stories,
  active,
  guest = false,
}: {
  home: Model<'HomeResponse'>;
  stories: Model<'StorySummary'>[];
  active: Model<'ActivitySessionOut'>[];
  guest?: boolean;
}) {
  const [category, setCategory] = useState('추천');
  const firstVisit = home.profile.needsFirstGreeting;
  const draft = home.resume ?? active[0];
  const topics = home.recommendations.filter(
    (topic) => category === '추천' || topic.category === category,
  );
  const categories = ['추천', ...new Set(home.recommendations.map((topic) => topic.category))];
  const startLink = (to: string) =>
    firstVisit ? `/first-talk?next=${encodeURIComponent(to)}` : to;
  const hero = firstVisit
    ? {
        label: '우리의 첫 번째 이야기',
        title: '안녕! 나는 네 생각친구 티키야.',
        description: '네가 좋아하는 것부터 들려줄래? 작은 생각도, 엉뚱한 상상도 좋아.',
        action: '티키와 만나기',
        hint: '말로 해도, 글로 써도 괜찮아',
        to: '/first-talk',
        icon: 'chat',
      }
    : draft
      ? {
          label: '아직 이어지는 우리의 이야기',
          title: draft.title,
          description: '지난번에 남긴 생각을 기억하고 있어. 멈췄던 곳부터 함께 이어가 볼까?',
          action: '이어서 이야기하기',
          hint: '작성하던 내용이 그대로 있어',
          to: home.resume
            ? `/talk?session=${home.resume.conversationId}`
            : `/session/${active[0]!.track}?session=${active[0]!.sessionId}`,
          icon: 'play',
        }
      : {
          label: '오늘 함께 생각해 볼 질문',
          title: home.recommendations[0]?.title ?? '오늘은 어떤 이야기를 해 볼까?',
          description: home.recommendations[0]?.reason ?? '마음에 떠오른 궁금증을 티키에게 들려줘.',
          action: '새 이야기 시작하기',
          hint: '정답보다 네 생각이 궁금해',
          to: home.recommendations[0]
            ? `/talk?topic=${home.recommendations[0].topicId}`
            : '/topics/new',
          icon: 'chat',
        };

  return (
    <div className="home-page">
      <header className="home-welcome">
        <div>
          <span className="home-eyebrow">오늘의 작은 궁금증</span>
          <h1>
            {firstVisit
              ? '생각이 자라는 곳에 잘 왔어!'
              : `${home.profile.nickname || '새싹'}, 오늘은 어떤 생각을 했어?`}
          </h1>
        </div>
        <Link className="home-friends-shortcut" to="/community">
          <Icon name="heart" /> 친구들 이야기 <Icon name="arrow" />
        </Link>
      </header>

      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero-copy">
          <span className="home-hero-label">
            <span /> {hero.label}
          </span>
          <h2 id="home-hero-title">{hero.title}</h2>
          <p>{hero.description}</p>
          <Link className="home-primary" to={hero.to}>
            <Icon name={hero.icon} /> {hero.action} <Icon name="arrow" />
          </Link>
          <small>{hero.hint}</small>
          {guest && !firstVisit && (
            <Link className="home-text-link" to="/first-talk">
              티키와 만나기 <Icon name="arrow" />
            </Link>
          )}
        </div>
        <div className="home-hero-picture" aria-hidden="true">
          <span className="home-picture-spark spark-one">✦</span>
          <span className="home-picture-spark spark-two">✧</span>
          <div className="home-picture-note">“왜 그렇게 생각했어?”</div>
          <div className="home-picture-circle">
            <span>{firstVisit ? '🌱' : draft ? '📖' : '🧊'}</span>
          </div>
          <span className="home-picture-leaf">🌿</span>
          <span className="home-picture-caption">너의 생각을 듣는 친구, 티키</span>
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-topics-title">
        <div className="home-section-heading">
          <div>
            <span className="home-eyebrow">마음 가는 질문을 골라봐</span>
            <h2 id="home-topics-title">오늘은 무엇이 궁금해?</h2>
          </div>
          <Link to={startLink('/topics/new')} className="home-text-link">
            <Icon name="plus" /> 내가 주제 정하기
          </Link>
        </div>
        <div className="home-topic-filters" role="group" aria-label="질문 주제">
          {categories.map((item) => (
            <button
              key={item}
              className={category === item ? 'selected' : ''}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item === '추천' ? item : contentAppearance(item).label}
            </button>
          ))}
        </div>
        <div className="home-question-grid">
          {topics.map((topic) => (
            <Link
              className={`home-question-card ${contentAppearance(topic.category).color}`}
              to={startLink(`/talk?topic=${topic.topicId}`)}
              key={topic.topicId}
            >
              <div className="home-question-top">
                <span aria-hidden="true">{contentAppearance(topic.category).emoji}</span>
                <span className="home-question-category">
                  {contentAppearance(topic.category).label}
                </span>
              </div>
              <h3>{topic.title}</h3>
              <p>{topic.reason}</p>
              <span className="home-question-action">
                이야기 나누기
                <Icon name="arrow" />
              </span>
            </Link>
          ))}
        </div>
        <div className="home-section-tail">
          <Link to="/adventures" className="home-text-link">
            다른 모험도 둘러보기 <Icon name="arrow" />
          </Link>
        </div>
      </section>

      <section className="home-weekly-strip">
        <Icon name="leaf" />
        <div>
          <strong>이번 주에도 생각이 자라고 있어요</strong>
          <p>
            이야기한 날 {home.weeklyActivity.conversationDays}일 · 완성한 이야기{' '}
            {home.weeklyActivity.completedStories}편
          </p>
        </div>
        <Link className="home-text-link" to="/report">
          발자국 보기 <Icon name="arrow" />
        </Link>
      </section>
      <div className="home-personal-grid">
        <section className="home-personal-panel" aria-labelledby="home-records-title">
          <div className="home-section-heading">
            <h2 id="home-records-title">내가 남긴 이야기</h2>
            <Link to="/shelf" className="home-text-link">
              책장 보기 <Icon name="arrow" />
            </Link>
          </div>
          {stories.length ? (
            stories.map((story) => (
              <Link className="home-recent-story" to={`/shelf/${story.id}`} key={story.id}>
                <span
                  className={`home-book-icon ${contentAppearance(story.category).color}`}
                  aria-hidden="true"
                >
                  {contentAppearance(story.category).emoji}
                </span>
                <div>
                  <span className="home-record-label">내가 남긴 생각</span>
                  <h3>{story.title}</h3>
                  <p>{story.summary}</p>
                </div>
                <Icon name="arrow" />
              </Link>
            ))
          ) : (
            <div className="home-empty-shelf">
              <span aria-hidden="true">📖</span>
              <h3>첫 이야기가 들어올 자리야.</h3>
              <p>티키와 나눈 생각을 여기에 차곡차곡 모아둘게.</p>
              <Link className="home-text-link" to={hero.to}>
                첫 이야기 시작하기 <Icon name="arrow" />
              </Link>
            </div>
          )}
        </section>
        <section className="home-personal-panel home-word-panel" aria-labelledby="home-words-title">
          <div className="home-section-heading">
            <div>
              <h2 id="home-words-title">생각을 넓히는 단어</h2>
              <span className="home-record-label">대화에서 만난 나의 단어</span>
            </div>
            <Link to="/words" className="home-text-link">
              보관함 <Icon name="arrow" />
            </Link>
          </div>
          {!home.recentWords.length && (
            <div className="home-empty-shelf">
              <span aria-hidden="true">🌱</span>
              <h3>새로운 말을 만날 준비가 됐어.</h3>
              <p>대화에서 궁금한 단어를 담아 보자.</p>
            </div>
          )}
          {home.recentWords.slice(0, 2).map((word) => (
            <Link className="home-word" to="/words" key={word.word}>
              <span aria-hidden="true">🌱</span>
              <div>
                <h3>{word.word}</h3>
                <p>{word.meaning}</p>
              </div>
              <Icon name="arrow" />
            </Link>
          ))}
        </section>
      </div>

      <section className="home-section home-friends" aria-labelledby="home-friends-title">
        <div className="home-section-heading">
          <div>
            <span className="home-eyebrow">같은 질문에도 생각은 저마다 달라</span>
            <h2 id="home-friends-title">친구들은 어떤 상상을 했을까?</h2>
            <p>친구의 이야기를 읽다 보면 새로운 생각이 떠오를 거야.</p>
          </div>
          <Link to="/community" className="home-text-link">
            친구들 이야기 모두 보기 <Icon name="arrow" />
          </Link>
        </div>
        {!home.communityStories.length && (
          <div className="home-empty-shelf">
            <span aria-hidden="true">📖</span>
            <h3>친구들의 이야기를 기다리고 있어.</h3>
            <p>공개된 이야기가 여기에 모여요.</p>
          </div>
        )}
        <div className="home-friend-grid">
          {home.communityStories.map((story) => (
            <Link to={`/community/${story.id}`} className="home-friend-card" key={story.id}>
              <div className="home-friend-cover">
                <span aria-hidden="true">📖</span>
                <span className="home-friend-category">친구의 생각</span>
              </div>
              <div className="home-friend-copy">
                <span className="home-record-label">함께 나누는 이야기</span>
                <h3>{story.title}</h3>

                <span className="home-question-action">
                  이야기 읽기 <Icon name="arrow" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
