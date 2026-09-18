import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  categoryEmoji,
  categoryLabel,
  isServerStoryId,
  listStories,
  mergeShelf,
  STORY_CATEGORIES,
} from '../../../api/v1/endpoints';
import type { ShelfItem } from '../../../api/v1/endpoints';
import type { StorySummary } from '../../../api/v1/types';
import { useAuth } from '../../../providers/AuthProvider';
import { PLACES } from '../data/catalog';
import { useVillage } from '../state/VillageProvider';
import { Icon } from '../components/Icon';
import { StageArt } from '../components/Simulation';
import { InquiryComparison } from '../components/InquiryComparison';
import { ThinkingComparison } from '../components/ThinkingComparison';
import { PathRecordCard } from '../components/PathParts';
import { LibraryBookshelf } from '../components/LibraryBooks';
import {
  libraryErrorText,
  LibraryErrorNotice,
  LibraryOriginTag,
  LibrarySignedOutNotice,
} from '../components/LibraryParts';
import { LibraryServerStory } from '../components/LibraryServerStory';
import {
  Button,
  EmptyState,
  Notice,
  PageHeading,
  Provenance,
  ReadAloud,
  RubricBars,
} from '../components/ui';

interface ShelfResult {
  key: string;
  stories: StorySummary[];
  nextCursor: string | null;
  error: string;
}

