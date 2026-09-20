import { confirmAction, promptText } from '../components/dialogs';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Model } from '../api/schema';
import { json } from '../api/requestOptions';
import { useAction, useServerCache, useServerQuery } from '../hooks/useServerApi';
import { useBackend } from '../providers/BackendProvider';
import { Message, Wait } from '../components/QueryFeedback';
import { ApiHomeView } from './ApiHomeView';
import { Icon } from '../components/Icon';
import { PageHeading, EmptyState } from '../components/ui';
import { contentAppearance } from '../components/contentAppearance';
import { BookEditor, CategoryManager } from '../components/ManagementPanels';
import { ChoiceControl } from '../components/ChoiceControl';
import { WordbookCard } from '../components/WordbookCard';
import { StoryReader } from '../components/StoryReader';
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
export type RecordItem = Model<'StorySummary'>;
export type PublicStory = Model<'PublicStoryDetail'>;
export function More({
  next,
  current = '',
  go,
}: {
  next: string | null | undefined;
  current?: string;
  go: (cursor: string) => void;
}) {
  if (!current && !next) return null;
  return (
    <div className="row pagination">
      <button className="btn light" disabled={!current} onClick={() => go('')}>
        처음으로
      </button>
      <button className="btn light" disabled={!next} onClick={() => go(next!)}>
        다음 보기
      </button>
    </div>
  );
}
export function ServerHome() {
  const { me } = useBackend();
  const q = useServerQuery<Model<'HomeResponse'>>('home');
  const stories = useServerQuery<Model<'StoryList'>>('stories?limit=3');
  const activities = useServerQuery<{
    items: Model<'ActivitySessionOut'>[];
    nextCursor: string | null;
  }>('activity-sessions?status=ACTIVE&limit=1');
  if (!q.data) return <Wait error={q.error} retry={q.refetch} />;
  return (
    <>
      <ApiHomeView
        guest={me?.user.role === 'GUEST'}
        home={q.data}
        stories={stories.data?.items ?? []}
        active={activities.data?.items ?? []}
      />
      {stories.error && <Wait error={stories.error} retry={stories.refetch} />}
      {activities.error && <Wait error={activities.error} retry={activities.refetch} />}
    </>
  );
}

