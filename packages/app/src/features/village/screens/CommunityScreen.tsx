import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  applyRecommendation,
  listCommunityStories,
  setRecommendation,
  STORY_CATEGORIES,
} from '../../../api/v1/endpoints';
import type { PublicStory, RecommendationFilter } from '../../../api/v1/types';
import { useAuth } from '../../../providers/AuthProvider';
import { Icon } from '../components/Icon';
import { CommunityStoryCard } from '../components/CommunityParts';
import {
  libraryErrorText,
  LibraryErrorNotice,
  LibraryLoading,
  LibrarySignedOutNotice,
} from '../components/LibraryParts';
import { Button, Notice, PageHeading } from '../components/ui';
import { useVillage } from '../state/VillageProvider';

const RECOMMENDATIONS: { key: RecommendationFilter | ''; label: string }[] = [
  { key: '', label: '모두' },
  { key: 'SIMILAR_AGE', label: '나랑 비슷한 나이' },
  { key: 'SAME_CATEGORY', label: '내가 좋아하는 이야기' },
  { key: 'POPULAR', label: '친구들이 많이 본 이야기' },
  { key: 'NEW', label: '새로 올라온 이야기' },
];

interface CommunityResult {
  key: string;
  items: PublicStory[];
  nextCursor: string | null;
  error: string;
}

/** 친구들의 이야기 목록(명세 14절). 승인된 공개본만, 서버가 준 표시 이름만 보여 준다. */
export function CommunityScreen() {
  const { client, status } = useAuth();
  const { toast } = useVillage();
  const [category, setCategory] = useState('');
  const [recommendation, setRecommendationFilter] = useState<RecommendationFilter | ''>('');
  const [result, setResult] = useState<CommunityResult | null>(null);
  const [reloads, setReloads] = useState(0);
  const key = `${reloads}|${category}|${recommendation}`;
  const loading = status === 'signedIn' && result?.key !== key;
  const items = result?.key === key ? result.items : [];
  const nextCursor = result?.key === key ? result.nextCursor : null;
  const error = result?.key === key ? result.error : '';

  useEffect(() => {
    if (status !== 'signedIn') return;
    const abort = new AbortController();
    listCommunityStories(
      client,
      { category: category || undefined, recommendation: recommendation || undefined, limit: 20 },
      abort.signal,
    )
      .then((page) => {
        if (!abort.signal.aborted)
          setResult({ key, items: page.items, nextCursor: page.nextCursor, error: '' });
      })
      .catch((reason: unknown) => {
        if (!abort.signal.aborted)
          setResult({
            key,
            items: [],
            nextCursor: null,
            error: libraryErrorText(reason, '친구들의 이야기를 불러오지 못했어요.'),
          });
      });
    return () => abort.abort();
  }, [client, status, key, category, recommendation]);

  const setItems = (change: (items: PublicStory[]) => PublicStory[]) =>
    setResult((prev) => (prev ? { ...prev, items: change(prev.items) } : prev));

  // 한 사람이 한 이야기에 추천은 한 번. 화면을 먼저 바꾸고, 실패하면 되돌린다.
  const recommend = async (story: PublicStory) => {
    const next = !story.recommendedByMe;
    setItems((prev) => applyRecommendation(prev, story.id, next));
    try {
      const body = await setRecommendation(client, story.id, next);
      setItems((prev) =>
        prev.map((item) =>
          item.id === story.id
            ? {
                ...item,
                recommendedByMe: body.recommendedByMe,
                recommendationCount: body.recommendationCount,
              }
            : item,
        ),
      );
    } catch (reason) {
      setItems((prev) => applyRecommendation(prev, story.id, story.recommendedByMe));
      toast(libraryErrorText(reason, '추천을 남기지 못했어요.'));
    }
  };

  const more = async () => {
    if (!nextCursor) return;
    try {
      const page = await listCommunityStories(client, {
        category: category || undefined,
        recommendation: recommendation || undefined,
        cursor: nextCursor,
        limit: 20,
      });
      setResult((prev) =>
        prev?.key === key
          ? { ...prev, items: [...prev.items, ...page.items], nextCursor: page.nextCursor }
          : prev,
      );
    } catch (reason) {
      setResult((prev) =>
        prev?.key === key
          ? { ...prev, error: libraryErrorText(reason, '더 불러오지 못했어요.') }
          : prev,
      );
    }
  };

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
          <strong>친구들의 진짜 이름과 학교는 여기에 없어요.</strong>
          <p>티키가 지어 준 이름과 학년대만 보여요. 내 이야기도 똑같이 지켜 줘요.</p>
        </div>
        <Link to="/story-share">내 이야기 나누기</Link>
      </div>
      {status === 'signedOut' && (
        <LibrarySignedOutNotice what="친구들의 이야기를" returnTo="/community" />
      )}
      {status === 'signedIn' && (
        <>
          <div className="community-toolbar">
            <div className="filters" role="group" aria-label="이야기 종류">
              <button
                className={`chip ${category === '' ? 'active' : ''}`}
                aria-pressed={category === ''}
                onClick={() => setCategory('')}
              >
                모두
              </button>
              {STORY_CATEGORIES.map((item) => (
                <button
                  key={item.key}
                  className={`chip ${category === item.key ? 'active' : ''}`}
                  aria-pressed={category === item.key}
                  onClick={() => setCategory(item.key)}
                >
                  {item.emoji} {item.label}
                </button>
              ))}
            </div>
            <span>{items.length}개의 이야기</span>
          </div>
          <div className="filters" role="group" aria-label="이야기 고르는 방법">
            {RECOMMENDATIONS.map((item) => (
              <button
                key={item.key || 'all'}
                className={`chip ${recommendation === item.key ? 'active' : ''}`}
                aria-pressed={recommendation === item.key}
                onClick={() => setRecommendationFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <LibraryErrorNotice error={error} onRetry={() => setReloads((n) => n + 1)} />
          {loading && items.length === 0 ? (
            <LibraryLoading label="친구들의 이야기를 모으는 중이에요…" />
          ) : items.length === 0 ? (
            <div className="panel empty">
              <Icon name="book" />
              <h2>아직 올라온 이야기가 없어요.</h2>
              <p>내 이야기를 보호자에게 보여 주면 친구들 책장에 첫 번째로 놓일 수 있어요.</p>
            </div>
          ) : (
            <div className="community-grid">
              {items.map((story) => (
                <CommunityStoryCard
                  key={story.id}
                  story={story}
                  onRecommend={(s) => void recommend(s)}
                />
              ))}
            </div>
          )}
          {nextCursor && (
            <div className="actions">
              <Button className="light" onClick={() => void more()}>
                더 보기
              </Button>
            </div>
          )}
          <Notice>추천은 한 이야기에 한 번만 남길 수 있어요. 다시 누르면 취소돼요.</Notice>
        </>
      )}
    </>
  );
}