/** 서버 이야기(`/stories`)와 이 기기 기록을 한 책장에 모아 보여 준다. 어디에 저장됐는지는 카드마다 적는다. */
export function LibraryScreen() {
  const { data } = useVillage();
  const { client, status } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'books' ? 'books' : 'shelf';
  const category = params.get('category') ?? '';
  const query = params.get('q') ?? '';
  const favorites = params.get('favorites') === 'yes';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  // 불러온 결과에 조건 key 를 붙여 둔다. key 가 지금 조건과 다르면 곧 바뀔 화면이라 "불러오는 중"이다.
  const [result, setResult] = useState<ShelfResult | null>(null);
  const [reloads, setReloads] = useState(0);
  const [appending, setAppending] = useState(false);
  const filters = { query, category, favorite: favorites, from, to };
  const key = `${reloads}|${query}|${category}|${favorites}|${from}|${to}`;
  const loading = status === 'signedIn' && result?.key !== key;
  const stories = result?.key === key ? result.stories : [];
  const nextCursor = result?.key === key ? result.nextCursor : null;
  const error = result?.key === key ? result.error : '';

  const setFilter = (name: string, value: string) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (value) next.set(name, value);
        else next.delete(name);
        return next;
      },
      { replace: true },
    );

  useEffect(() => {
    if (status !== 'signedIn') return;
    const abort = new AbortController();
    // 검색어를 한 글자씩 칠 때마다 서버를 부르지 않도록 잠깐 기다린다.
    const timer = window.setTimeout(
      () => {
        listStories(
          client,
          { query, category, favorite: favorites, from, to, limit: 20 },
          abort.signal,
        )
          .then((page) => {
            if (!abort.signal.aborted)
              setResult({ key, stories: page.items, nextCursor: page.nextCursor, error: '' });
          })
          .catch((reason: unknown) => {
            if (!abort.signal.aborted)
              setResult({
                key,
                stories: [],
                nextCursor: null,
                error: libraryErrorText(reason, '서버 기록을 불러오지 못했어요.'),
              });
          });
      },
      query ? 300 : 0,
    );
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [client, status, key, query, category, favorites, from, to]);

  const more = async () => {
    if (!nextCursor) return;
    setAppending(true);
    try {
      const page = await listStories(client, {
        query,
        category,
        favorite: favorites,
        from,
        to,
        cursor: nextCursor,
        limit: 20,
      });
      setResult((prev) =>
        prev?.key === key
          ? { ...prev, stories: [...prev.stories, ...page.items], nextCursor: page.nextCursor }
          : prev,
      );
    } catch (reason) {
      setResult((prev) =>
        prev?.key === key
          ? { ...prev, error: libraryErrorText(reason, '더 불러오지 못했어요.') }
          : prev,
      );
    } finally {
      setAppending(false);
    }
  };

  const items = mergeShelf(stories, data.sessions, filters);
  const serverCount = items.filter((item) => item.origin === 'server').length;
  const localCount = items.filter((item) => item.origin !== 'server').length;

  return (
    <>
      <PageHeading
        eyebrow="MY GROWING LIBRARY"
        title="내 생각으로 채워지는 책장"
        description="작은 발견도, 달라진 생각도. 모두 소중한 나의 기록이에요."
      >
        <span className="tag teal">서버에 저장 {serverCount}개</span>
        <span className="tag sky">이 기기에 {localCount}개</span>
      </PageHeading>
      <div className="filters" role="tablist" aria-label="책장 보기">
        <button
          className={`chip ${view === 'shelf' ? 'active' : ''}`}
          aria-pressed={view === 'shelf'}
          onClick={() => setFilter('view', '')}
        >
          <Icon name="book" /> 이야기 한 편씩
        </button>
        <button
          className={`chip ${view === 'books' ? 'active' : ''}`}
          aria-pressed={view === 'books'}
          onClick={() => setFilter('view', 'books')}
        >
          <Icon name="spark" /> 이야기책으로 묶기
        </button>
      </div>
      {status === 'signedOut' && (
        <LibrarySignedOutNotice what="티키와 만든 이야기를" returnTo="/shelf" />
      )}
      {view === 'books' ? (
        <LibraryBookshelf stories={stories} />
      ) : (
        <>
          <div className="library-toolbar">
            <div className="filters" role="group" aria-label="이야기 종류 필터">
              <button
                className={`chip ${category === '' ? 'active' : ''}`}
                aria-pressed={category === ''}
                onClick={() => setFilter('category', '')}
              >
                전체
              </button>
              {STORY_CATEGORIES.map((item) => (
                <button
                  key={item.key}
                  className={`chip ${category === item.key ? 'active' : ''}`}
                  aria-pressed={category === item.key}
                  onClick={() => setFilter('category', item.key)}
                >
                  {item.emoji} {item.label}
                </button>
              ))}
            </div>
            <div className="row wrap">
              <label className="search-field">
                <Icon name="search" />
                <input
                  aria-label="책장 검색"
                  value={query}
                  placeholder="제목이나 내 문장 찾기"
                  onChange={(e) => setFilter('q', e.target.value)}
                />
              </label>
              <label className="row">
                <span className="muted">언제부터</span>
                <input
                  type="date"
                  aria-label="이 날짜부터"
                  value={from}
                  onChange={(e) => setFilter('from', e.target.value)}
                />
              </label>
              <label className="row">
                <span className="muted">언제까지</span>
                <input
                  type="date"
                  aria-label="이 날짜까지"
                  value={to}
                  onChange={(e) => setFilter('to', e.target.value)}
                />
              </label>
              <button
                className={`chip ${favorites ? 'active' : ''}`}
                aria-pressed={favorites}
                onClick={() => setFilter('favorites', favorites ? '' : 'yes')}
              >
                <Icon name="heart" />
                아끼는 기록
              </button>
            </div>
          </div>
          {category && (
            <Notice>
              종류를 고르면 티키와 만든 이야기만 보여요. 이 기기에만 있는 기록에는 종류가 없어요.
            </Notice>
          )}
          <LibraryErrorNotice error={error} onRetry={() => setReloads((n) => n + 1)} />
          <div className="section-title">
            <small>{loading ? '불러오는 중…' : `${items.length}개의 기록`}</small>
            <small>최근에 남긴 순서</small>
          </div>
          {items.length ? (
            <div className="cards books">
              {items.map((item) => (
                <LibraryShelfCard item={item} key={`${item.origin}-${item.id}`} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={
                query || favorites || category || from || to
                  ? '조건에 맞는 기록이 없어요.'
                  : '아직 쓰이지 않은, 무궁무진한 이야기.'
              }
              description="검색 조건을 바꾸거나 티키와 새 이야기를 시작해 보세요."
              to="/talk"
              action="티키와 이야기하기"
            />
          )}
          {nextCursor && (
            <div className="actions">
              <Button className="light" disabled={appending} onClick={() => void more()}>
                {appending ? '불러오는 중…' : '더 보기'}
              </Button>
            </div>
          )}
          <Notice>
            ‘둘러보기용 예시’는 서비스를 살펴보기 위한 목데이터예요. 티키와 만든 이야기는 서버에
            저장되고, ‘이 기기에만 있어요’ 기록은 이 브라우저에만 남아요.
          </Notice>
        </>
      )}
    </>
  );
}

function LibraryShelfCard({ item }: { item: ShelfItem }) {
  const color = item.origin === 'server' ? 'mint' : item.origin === 'local' ? 'sky' : 'gold';
  return (
    <article className="book">
      <div className={`book-cover ${color}`}>
        <span className="eyebrow">MY LITTLE DISCOVERY</span>
        <h3>{item.title}</h3>
        <span aria-hidden="true">{item.category ? categoryEmoji(item.category) : '📖'}</span>
      </div>
      <div className="book-body">
        <div className="row between">
          {item.category ? (
            <span className="tag lavender">{categoryLabel(item.category)}</span>
          ) : (
            <span className="tag lavender">생각 모험</span>
          )}
          <LibraryOriginTag origin={item.origin} />
        </div>
        <p className="line-clamp">{item.summary}</p>
        <small className="muted">
          {item.date}
          {item.favorite && ' · ♥ 아끼는 기록'}
        </small>
        <Link to={item.href} className="btn light">
          내 생각 펼쳐 보기
          <Icon name="arrow" />
        </Link>
      </div>
    </article>
  );
}

export function RecordDetailScreen() {
  const { id } = useParams();
  const { data, update, toast } = useVillage();
  const [scene, setScene] = useState(0);
  const [copied, setCopied] = useState(false);
  if (isServerStoryId(id)) return <LibraryServerStory storyId={id!} />;
  const record = data.sessions.find((r) => r.id === id);
  if (!record)
    return (
      <EmptyState
        title="기록을 찾지 못했어요."
        description="보관기간이 지났거나 삭제된 기록일 수 있어요."
        to="/shelf"
        action="책장으로 돌아가기"
      />
    );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${record.title}\n${record.date} · ${record.source === 'mock' ? '예시 기록' : '내가 직접 남긴 기록'}\n\n${record.answers.map((a) => `${a.question}\n${a.text}`).join('\n\n')}`,
      );
      setCopied(true);
      toast('기록을 클립보드에 복사했어요.');
    } catch {
      toast('복사 권한이 없어요. 아래 문장을 직접 선택해 복사할 수 있어요.');
    }
  };
  return (
    <>
      <Link to="/shelf" className="back">
        <Icon name="back" />
        나의 책장
      </Link>
      <PageHeading
        eyebrow="MY LITTLE DISCOVERY"
        title={record.title}
        description={`${record.date} · ${PLACES[record.track].name} · ${record.durationMinutes}분의 모험`}
      >
        <Button
          className="light small"
          aria-pressed={record.favorite}
          onClick={() =>
            update((p) => ({
              ...p,
              sessions: p.sessions.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r)),
            }))
          }
        >
          <Icon name="heart" />
          {record.favorite ? '아끼는 기록에 담았어요' : '아끼는 기록에 담기'}
        </Button>
      </PageHeading>
      <Notice>
        {record.source === 'mock'
          ? '서비스 흐름을 살펴보기 위한 예시 목데이터예요. 실제 아이의 학습 결과가 아니에요.'
          : '이 기록은 이 기기에만 있어요. 티키 서버에는 저장되지 않았어요.'}
      </Notice>
      {record.path ? (
        <>
          <PathRecordCard path={record.path} />
          <div className="actions">
            <ReadAloud text={record.text} />
          </div>
          <Provenance mock={record.source === 'mock'} />
        </>
      ) : record.thinking ? (
        <>
          <ThinkingComparison thinking={record.thinking} />
          <div className="actions">
            <ReadAloud text={record.text} />
            <Button className="light" onClick={() => void copy()}>
              {copied ? '복사했어요' : '내 문장 복사하기'}
            </Button>
          </div>
          <Provenance mock={record.source === 'mock'} />
        </>
      ) : record.inquiry ? (
        <>
          <InquiryComparison inquiry={record.inquiry} />
          <div className="actions">
            <ReadAloud text={record.text} />
            <Button className="light" onClick={() => void copy()}>
              {copied ? '복사했어요' : '내 문장 복사하기'}
            </Button>
          </div>
          <Provenance mock={record.source === 'mock'} />
        </>
      ) : (
        <div className="learning-grid">
          <section className="panel">
            <span className={`tag ${PLACES[record.track].color}`}>내 생각이 이어진 과정</span>
            {record.answers.map((a, i) => (
              <section className="answer-block" key={i}>
                <div className="eyebrow">MY THOUGHT {i + 1}</div>
                <h3>{a.question}</h3>
                <div className="quote">{a.text}</div>
              </section>
            ))}
            {record.observations && (
              <details>
                <summary>직접 남긴 관찰과 출처</summary>
                <dl className="definition">
                  <dt>처음 예상</dt>
                  <dd>{record.observations.prediction}</dd>
                  <dt>관찰 조건</dt>
                  <dd>
                    {record.observations.mode === 'custom'
                      ? '자유 주제 관찰'
                      : '낮은 값과 높은 값 비교'}
                  </dd>
                  {record.observations.mode === 'custom' && (
                    <>
                      <dt>첫 관찰</dt>
                      <dd>{record.observations.a}</dd>
                      <dt>두 번째 관찰</dt>
                      <dd>{record.observations.b}</dd>
                    </>
                  )}
                  <dt>확인한 출처</dt>
                  <dd>{record.observations.source || '—'}</dd>
                </dl>
              </details>
            )}
            {record.emotion && <p className="muted">내가 느낀 마음 · {record.emotion}</p>}
            <div className="actions split">
              <ReadAloud text={record.text} />
              <Button className="light small" onClick={() => void copy()}>
                {copied ? '복사했어요' : '내 문장 복사하기'}
              </Button>
            </div>
          </section>
          <div className="stack">
            <section className="panel">
              <h3>이번 활동의 생각 발자국</h3>
              {record.rubric && <RubricBars rubric={record.rubric} />}
              <Provenance mock={record.source === 'mock'} />
            </section>
            {record.story && (
              <section className="story-card">
                <div className="stage">
                  <StageArt scene={scene} activityId={record.activityId} />
                  <span className="scene-label">이야기 다시 보기 · {scene + 1} / 4</span>
                </div>
                <div className="scene-caption" aria-live="polite">
                  {record.story.scenes[scene]}
                </div>
                <div className="stage-controls actions split">
                  <Button
                    className="light small"
                    disabled={scene === 0}
                    onClick={() => setScene(scene - 1)}
                  >
                    이전 장면
                  </Button>
                  <Button
                    className="light small"
                    disabled={scene === 3}
                    onClick={() => setScene(scene + 1)}
                  >
                    다음 장면
                  </Button>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function CompleteScreen() {
  const { id } = useParams();
  const { data, storageError } = useVillage();
  if (isServerStoryId(id)) return <LibraryServerStory storyId={id!} variant="complete" />;
  const record = data.sessions.find((s) => s.id === id);
  if (!record)
    return (
      <EmptyState
        title="완료한 기록을 찾지 못했어요."
        description="책장에서 다른 기록을 찾아볼 수 있어요."
        to="/shelf"
        action="책장으로 가기"
      />
    );
  if (record.thinking || record.path)
    return (
      <div className="inquiry">
        <div className="success-head">
          <div className="success-mark">
            <Icon name="sprout" />
          </div>
          <span className="tag teal" role="status">
            {storageError ? '기기 저장 확인 필요' : '저장 완료'}
          </span>
          <h1>내 탐구를 책장에 담았어요.</h1>
          <p>
            {storageError
              ? '현재 화면에는 남아 있어요. 기기에는 저장하지 못했으니 기록 관리에서 내려받아 주세요.'
              : record.path
                ? '처음 가르친 규칙부터 고친 카드까지, 언제든 다시 볼 수 있어요.'
                : '처음 생각부터 친구를 설득한 증거까지, 언제든 다시 볼 수 있어요.'}
          </p>
        </div>
        {record.path ? (
          <PathRecordCard path={record.path} />
        ) : (
          record.thinking && <ThinkingComparison thinking={record.thinking} />
        )}
        <div className="actions split">
          <Link to="/" className="btn light">
            첫 화면으로
          </Link>
          <Link to={`/shelf/${record.id}`} className="btn">
            책장에서 다시 보기
            <Icon name="book" />
          </Link>
        </div>
        <p className="inquiry-footnote">
          생각 친구는 AI예요. 결과 계산과 설득 판정은 정해진 규칙이 해요. · 사고 기술은 점수가
          아니에요.
        </p>
      </div>
    );
  if (record.inquiry)
    return (
      <div className="inquiry">
        <div className="success-head">
          <div className="success-mark">
            <Icon name="sprout" />
          </div>
          <span className="tag teal" role="status">
            {storageError ? '기기 저장 확인 필요' : '저장 완료'}
          </span>
          <h1>내 탐구를 책장에 담았어요.</h1>
          <p>
            {storageError
              ? '현재 화면에는 남아 있어요. 기기에는 저장하지 못했으니 기록 관리에서 내려받아 주세요.'
              : '처음 생각부터 마지막 이유까지, 언제든 다시 볼 수 있어요.'}
          </p>
        </div>
        <InquiryComparison inquiry={record.inquiry} />
        <div className="actions split">
          <Link to="/" className="btn light">
            첫 화면으로
          </Link>
          <Link to={`/shelf/${record.id}`} className="btn">
            책장에서 다시 보기
            <Icon name="book" />
          </Link>
        </div>
        <p className="inquiry-footnote">체험용 질문·결과 · 실제 AI 연결 없음 · 사람 검수 미완료</p>
      </div>
    );
  return (
    <div className="center">
      <div className="success-head">
        <div className="success-mark">
          <Icon name="sprout" />
        </div>
        <div className="eyebrow">ONE MORE LITTLE DISCOVERY</div>
        <h1 className="space-top">나만의 생각이 한 뼘 자랐어요.</h1>
        <p>
          {data.profile.name}의 문장을{' '}
          {storageError
            ? '현재 화면에 담았어요. 기기 저장은 실패했어요.'
            : '책장에 소중히 담았어요.'}
        </p>
      </div>
      <section className="panel">
        <span className={`tag ${PLACES[record.track].color}`}>
          {PLACES[record.track].name} · 모험 완료
        </span>
        <h2 className="space-top">{record.title}</h2>
        <div className="quote">{record.answers.at(-1)?.text}</div>
        {record.rubric && <RubricBars rubric={record.rubric} />}
        <Provenance mock={record.source === 'mock'} />
        <div className="actions split">
          <Link to="/adventures" className="btn light">
            다른 모험 만나기
          </Link>
          <Link to={`/shelf/${record.id}`} className="btn">
            내 기록 펼쳐 보기
            <Icon name="book" />
          </Link>
        </div>
      </section>
    </div>
  );
}
