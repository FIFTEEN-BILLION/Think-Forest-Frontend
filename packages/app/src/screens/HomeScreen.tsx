import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { COMMUNITY_STORIES, WORDS } from '../data/experience';
import { HOME_CATEGORIES, HOME_TOPICS } from '../data/home';
import type { HomeCategory } from '../data/home';
import { useVillage } from '../providers/VillageProvider';

export function HomeScreen() {
  const { data } = useVillage();
  const [category, setCategory] = useState<HomeCategory>('추천');
  const firstVisit = !data.consent.done;
  const draft = data.resume;
  const recent = [...data.sessions.filter((record) => record.source === 'local')]
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
    .slice(0, 2);
  const stories = recent.length
    ? recent
    : data.sessions.filter((r) => r.source === 'mock').slice(0, 2);
  const topics =
    category === '추천'
      ? HOME_TOPICS.slice(0, 3)
      : HOME_TOPICS.filter((topic) => topic.category === category);
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
          to: `/session/${draft.track}`,
          icon: 'play',
        }
      : {
          label: '오늘 함께 생각해 볼 질문',
          title: '컵 밖의 물은 어디서 왔을까?',
          description: '차가운 컵 밖에 송골송골 물방울이 맺혔어. 네 생각을 들려줘!',
          action: '새 이야기 시작하기',
          hint: '정답보다 네 생각이 궁금해',
          to: '/talk',
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
              : `${data.profile.name}, 오늘은 어떤 생각을 했어?`}
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
          {HOME_CATEGORIES.map((item) => (
            <button
              key={item}
              className={category === item ? 'selected' : ''}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="home-question-grid">
          {topics.map((topic) => (
            <Link
              className={`home-question-card ${topic.color}`}
              to={startLink(topic.to)}
              key={topic.id}
            >
              <div className="home-question-top">
                <span aria-hidden="true">{topic.emoji}</span>
                <span className="home-question-category">{topic.category}</span>
              </div>
              <h3>{topic.title}</h3>
              <p>{topic.description}</p>
              <span className="home-question-action">
                {topic.invitation}
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

      <div className="home-personal-grid">
        <section className="home-personal-panel" aria-labelledby="home-records-title">
          <div className="home-section-heading">
            <h2 id="home-records-title">
              {recent.length ? '내가 남긴 이야기' : '이렇게 이야기가 쌓여요'}
            </h2>
            <Link to="/shelf" className="home-text-link">
              책장 보기 <Icon name="arrow" />
            </Link>
          </div>
          {stories.length ? (
            stories.map((story) => (
              <Link className="home-recent-story" to={`/shelf/${story.id}`} key={story.id}>
                <span className={`home-book-icon ${story.track}`} aria-hidden="true">
                  {story.track === 'lab' ? '🔎' : story.track === 'theater' ? '🌷' : '📖'}
                </span>
                <div>
                  <span className="home-record-label">
                    {story.source === 'mock' ? '예시 이야기' : '내가 남긴 생각'}
                  </span>
                  <h3>{story.title}</h3>
                  <p>{story.answers[0]?.text ?? story.text}</p>
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
              <span className="home-record-label">이야기에서 만날 단어 미리보기</span>
            </div>
            <Link to="/words" className="home-text-link">
              보관함 <Icon name="arrow" />
            </Link>
          </div>
          {WORDS.slice(0, 2).map((word) => (
            <Link className="home-word" to="/words" key={word.word}>
              <span aria-hidden="true">{word.emoji}</span>
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
        <div className="home-friend-grid">
          {COMMUNITY_STORIES.map((story) => (
            <Link to={`/community/${story.id}`} className="home-friend-card" key={story.id}>
              <div className="home-friend-cover">
                <span aria-hidden="true">{story.emoji}</span>
                <span className="home-friend-category">{story.category}</span>
              </div>
              <div className="home-friend-copy">
                <span className="home-record-label">{story.author}의 예시 이야기</span>
                <h3>{story.title}</h3>
                <p>{story.excerpt}</p>
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
