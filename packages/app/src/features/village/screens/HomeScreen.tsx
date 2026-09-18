import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { V1Error } from '../../../api/v1/client';
import { getHome, listTopicCategories, listTopicPage } from '../../../api/v1/endpoints';
import type {
  HomeCommunityStoryPreview,
  HomeRecentWord,
  HomeResponse,
  TopicCategory,
  TopicListItem,
} from '../../../api/v1/types';
import { useAuth } from '../../../providers/AuthProvider';
import { Icon } from '../components/Icon';
import {
  HomeCommunityPeek,
  HomeHeroTopic,
  HomeResumeCard,
  HomeTopicGrid,
  HomeWeeklyBadge,
  HomeWordPeek,
} from '../components/HomeSections';
import { TopicCategoryBar } from '../components/TopicCategoryBar';
import { Button, EmptyState, Notice } from '../components/ui';
import { useVillage } from '../state/VillageProvider';

const TOPIC_LIMIT = 6;
const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export function HomeScreen() {
  const { status } = useAuth();
  if (status === 'loading')
    return (
      <div className="route-loading" role="status">
        오늘의 이야기를 불러오는 중이에요…
      </div>
    );
  return status === 'signedIn' ? <SignedInHome /> : <SignedOutHome />;
}

/**
 * 로그인 전에도 이 기기의 생각 모험은 그대로 쓸 수 있다. 홈에서 로그인을 강요하지 않는다.
 * 서버 추천·이어하기처럼 내 기록이 필요한 것만 로그인 뒤에 보인다.
 */
