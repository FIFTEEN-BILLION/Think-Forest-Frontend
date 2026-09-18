import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { V1Error } from '../../../api/v1/client';
import {
  categoryEmoji,
  categoryLabel,
  createTopic,
  getCommunityStory,
  listStories,
  setRecommendation,
} from '../../../api/v1/endpoints';
import type { PublicStoryDetail, StorySummary, TopicCategoryId } from '../../../api/v1/types';
import { useAuth } from '../../../providers/AuthProvider';
import { Icon } from '../components/Icon';
import { CommunityReportForm } from '../components/CommunityParts';
import {
  libraryErrorText,
  LibraryErrorNotice,
  LibraryLoading,
  LibrarySignedOutNotice,
} from '../components/LibraryParts';
import { ShareRequestPanel } from '../components/ShareStoryPanel';
import { Button, EmptyState, Notice, PageHeading } from '../components/ui';
import { useVillage } from '../state/VillageProvider';

/** 공개된 친구 이야기 한 편(명세 14절). 본문·생각 과정·추천·신고까지 서버 값으로 보여 준다. */
export function CommunityStoryScreen() {
  const { id } = useParams();
  const { client, status } = useAuth();
  const { toast } = useVillage();
  const [result, setResult] = useState<{
    key: string;
    story: PublicStoryDetail | null;
    error: string;
  } | null>(null);
  const [reloads, setReloads] = useState(0);
  const key = `${reloads}|${id ?? ''}`;
  const loading = status === 'signedIn' && result?.key !== key;
  const story = result?.key === key ? result.story : null;
  const error = result?.key === key ? result.error : '';
  const setStory = (change: (story: PublicStoryDetail) => PublicStoryDetail) =>
    setResult((prev) => (prev?.story ? { ...prev, story: change(prev.story) } : prev));

  useEffect(() => {
    if (status !== 'signedIn' || !id) return;
    const abort = new AbortController();
    getCommunityStory(client, id, abort.signal)
      .then((next) => {
        if (!abort.signal.aborted) setResult({ key, story: next, error: '' });
      })
      .catch((reason: unknown) => {
        if (!abort.signal.aborted)
          setResult({
            key,
            story: null,
            error: libraryErrorText(reason, '이야기를 불러오지 못했어요.'),
          });
      });
    return () => abort.abort();
  }, [client, id, status, key]);

  const recommend = async () => {
    if (!story) return;
    const next = !story.recommendedByMe;
    const before = { count: story.recommendationCount, mine: story.recommendedByMe };
    setStory((prev) => ({
      ...prev,
      recommendedByMe: next,
      recommendationCount: Math.max(0, prev.recommendationCount + (next ? 1 : -1)),
    }));
    try {
      const body = await setRecommendation(client, story.id, next);
      setStory((prev) => ({
        ...prev,
        recommendedByMe: body.recommendedByMe,
        recommendationCount: body.recommendationCount,
      }));
      toast(body.recommendedByMe ? '이야기를 추천했어요!' : '추천을 취소했어요.');
    } catch (reason) {
      setStory((prev) => ({
        ...prev,
        recommendedByMe: before.mine,
        recommendationCount: before.count,
      }));
      toast(libraryErrorText(reason, '추천을 남기지 못했어요.'));
    }
  };

  if (status === 'loading' || loading)
    return <LibraryLoading label="친구의 이야기를 펼치는 중이에요…" />;
  if (status !== 'signedIn')
    return (
      <>
        <Link className="back" to="/community">
          <Icon name="back" /> 친구들의 이야기
        </Link>
        <LibrarySignedOutNotice what="친구의 이야기를" returnTo={`/community/${id ?? ''}`} />
      </>
    );
  if (!story)
    return (
      <EmptyState
        title="이 이야기를 찾지 못했어요."
        description={error || '친구들의 책장에서 다른 이야기를 만나 보세요.'}
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
          <div className="detail-emoji" aria-hidden="true">
            {categoryEmoji(story.category)}
          </div>
          <div>
            <span className="tag gold">보호자가 확인한 이야기</span>
            <h1>{story.title}</h1>
            <p>
              {story.author.displayName} · {story.author.ageBand} · {categoryLabel(story.category)}
            </p>
          </div>
        </header>
        <LibraryErrorNotice error={error} onRetry={() => setReloads((n) => n + 1)} />
        <div className="community-reader">
          <section className="story-reading panel">
            {story.body
              .split('\n')
              .filter(Boolean)
              .map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            <div className="story-finish">끝</div>
          </section>
          <aside className="story-side stack">
            {story.recommendationReason && (
              <section className="panel">
                <span className="eyebrow">왜 이 이야기를 만났을까?</span>
                <p className="recommend-reason">
                  <Icon name="spark" /> {story.recommendationReason}
                </p>
              </section>
            )}
            <section className="panel">
              <h2>이 이야기가 좋았나요?</h2>
              <p className="muted">친구에게 따뜻한 추천을 남겨 주세요. 한 번만 남길 수 있어요.</p>
              <Button
                className={story.recommendedByMe ? 'light' : ''}
                aria-pressed={story.recommendedByMe}
                onClick={() => void recommend()}
              >
                <Icon name="heart" /> {story.recommendedByMe ? '추천했어요' : '이야기 추천하기'} ·{' '}
                {story.recommendationCount}
              </Button>
            </section>
            {(story.thoughtJourney.initialIdea || story.thoughtJourney.finalReflection) && (
              <section className="panel">
                <h2>친구의 생각이 자란 길</h2>
                <dl className="definition">
                  <dt>처음 생각</dt>
                  <dd>{story.thoughtJourney.initialIdea || '—'}</dd>
                  <dt>마지막에 정리한 생각</dt>
                  <dd>{story.thoughtJourney.finalReflection || '—'}</dd>
                </dl>
              </section>
            )}
            <section className="panel story-question">
              <span className="eyebrow">생각 한 걸음 더</span>
              <h2>나라면 어떤 선택을 했을까?</h2>
              <Link className="btn light" to="/talk">
                티키와 이야기하기 <Icon name="arrow" />
              </Link>
            </section>
            <CommunityReportForm publicStoryId={story.id} />
          </aside>
        </div>
      </article>
    </>
  );
}

/** 내 이야기를 보호자에게 보여 주고 친구들과 나누기(명세 15절, 아이 쪽). */
export function ShareStoryScreen() {
  const { client, status } = useAuth();
  const [params] = useSearchParams();
  const [result, setResult] = useState<{
    key: string;
    stories: StorySummary[];
    error: string;
  } | null>(null);
  const [reloads, setReloads] = useState(0);
  const [chosen, setChosen] = useState(params.get('storyId') ?? '');
  const key = String(reloads);
  const loading = status === 'signedIn' && result?.key !== key;
  const stories = result?.key === key ? result.stories : [];
  const error = result?.key === key ? result.error : '';
  // 고른 이야기가 목록에 없으면 첫 번째 이야기를 보여 준다(따로 상태를 맞추지 않는다).
  const selected = stories.some((item) => item.id === chosen) ? chosen : (stories[0]?.id ?? '');

  useEffect(() => {
    if (status !== 'signedIn') return;
    const abort = new AbortController();
    listStories(client, { limit: 30 }, abort.signal)
      .then((page) => {
        if (!abort.signal.aborted) setResult({ key, stories: page.items, error: '' });
      })
      .catch((reason: unknown) => {
        if (!abort.signal.aborted)
          setResult({
            key,
            stories: [],
            error: libraryErrorText(reason, '내 이야기를 불러오지 못했어요.'),
          });
      });
    return () => abort.abort();
  }, [client, status, key]);

  const story = stories.find((item) => item.id === selected);

  return (
    <>
      <Link className="back" to="/community">
        <Icon name="back" /> 친구들의 이야기
      </Link>
      <PageHeading
        eyebrow="SHARE WITH CARE"
        title="내 이야기를 누구와 나눌까요?"
        description="보내기를 누르면 먼저 보호자에게 가요. 보호자가 읽어 보고 좋다고 하면 그때 공개돼요."
      />
      {status === 'signedOut' && (
        <LibrarySignedOutNotice what="내 이야기를 나눌 수 있고" returnTo="/story-share" />
      )}
      {status === 'signedIn' && (
        <>
          <LibraryErrorNotice error={error} onRetry={() => setReloads((n) => n + 1)} />
          {loading ? (
            <LibraryLoading label="내 이야기를 꺼내는 중이에요…" />
          ) : stories.length === 0 ? (
            <EmptyState
              title="아직 나눌 이야기가 없어요."
              description="티키와 이야기를 하나 마치면 여기에서 나눌 수 있어요."
              to="/talk"
              action="티키와 이야기하기"
            />
          ) : (
            <div className="share-layout">
              <div className="stack">
                <section className="panel">
                  <div className="field">
                    <label htmlFor="share-story">공유할 이야기</label>
                    <select
                      id="share-story"
                      value={selected}
                      onChange={(e) => setChosen(e.target.value)}
                    >
                      {stories.map((item) => (
                        <option value={item.id} key={item.id}>
                          {item.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </section>
                {selected && (
                  <ShareRequestPanel storyId={selected} storyTitle={story?.title} key={selected} />
                )}
              </div>
              <aside className="panel share-preview">
                <span className="eyebrow">공유 미리보기</span>
                <div className="share-book" aria-hidden="true">
                  {story ? categoryEmoji(story.category) : '📖'}
                </div>
                <h2>{story?.title ?? '공유할 이야기를 골라 주세요'}</h2>
                <p>
                  {story?.summary ?? '이야기를 선택하면 친구에게 보일 모습을 확인할 수 있어요.'}
                </p>
                <Notice>
                  친구들에게는 티키가 지어 준 이름과 학년대만 보여요. 진짜 이름과 학교는 보내지
                  않아요.
                </Notice>
              </aside>
            </div>
          )}
        </>
      )}
    </>
  );
}

/** POST /topics 가 받는 기본 카테고리. 아이에게 보이는 이름과 서버 코드를 함께 둔다. */
const TOPIC_CATEGORIES: { id: TopicCategoryId; label: string }[] = [
  { id: 'SCIENCE', label: '과학' },
  { id: 'MATH', label: '수학' },
  { id: 'HISTORY', label: '역사' },
  { id: 'IMAGINATION', label: '상상' },
  { id: 'DAILY_LIFE', label: '내 일상' },
  { id: 'FEELINGS', label: '마음' },
];

export function CustomTopicScreen() {
  const { toast } = useVillage();
  const { client, status } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState<TopicCategoryId>('SCIENCE');
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState('');
  const examples = useMemo(
    () => ['공룡은 왜 사라졌을까?', '구름은 어떻게 만들어질까?', '친구와 다투면 어떻게 말할까?'],
    [],
  );
  // 주제를 먼저 만들고, 만들어진 topicId 로 대화를 시작한다.
  // 예전에는 주소에 글자만 실어 보내서 대화 화면이 그대로 흘려보냈다.
  const start = async () => {
    const title = topic.trim();
    if (!title) {
      toast('티키와 이야기할 주제를 적어 주세요.');
      return;
    }
    if (status !== 'signedIn') {
      navigate(`/login?next=${encodeURIComponent('/topics/new')}`);
      return;
    }
    setBusy(true);
    setRefused('');
    try {
      const created = await createTopic(client, { title, category });
      toast(`“${created.topic.title}” 이야기를 준비했어요!`);
      navigate(`/talk?topicId=${encodeURIComponent(created.topic.id)}`);
    } catch (error) {
      // 422 UNSAFE_TOPIC: 저장도 대화 생성도 하지 않는다. 이유를 다정하게 그대로 보여 준다.
      if (error instanceof V1Error && error.code === 'UNSAFE_TOPIC')
        setRefused(error.message || '그 주제로는 이야기하기 어려워요. 다른 주제를 골라 볼까요?');
      else
        setRefused(
          error instanceof Error && error.message
            ? error.message
            : '주제를 준비하지 못했어요. 잠시 뒤에 다시 해 볼까요?',
        );
    } finally {
      setBusy(false);
    }
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
            {TOPIC_CATEGORIES.map((item) => (
              <button
                type="button"
                className={category === item.id ? 'selected' : ''}
                onClick={() => setCategory(item.id)}
                key={item.id}
              >
                {item.label}
              </button>
            ))}
          </fieldset>
          {refused && <Notice variant="error">{refused}</Notice>}
          <Button onClick={start} disabled={busy}>
            {busy ? '주제를 준비하는 중…' : '티키와 이야기 시작'} <Icon name="arrow" />
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