export function ServerLibrary() {
  const { request } = useBackend();
  const action = useAction();
  const [query, search] = useState('');
  const [cursor, go] = useState('');
  const [bookCursor, bookGo] = useState('');
  const [selected, select] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [book, open] = useState('');
  const [favorite, fav] = useState(false);
  const q = useServerQuery<Model<'StoryList'>>(
    `stories?query=${encodeURIComponent(query)}&cursor=${encodeURIComponent(cursor)}${favorite ? '&favorite=true' : ''}`,
  );
  const books = useServerQuery<Model<'BookList'>>(`books?cursor=${encodeURIComponent(bookCursor)}`);
  return (
    <>
      <PageHeading
        eyebrow="MY GROWING LIBRARY"
        title="내 생각으로 채워지는 책장"
        description="작은 발견도, 달라진 생각도. 모두 소중한 나의 기록이에요."
      />
      <Message text={action.message} />
      <div className="library-toolbar">
        <label className="search-field">
          <Icon name="search" />
          <input
            aria-label="책장 검색"
            placeholder="제목이나 내 문장 찾기"
            value={query}
            onChange={(e) => {
              search(e.target.value);
              go('');
            }}
          />
        </label>
        <ChoiceControl
          label="아끼는 기록만"
          variant="chip"
          checked={favorite}
          onChange={(e) => {
            fav(e.target.checked);
            go('');
          }}
        />
      </div>
      {!q.data ? (
        <Wait error={q.error} retry={q.refetch} />
      ) : (
        <>
          {!!q.data.items.length && (
            <div className="library-section-head">
              <div>
                <h2>나의 기록</h2>
                <p>기록을 펼쳐 보거나, 마음에 드는 이야기를 한 권으로 묶어 보세요.</p>
              </div>
              <span>{q.data.items.length}개의 기록</span>
            </div>
          )}
          <div className="cards books library-story-grid">
            {q.data.items.map((s) => (
              <article className="book" key={s.id}>
                <Link
                  className={`book-cover ${contentAppearance(s.category).color}`}
                  to={`/shelf/${s.id}`}
                  title={s.title}
                >
                  <span className="eyebrow">MY LITTLE DISCOVERY</span>
                  <h3>{s.title}</h3>
                  <Icon name={contentAppearance(s.category).icon} />
                </Link>
                <div className="book-body">
                  <div className="library-card-meta">
                    <span className={`tag ${contentAppearance(s.category).color}`}>
                      {contentAppearance(s.category).label}
                    </span>
                    <button
                      className="library-favorite"
                      disabled={action.busy}
                      aria-pressed={s.favorite}
                      aria-label={s.favorite ? '아끼는 기록에서 빼기' : '아끼는 기록에 담기'}
                      onClick={() =>
                        void action.run(async () => {
                          await request(`stories/${s.id}/favorite`, {
                            method: s.favorite ? 'DELETE' : 'PUT',
                          });
                        })
                      }
                    >
                      <span aria-hidden="true">{s.favorite ? '★' : '☆'}</span>
                      {s.favorite ? '아끼는 기록' : '아끼기'}
                    </button>
                  </div>
                  <p className="line-clamp">{s.summary}</p>
                  <Link className="btn light" to={`/shelf/${s.id}`}>
                    내 생각 펼쳐 보기 <Icon name="arrow" />
                  </Link>
                  <ChoiceControl
                    label="이야기책에 넣기"
                    variant="chip"
                    className="library-book-toggle"
                    checked={selected.includes(s.id)}
                    onChange={(e) =>
                      select(
                        e.target.checked
                          ? [...selected, s.id]
                          : selected.filter((id) => id !== s.id),
                      )
                    }
                  />
                </div>
              </article>
            ))}
          </div>
          {!q.data.items.length && (
            <EmptyState
              title="아직 쓰이지 않은, 무궁무진한 이야기."
              description="새로운 모험에서 첫 문장을 남겨 보세요."
            />
          )}
          <More current={cursor} next={q.data.nextCursor} go={go} />
        </>
      )}
      <section className="panel library-builder">
        <header className="library-builder-head">
          <div>
            <span className="eyebrow">MAKE A STORYBOOK</span>
            <h2>이야기책 만들기</h2>
            <p>마음에 드는 기록을 골라 나만의 이야기책으로 묶어 보세요.</p>
          </div>
          <span className="library-selection-count">{selected.length}편 선택</span>
        </header>
        <div className="library-builder-grid">
          <form
            className="library-builder-form"
            onSubmit={(e) => {
              e.preventDefault();
              void action.run(async () => {
                const r = await request<Model<'BookResponse'>>(
                  'books',
                  json({ title, storyIds: selected }),
                );
                open(r.book.id);
                select([]);
              });
            }}
          >
            <label>
              책 제목
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 나의 첫 생각책"
                maxLength={60}
              />
            </label>
            <button className="btn" disabled={action.busy || !title.trim() || !selected.length}>
              선택한 {selected.length}편으로 책 만들기
            </button>
          </form>
          <div className="library-created-books">
            <h3>내가 만든 이야기책</h3>
            {books.data ? (
              <>
                {books.data.items.length ? (
                  <div className="library-book-list">
                    {books.data.items.map((b) => (
                      <button className="library-book-row" key={b.id} onClick={() => open(b.id)}>
                        <span className="library-book-icon" aria-hidden="true">
                          <Icon name="book" />
                        </span>
                        <span>
                          <strong>{b.title}</strong>
                          <small>
                            {b.storyCount}편 · {b.status === 'COMPLETED' ? '완성' : '편집 중'}
                          </small>
                        </span>
                        <Icon name="arrow" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="library-book-empty">아직 만든 이야기책이 없어요.</p>
                )}
                <More current={bookCursor} next={books.data.nextCursor} go={bookGo} />
              </>
            ) : (
              <Wait error={books.error} retry={books.refetch} />
            )}
          </div>
        </div>
      </section>
      {book && <BookEditor key={book} id={book} close={() => open('')} />}
    </>
  );
}
export function ServerRecord() {
  const id = useLocation().pathname.split('/').at(-1)!;
  const { request, me } = useBackend();
  const action = useAction();
  const navigate = useNavigate();
  const [edit, setEdit] = useState(false);
  const q = useServerQuery<Model<'StoryDetail'>>(`stories/${id}`);
  if (!q.data) return <Wait error={q.error} retry={q.refetch} />;
  const s = q.data.story;
  return (
    <StoryReader
      detail={q.data}
      guest={me?.user.role === 'GUEST'}
      notice={<Message text={action.message} />}
      editor={
        edit ? (
          <form
            className="record-editor"
            key={s.version}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void action.run(async () => {
                await request(
                  `stories/${id}`,
                  json({ title: f.get('title'), body: f.get('body') }, 'PATCH', s.version),
                );
                setEdit(false);
              });
            }}
          >
            <label>
              제목
              <input name="title" defaultValue={s.title} required maxLength={80} />
            </label>
            <label>
              이야기
              <textarea name="body" defaultValue={s.body} rows={10} required maxLength={4000} />
            </label>
            <div className="record-actions">
              <button className="btn" disabled={action.busy}>
                {action.busy ? '저장하고 있어요…' : '수정 저장'}
              </button>
              <button
                type="button"
                className="btn light"
                disabled={action.busy}
                onClick={() => setEdit(false)}
              >
                취소
              </button>
            </div>
          </form>
        ) : undefined
      }
      actions={
        <>
          {!edit && (
            <button className="btn" onClick={() => setEdit(true)}>
              <Icon name="spark" /> 이야기 다듬기
            </button>
          )}
          {q.data.sourceConversation && (
            <Link
              className="btn light"
              to={`/talk?session=${q.data.sourceConversation.conversationId}`}
            >
              <Icon name="chat" /> 나눈 대화 보기
            </Link>
          )}
          {me?.user.role !== 'GUEST' && (
            <Link className="btn light" to={`/story-share?story=${id}`}>
              <Icon name="share" /> 공유 요청
            </Link>
          )}
        </>
      }
      management={
        <button
          className="record-delete"
          disabled={action.busy}
          onClick={async () => {
            if (await confirmAction('이 기록을 삭제할까요?'))
              void action.run(async () => {
                await request(`stories/${id}`, {
                  method: 'DELETE',
                  headers: { 'If-Match': `"${s.version}"` },
                });
                navigate('/shelf');
              });
          }}
        >
          기록 삭제
        </button>
      }
    />
  );
}
export function ServerCommunity() {
  const id = useLocation().pathname.split('/')[2];
  const { request } = useBackend();
  const action = useAction();
  const [cursor, setCursor] = useState('');
  const list = useServerQuery<Page<PublicStory>>(
    !id ? `community/stories?cursor=${encodeURIComponent(cursor)}` : null,
  );
  const detail = useServerQuery<{ story: PublicStory }>(id ? `community/stories/${id}` : null);
  if (id) {
    if (!detail.data) return <Wait error={detail.error} retry={detail.refetch} />;
    const s = detail.data.story;
    return (
      <article className="panel server-detail">
        <Link to="/community">← 친구들의 이야기</Link>
        <span className="tag teal">보호자 확인 완료</span>
        <h1>{s.title}</h1>
        <p>{s.author.displayName}</p>
        <div className="server-prose">{s.body}</div>
        <Message text={action.message} />
        <div className="row">
          <button
            className="btn"
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                await request(`community/stories/${id}/recommendation`, {
                  method: s.recommendedByMe ? 'DELETE' : 'PUT',
                });
              })
            }
          >
            {s.recommendedByMe ? '추천 취소' : '마음에 들어요'} · {s.recommendationCount}
          </button>
          <button
            className="btn light"
            disabled={action.busy}
            onClick={async () => {
              const reason = await promptText('불편한 내용을 짧게 알려 주세요.');
              if (reason !== null)
                void action.run(async () => {
                  await request(
                    `community/stories/${id}/reports`,
                    json({ reason: 'OTHER', detail: reason }),
                  );
                  action.setMessage('신고를 접수했어요.');
                });
            }}
          >
            불편한 내용 알리기
          </button>
        </div>
      </article>
    );
  }
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
          <strong>소중한 생각을 안전하게 나눠요.</strong>
          <p>공유 전에 보호자가 확인하고, 이름이나 학교 같은 개인정보를 숨겨요.</p>
        </div>
        <Link to="/profile">공유 설정 보기</Link>
      </div>
      {!list.data ? (
        <Wait error={list.error} retry={list.refetch} />
      ) : (
        <>
          <div className="community-grid">
            {list.data.items.map((s) => (
              <article className="community-card" key={s.id}>
                <div className="community-cover">
                  <span aria-hidden="true">{contentAppearance(s.category).emoji}</span>
                  <small>{contentAppearance(s.category).label} 이야기</small>
                </div>
                <div className="community-copy">
                  <div className="author">
                    <span>{s.author.displayName.slice(0, 1)}</span>
                    <strong>{s.author.displayName}</strong>
                    <small>{s.author.ageBand} · 보호자 확인</small>
                  </div>
                  <h2>{s.title}</h2>
                  <p>{s.excerpt}</p>
                  <div className="row between">
                    <span className="like">
                      <Icon name="heart" /> {s.recommendationCount}
                    </span>
                    <Link className="read-more" to={`/community/${s.id}`}>
                      이야기 읽기 <Icon name="arrow" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!list.data.items.length && (
            <EmptyState
              title="친구의 이야기를 기다리고 있어요."
              description="함께 나눌 이야기가 생기면 여기서 만날 수 있어요."
            />
          )}
          <button
            className="btn light"
            disabled={!list.data.nextCursor}
            onClick={() => setCursor(list.data!.nextCursor!)}
          >
            다음 이야기
          </button>
        </>
      )}
    </>
  );
}

