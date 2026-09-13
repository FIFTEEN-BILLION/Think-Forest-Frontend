import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { COMMUNITY_STORIES, TODAY_TOPICS, WORDS } from '../data/experience';
import { useVillage } from '../state/VillageProvider';

export function HomeScreen() {
  const { data, toast } = useVillage();
  const [categories, setCategories] = useState(['오늘', '과학', '수학', '역사', '상상', '내 일상']);
  const [active, setActive] = useState('오늘');
  const addCategory = () => {
    if (!categories.includes('공룡')) setCategories([...categories, '공룡']);
    setActive('공룡');
    toast('지우가 좋아하는 ‘공룡’ 카테고리를 추가했어요!');
  };
  return (
    <>
      <section className="welcome-strip">
        <div className="welcome-avatar">🧒🏻</div>
        <div className="welcome-copy">
          <span className="eyebrow">MONDAY · SCIENCE DAY</span>
          <h1>{data.profile.name}야, 오늘도 네 생각이 궁금해!</h1>
          <p>말로 편하게 이야기하면 티키가 멋진 글로 만들어 줄게.</p>
        </div>
        <Link className="first-hello" to="/first-talk">
          👋 티키와 첫 인사
        </Link>
        <div className="streak">
          <span>🔥</span>
          <strong>4일째</strong>
          <small>생각 여행 중</small>
        </div>
      </section>

      <section className="voice-hero">
        <div className="voice-hero-copy">
          <span className="tag lime">오늘의 추천 · 약 15분</span>
          <h2>
            얼음물 컵 밖에는
            <br />
            <em>왜 물이 생길까?</em>
          </h2>
          <p>
            본 적 있어? 티키에게 네 생각을 말해 줘.
            <br />
            정답보다 네가 그렇게 생각한 이유가 더 궁금해!
          </p>
          <Link className="talk-cta" to="/talk">
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
          <div className="ice-cup">🧊🥤</div>
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

      <div className="category-scroll">
        {categories.map((category) => (
          <button
            key={category}
            className={`chip ${active === category ? 'active' : ''}`}
            onClick={() => setActive(category)}
          >
            {category}
          </button>
        ))}
        <button className="chip add-category" onClick={addCategory}>
          <Icon name="plus" /> 내 주제 추가
        </button>
      </div>

      <div className="section-title">
        <div>
          <span className="eyebrow">PICK A QUESTION</span>
          <h2>
            {active === '오늘' ? '오늘 무슨 이야기를 해 볼까?' : `${active}에 대해 이야기해 볼까?`}
          </h2>
        </div>
        <Link to="/adventures">모든 주제 보기 →</Link>
      </div>
      <div className="topic-grid">
        {TODAY_TOPICS.map((topic) => (
          <Link className={`topic-card ${topic.color}`} to="/talk" key={topic.id}>
            <span className="topic-emoji">{topic.emoji}</span>
            <div>
              <span className="eyebrow">{topic.area}</span>
              <h3>{topic.title}</h3>
              <p>{topic.question}</p>
              <small>약 15분 · 자유롭게 이야기해요</small>
            </div>
            <span className="round-arrow">
              <Icon name="arrow" />
            </span>
          </Link>
        ))}
      </div>

      <div className="home-lower">
        <section className="continue-card">
          <div className="story-mini-cover">🚀</div>
          <div>
            <span className="eyebrow">CONTINUE MY STORY</span>
            <h2>어제의 우주 이야기, 더 이어갈까?</h2>
            <p>“행성 뒤편에서 반짝이는 돌을 발견했어요…”</p>
            <Link className="btn light" to="/talk">
              7분부터 이어 말하기 <Icon name="arrow" />
            </Link>
          </div>
        </section>
        <section className="word-peek">
          <div className="row between">
            <div>
              <span className="eyebrow">NEW WORDS</span>
              <h2>오늘 만난 단어</h2>
            </div>
            <Link to="/words">보관함 보기 →</Link>
          </div>
          {WORDS.slice(0, 2).map((item) => (
            <div className="peek-word" key={item.word}>
              <span>{item.emoji}</span>
              <div>
                <strong>{item.word}</strong>
                <small>{item.meaning}</small>
              </div>
              <button>
                <Icon name="sound" />
              </button>
            </div>
          ))}
        </section>
      </div>

      <section className="home-community">
        <div className="section-title">
          <div>
            <span className="eyebrow">FRIENDS' STORIES</span>
            <h2>{data.profile.name}가 즐겁게 읽을 친구들의 이야기</h2>
          </div>
          <Link to="/community">친구들의 책장 보기 →</Link>
        </div>
        <div className="home-story-grid">
          {COMMUNITY_STORIES.map((story, index) => (
            <Link to="/community" className="home-story-card" key={story.id}>
              <div className="home-story-art">
                <span>{story.emoji}</span>
                <small>{story.category}</small>
              </div>
              <div className="home-story-copy">
                <span className={`recommend-reason reason-${index}`}>
                  {index === 0
                    ? '🔥 추천이 많아요'
                    : index === 1
                      ? '🧒 지우와 비슷한 9살'
                      : '🌱 비슷한 상상 활동'}
                </span>
                <h3>{story.title}</h3>
                <p>{story.excerpt}</p>
                <div className="row between">
                  <span className="story-author">
                    {story.author} · {story.age}
                  </span>
                  <span className="like">
                    <Icon name="heart" /> {story.likes}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