function SignedOutHome() {
  const { data } = useVillage();
  return (
    <>
      <section className="welcome-strip">
        <div className="welcome-avatar">🧒🏻</div>
        <div className="welcome-copy">
          <span className="eyebrow">WELCOME</span>
          <h1>오늘도 네 생각이 궁금해!</h1>
          <p>로그인하면 티키가 나에게 맞는 주제를 골라 주고, 하던 이야기도 이어갈 수 있어요.</p>
        </div>
        <Link className="first-hello" to="/login">
          👋 로그인하고 티키 만나기
        </Link>
      </section>

      <Notice>
        지금은 로그인하지 않아도 이 기기에서 생각 모험을 할 수 있어요. 기록은 이 기기에만 저장돼요.
      </Notice>

      <div className="section-title">
        <div>
          <span className="eyebrow">PICK AN ADVENTURE</span>
          <h2>오늘 어떤 모험을 떠나 볼까?</h2>
        </div>
        <Link to="/adventures">모든 모험 보기 →</Link>
      </div>
      <div className="topic-grid">
        {[
          { to: '/adventures/forest', emoji: '🌳', area: '사고력', title: '이야기 숲' },
          { to: '/adventures/lab', emoji: '🧪', area: '과학 · 수학', title: '호기심 실험실' },
          { to: '/adventures/theater', emoji: '🎭', area: '인성', title: '마음 극장' },
        ].map((place, index) => (
          <Link
            className={`topic-card ${['mint', 'sky', 'lavender'][index]}`}
            to={place.to}
            key={place.to}
          >
            <span className="topic-emoji">{place.emoji}</span>
            <div>
              <span className="eyebrow">{place.area}</span>
              <h3>{place.title}</h3>
              <small>이 기기에서 바로 할 수 있어요</small>
            </div>
            <span className="round-arrow">
              <Icon name="arrow" />
            </span>
          </Link>
        ))}
      </div>

      {data.resume && (
        <div className="home-lower">
          <section className="continue-card">
            <div className="story-mini-cover">📝</div>
            <div>
              <span className="eyebrow">CONTINUE MY ADVENTURE</span>
              <h2>{data.resume.title}</h2>
              <p>이 기기에 작성 중인 모험이 있어요.</p>
              <Link className="btn light" to={`/session/${data.resume.track}`}>
                이어 하기 <Icon name="arrow" />
              </Link>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function SignedInHome() {
  const { client, user } = useAuth();
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [homeError, setHomeError] = useState('');
  const [categories, setCategories] = useState<TopicCategory[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  // 목록은 "어떤 조건으로 받은 결과인가"를 함께 들고 있다. 조건이 바뀌면 그대로 불러오는 중이 된다.
  const [result, setResult] = useState<{
    key: string;
    items: TopicListItem[];
    cursor: string | null;
    error: string;
  } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadCategories = useCallback(() => {
    listTopicCategories(client).then(
      (page) => setCategories(page.items),
      () => setCategories([]),
    );
  }, [client]);

  useEffect(() => {
    const controller = new AbortController();
    getHome(client, controller.signal).then(
      (response) => {
        if (!controller.signal.aborted) setHome(response);
      },
      (error: unknown) => {
        if (controller.signal.aborted || (error instanceof V1Error && error.status === 401)) return;
        setHomeError(errorText(error, '오늘의 이야기를 불러오지 못했어요.'));
      },
    );
    return () => controller.abort();
  }, [client]);

  useEffect(loadCategories, [loadCategories]);

  const selected = categories.find((item) => item.id === active) ?? null;
  const topicQuery = useMemo(
    () => ({
      limit: TOPIC_LIMIT,
      ...(active === null && !query ? { recommended: true } : {}),
      // 서버는 기본 카테고리 코드만 받는다. 내가 만든 카테고리는 그 이름으로 찾아 준다.
      ...(selected?.kind === 'DEFAULT' ? { category: selected.id } : {}),
      ...(query ? { query } : selected?.kind === 'USER' ? { query: selected.name } : {}),
    }),
    [active, query, selected],
  );
  const key = JSON.stringify(topicQuery);

  // 카테고리·검색어가 바뀌면 주제 목록을 처음부터 다시 읽는다.
  useEffect(() => {
    const controller = new AbortController();
    listTopicPage(client, topicQuery, controller.signal).then(
      (page) => {
        if (!controller.signal.aborted)
          setResult({ key, items: page.items, cursor: page.nextCursor, error: '' });
      },
      (error: unknown) => {
        if (controller.signal.aborted || (error instanceof V1Error && error.status === 401)) return;
        setResult({
          key,
          items: [],
          cursor: null,
          error: errorText(error, '주제를 불러오지 못했어요.'),
        });
      },
    );
    return () => controller.abort();
  }, [client, key, topicQuery]);

  const fresh = result?.key === key ? result : null;
  const cursor = fresh?.cursor ?? null;

  const loadMore = () => {
    if (!cursor) return;
    setLoadingMore(true);
    listTopicPage(client, { ...topicQuery, cursor })
      .then((page) =>
        setResult((current) =>
          current?.key === key
            ? { ...current, items: [...current.items, ...page.items], cursor: page.nextCursor }
            : current,
        ),
      )
      .catch((error: unknown) =>
        setResult((current) =>
          current?.key === key
            ? { ...current, error: errorText(error, '더 불러오지 못했어요.') }
            : current,
        ),
      )
      .finally(() => setLoadingMore(false));
  };

  const nickname = home?.profile.nickname?.trim() || '친구';
  const activeName = selected?.name;

  return (
    <>
      <section className="welcome-strip">
        <div className="welcome-avatar">🧒🏻</div>
        <div className="welcome-copy">
          <span className="eyebrow">TODAY WITH TIKI</span>
          <h1>{nickname}야, 오늘도 네 생각이 궁금해!</h1>
          <p>말로 편하게 이야기하면 티키가 멋진 글로 만들어 줄게.</p>
        </div>
        {(home?.profile.needsFirstGreeting ?? user?.needsFirstGreeting) && (
          <Link className="first-hello" to="/first-talk">
            👋 티키와 첫 인사
          </Link>
        )}
        {home && <HomeWeeklyBadge weekly={home.weeklyActivity} />}
      </section>

      {homeError && <Notice variant="error">{homeError}</Notice>}
      {!home && !homeError && (
        <div className="route-loading" role="status">
          오늘의 추천을 고르는 중이에요…
        </div>
      )}
      {home?.recommendations[0] && <HomeHeroTopic topic={home.recommendations[0]} />}

      <TopicCategoryBar
        client={client}
        categories={categories}
        active={active}
        onSelect={setActive}
        onChanged={loadCategories}
      />

      <div className="section-title">
        <div>
          <span className="eyebrow">PICK A QUESTION</span>
          <h2>
            {query
              ? `“${query}” 이야기를 찾았어요`
              : activeName
                ? `${activeName}에 대해 이야기해 볼까?`
                : '오늘 무슨 이야기를 해 볼까?'}
          </h2>
        </div>
        <Link to="/talk">모든 주제 보기 →</Link>
      </div>

      <div className="row between wrap">
        <label className="search-field">
          <Icon name="search" />
          <input
            aria-label="주제 검색"
            placeholder="궁금한 낱말로 찾아보기"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setQuery(search.trim());
            }}
          />
        </label>
        <div className="row">
          <Button className="light small" onClick={() => setQuery(search.trim())}>
            찾기
          </Button>
          {query && (
            <Button
              className="ghost small"
              onClick={() => {
                setSearch('');
                setQuery('');
              }}
            >
              지우기
            </Button>
          )}
        </div>
      </div>

      {fresh?.error && <Notice variant="error">{fresh.error}</Notice>}
      {!fresh && (
        <div className="route-loading" role="status">
          주제를 고르는 중이에요…
        </div>
      )}
      {fresh?.items.length ? <HomeTopicGrid topics={fresh.items} /> : null}
      {fresh?.items.length === 0 && !fresh.error && (
        <EmptyState
          title="이 갈래에는 아직 주제가 없어요."
          description="다른 카테고리를 고르거나 내가 궁금한 것을 직접 만들어 볼까요?"
          to="/topics/new"
          action="내 주제 만들기"
        />
      )}
      {cursor && (
        <div className="actions">
          <Button className="light" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? '불러오는 중…' : '주제 더 보기'}
          </Button>
        </div>
      )}

      <div className="home-lower">
        <HomeResumeCard resume={home?.resume ?? null} />
        <HomeWordPeek words={(home?.recentWords ?? []) as HomeRecentWord[]} />
      </div>

      <HomeCommunityPeek
        nickname={nickname}
        stories={(home?.communityStories ?? []) as HomeCommunityStoryPreview[]}
      />
    </>
  );
}