export function ServerWords() {
  const backend = useBackend();
  const action = useAction();
  const cache = useServerCache();
  const key = `jjcp-quiz-${backend.scopeId}`;
  const [quizId, quizSelect] = useState(() => sessionStorage.getItem(key) ?? '');
  const [cursor, go] = useState('');
  const [filter, setFilter] = useState('');
  const q = useServerQuery<Model<'WordbookList'>>(
    `wordbook?cursor=${encodeURIComponent(cursor)}${filter ? `&status=${filter}` : ''}`,
  );
  const quiz = useServerQuery<Model<'WordQuizOut'>>(quizId ? `word-quizzes/${quizId}` : null);
  const question = quiz.data?.questions.find((v) => !v.answered);
  return (
    <>
      <PageHeading
        eyebrow="MY WORD POCKET"
        title="새로 알게 된 말을 모아요"
        description="이야기 속에서 만난 단어를 내 문장으로 만들어 보자!"
      >
        <Link className="btn light" to="/talk">
          <Icon name="chat" /> 새 단어 만나기
        </Link>
      </PageHeading>
      {q.data && (
        <section className="word-summary">
          <div>
            <span>🌱</span>
            <strong>{q.data.summary.total}</strong>
            <small>만난 단어</small>
          </div>
          <div>
            <span>⭐</span>
            <strong>{q.data.summary.familiar}</strong>
            <small>내가 알아요</small>
          </div>
          <div>
            <span>🎯</span>
            <strong>{q.data.summary.total - q.data.summary.familiar}</strong>
            <small>더 연습할 단어</small>
          </div>
        </section>
      )}
      <Message text={action.message} />
      <div className="word-toolbar">
        <label>
          학습 상태
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              go('');
            }}
          >
            <option value="">전체</option>
            <option value="NEW">새 단어</option>
            <option value="PRACTICING">연습 중</option>
            <option value="FAMILIAR">익숙한 단어</option>
          </select>
        </label>
        <button
          className="btn light"
          disabled={action.busy || !q.data?.summary.total}
          onClick={() =>
            void action.run(async () => {
              const r = await backend.request<Model<'WordQuizOut'>>(
                'word-quizzes',
                json({ count: 5 }),
              );
              cache.set(`word-quizzes/${r.id}`, r);
              quizSelect(r.id);
              sessionStorage.setItem(key, r.id);
            })
          }
        >
          단어 퀴즈 시작
        </button>
      </div>
      {quizId &&
        (!quiz.data ? (
          <Wait error={quiz.error} retry={quiz.refetch} />
        ) : (
          <section className="panel">
            <h2>
              단어 퀴즈 · {quiz.data.answeredCount}/{quiz.data.questionCount}
            </h2>
            {question ? (
              <>
                <p>{question.prompt}</p>
                {question.options.map((o) => (
                  <button
                    className="btn light"
                    key={o.id}
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(async () => {
                        const r = await backend.request<Model<'QuizAnswerResponse'>>(
                          `word-quizzes/${quizId}/answers`,
                          json({ questionId: question.id, optionId: o.id }),
                        );
                        await quiz.refetch();
                        action.setMessage(
                          r.result.correct ? '맞았어요!' : '한 번 더 뜻을 살펴봐요.',
                        );
                      })
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </>
            ) : (
              <p>퀴즈를 마쳤어요!</p>
            )}
          </section>
        ))}
      {!q.data ? (
        <Wait error={q.error} retry={q.refetch} />
      ) : (
        <>
          <p className="word-list-caption">
            전체 {q.data.summary.total}개 · 익숙한 단어 {q.data.summary.familiar}개
          </p>
          <div className="word-grid word-pocket-grid">
            {q.data.items.map((w) => (
              <WordbookCard
                key={w.id}
                word={w}
                busy={action.busy}
                onSave={async (values) => {
                  await backend.request(`wordbook/entries/${w.id}`, json(values, 'PATCH'));
                  await backend.invalidate();
                }}
                onDelete={async () => {
                  if (!(await confirmAction('이 단어를 지울까요?'))) return false;
                  await backend.request(`wordbook/entries/${w.id}`, { method: 'DELETE' });
                  await backend.invalidate();
                  return true;
                }}
              />
            ))}
          </div>
          {!q.data.items.length && (
            <EmptyState
              title="첫 단어를 만날 준비가 됐어요."
              description="티키와 대화하다 궁금한 말을 단어 보관함에 담아 보세요."
            />
          )}
          <More current={cursor} next={q.data.nextCursor} go={go} />
        </>
      )}
    </>
  );
}
export function ServerShare() {
  const navigate = useNavigate();
  const params = new URLSearchParams(useLocation().search);
  const storyId = params.get('story');
  const { request } = useBackend();
  const action = useAction();
  const [id, setId] = useState(params.get('request') ?? '');
  const [audience, setAudience] = useState('PEERS');
  const [hide, setHide] = useState(true);
  const story = useServerQuery<Model<'StoryDetail'>>(storyId ? `stories/${storyId}` : null);
  const share = useServerQuery<Model<'ShareRequestResponse'>>(
    id ? `share-requests/${id}` : null,
    true,
  );
  return (
    <section className="panel">
      <h1>내 이야기 공유하기</h1>
      <Message text={action.message} />
      {story.data ? (
        <>
          <h2>{story.data.story.title}</h2>
          <p className="server-prose">{story.data.story.body}</p>
        </>
      ) : storyId ? (
        <Wait error={story.error} retry={story.refetch} />
      ) : (
        <Link to="/shelf">책장에서 이야기 고르기</Link>
      )}
      <label>
        공유 범위
        <select value={audience} onChange={(e) => setAudience(e.target.value)}>
          <option value="PEERS">친구들</option>
          <option value="FAMILY">가족</option>
          <option value="INVITED">초대한 보호자</option>
        </select>
      </label>
      <ChoiceControl
        label="프로필 숨기기"
        variant="switch"
        checked={hide}
        onChange={(e) => setHide(e.target.checked)}
      />
      <button
        className="btn light"
        disabled={action.busy || !story.data || !!id}
        onClick={() =>
          void action.run(async () => {
            const r = await request<Model<'ShareRequestResponse'>>(
              `stories/${storyId}/share-requests`,
              json({ audience, hideProfile: hide }),
            );
            setId(r.shareRequest.id);
            navigate(`/story-share?story=${storyId}&request=${r.shareRequest.id}`, {
              replace: true,
            });
          })
        }
      >
        보호자에게 공유 요청
      </button>
      {id &&
        (!share.data ? (
          <Wait error={share.error} retry={share.refetch} />
        ) : (
          <>
            <p>요청 상태: {share.data.shareRequest.status}</p>
            {share.data.shareRequest.pendingReason && (
              <p>{share.data.shareRequest.pendingReason}</p>
            )}
            <Link to="/profile">보호자 확인으로</Link>
            <button
              className="btn light"
              disabled={action.busy}
              onClick={() =>
                void action.run(async () => {
                  await request(`share-requests/${id}`, { method: 'DELETE' });
                })
              }
            >
              공유 요청 취소
            </button>
          </>
        ))}
    </section>
  );
}
export function ServerTopics() {
  const { request } = useBackend();
  const action = useAction();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [cursor, go] = useState('');
  const topics = useServerQuery<Model<'TopicList'>>(
    `topics?query=${encodeURIComponent(query)}&cursor=${encodeURIComponent(cursor)}`,
  );
  return (
    <>
      <h1>내가 주제 정하기</h1>
      <Message text={action.message} />
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void action.run(async () => {
            const r = await request<Model<'TopicCreateResponse'>>(
              'topics',
              json({ title: f.get('title'), category: f.get('category') }),
            );
            if (r.safety.allowed) navigate(`/talk?topic=${r.topic.id}`);
            else action.setMessage(r.safety.reason ?? '다른 주제를 골라 주세요.');
          });
        }}
      >
        <label>
          궁금한 주제
          <input name="title" maxLength={60} required />
        </label>
        <label>
          분야
          <select name="category">
            {[
              ['SCIENCE', '과학'],
              ['MATH', '수학'],
              ['HISTORY', '역사'],
              ['THINKING', '생각'],
              ['DAILY_LIFE', '일상'],
              ['NATURE', '자연'],
              ['FEELINGS', '마음'],
              ['IMAGINATION', '상상'],
            ].map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="btn light" disabled={action.busy}>
          주제 만들고 이야기하기
        </button>
      </form>
      <label>
        기존 주제 찾기
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            go('');
          }}
        />
      </label>
      {topics.data ? (
        <>
          <div className="server-grid">
            {topics.data.items.map((t) => (
              <Link className="panel" key={t.id} to={`/talk?topic=${t.id}`}>
                <h2>{t.title}</h2>
                <p>{t.hook}</p>
              </Link>
            ))}
          </div>
          <More current={cursor} next={topics.data.nextCursor} go={go} />
        </>
      ) : (
        <Wait error={topics.error} retry={topics.refetch} />
      )}
      <CategoryManager />
    </>
  );
}
