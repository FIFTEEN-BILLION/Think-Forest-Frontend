import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHeading } from '../components/ui';
import { COMMUNITY_STORIES } from '../data/experience';

export function CommunityScreen() {
  const [scope, setScope] = useState('모두');
  const shown = COMMUNITY_STORIES.filter(
    (story) => scope === '모두' || ['내 친구', '가족'].includes(scope) || story.category === scope,
  );
  return (
    <>
      <PageHeading
        eyebrow="STORIES TOGETHER"
        title="친구들의 생각은 어떤 모험이 됐을까?"
        description="보호자가 확인한 이야기만 보여요."
      >
        <Link className="btn" to="/story-share">
          <Icon name="share" /> 내 이야기 공유
        </Link>
      </PageHeading>
      <div className="sharing-safety">
        <Icon name="shield" />
        <div>
          <strong>지우의 이야기는 지우가 고른 사람만 볼 수 있어요.</strong>
          <p>이름이나 학교 같은 개인정보는 공유하기 전에 숨겨요.</p>
        </div>
        <button>공유 권한 보기</button>
      </div>
      <div className="community-toolbar">
        <div className="filters">
          {['모두', '내 친구', '가족', '우주', '과학', '상상'].map((item) => (
            <button
              className={`chip ${scope === item ? 'active' : ''}`}
              onClick={() => setScope(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        <span>이번 주 새 이야기 12개</span>
      </div>
      <div className="community-grid">
        {shown.map((story) => (
          <article className="community-card" key={story.id}>
            <div className="community-cover">
              <span>{story.emoji}</span>
              <small>{story.category} 모험</small>
            </div>
            <div className="community-copy">
              <div className="author">
                <span>{story.author.slice(0, 1)}</span>
                <strong>{story.author}</strong>
                <small>{story.age} · 보호자 확인</small>
              </div>
              <h2>{story.title}</h2>
              <p>{story.excerpt}</p>
              <div className="row between">
                <button className="like">
                  <Icon name="heart" /> {story.likes}
                </button>
                <Link className="read-more" to={`/community/${story.id}`}>
                  이야기 읽기 <Icon name="arrow" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
