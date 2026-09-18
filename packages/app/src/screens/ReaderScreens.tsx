import { Message, Wait } from '../components/QueryFeedback';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { json } from '../api/requestOptions';
import { useAction, useServerCache, useServerQuery } from '../hooks/useServerApi';
import { useBackend } from '../providers/BackendProvider';
import { BookEditor, CategoryManager } from '../components/ManagementPanels';
import type { TopicCategory } from '../components/ManagementPanels';

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
export interface RecordItem {
  id: string;
  kind: 'STORY' | 'ACTIVITY';
  title: string;
  summary: string;
  category?: string;
  track?: string;
  favorite: boolean;
  version: number;
  updatedAt: string;
  createdAt: string;
}
export interface PublicStory {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  author: { displayName: string; ageBand: string | null };
  recommendationCount: number;
  recommendedByMe: boolean;
  publishedAt: string;
}
interface Word {
  id: string;
  word: string;
  meaning: string;
  example: string;
  reading: string;
  mySentence: string | null;
  status: string;
  version: number;
}
interface Home {
  profile: { nickname: string; needsFirstGreeting: boolean };
  recommendations: { topicId: string; title: string; reason: string; category: string }[];
  resume: { conversationId: string; title: string } | null;
  resumeActivity: { id: string; activityId: string } | null;
  recentWords: Word[];
  recentRecords: RecordItem[];
  communityStories: PublicStory[];
  weeklyActivity: { conversationDays: number; completedStories: number };
}

export function ServerHome() {
  const { me } = useBackend();
  const q = useServerQuery<Home>(me?.user.role === 'CHILD' ? 'home' : null);
  if (me?.user.role === 'GUARDIAN')
    return (
      <section className="panel">
        <h1>보호자 공간에 오신 것을 환영해요.</h1>
        <p>연결된 아이의 기록을 확인하고 공유 요청을 검토할 수 있어요.</p>
        <Link className="btn" to="/profile">
          아이 연결과 설정
        </Link>
      </section>
    );
  if (!q.data) return <Wait error={q.error} retry={q.refetch} />;
  const home = q.data;
  const link = home.profile.needsFirstGreeting
    ? '/first-talk'
    : home.resume
      ? `/talk?session=${home.resume.conversationId}`
      : `/talk?topic=${home.recommendations[0]?.topicId ?? 'topic_ice_cup'}`;
  return (
    <div className="home-page">
      <header className="home-welcome">
        <div>
          <span className="home-eyebrow">오늘의 작은 궁금증</span>
          <h1>{home.profile.nickname || '새싹'}, 오늘은 어떤 생각을 했어?</h1>
        </div>
        <Link className="home-friends-shortcut" to="/community">
          친구들 이야기 →
        </Link>
      </header>
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-hero-label">너의 생각을 듣는 친구, 티키</span>
          <h2>
            {home.profile.needsFirstGreeting
              ? '안녕! 네 이야기를 들려줄래?'
              : (home.resume?.title ?? '오늘의 작은 궁금증을 함께 풀어보자.')}
          </h2>
          <p>정답보다 네 생각이 궁금해. 말로 해도, 글로 써도 괜찮아.</p>
          <Link className="home-primary" to={link}>
            {home.profile.needsFirstGreeting
              ? '첫 인사 나누기'
              : home.resume
                ? '이어서 이야기하기'
                : '새 이야기 시작하기'}{' '}
            →
          </Link>
        </div>
        <div className="home-hero-picture" aria-hidden="true">
          <div className="home-picture-circle">🌱</div>
        </div>
      </section>
      <div className="server-grid">
        <section className="panel">
          <h2>이번 주 발자국</h2>
          <p>
            이야기한 날 {home.weeklyActivity.conversationDays}일 · 완성한 이야기{' '}
            {home.weeklyActivity.completedStories}편
          </p>
          <Link to="/report">발자국 살펴보기 →</Link>
        </section>
        <section className="panel">
          <h2>생각 모험</h2>
          <p>관찰하고, 이유를 찾고, 내 생각을 남겨요.</p>
          <Link
            to={
              home.resumeActivity
                ? `/session/lab?session=${home.resumeActivity.id}&activity=${home.resumeActivity.activityId}`
                : '/adventures'
            }
          >
            {home.resumeActivity ? '하던 모험 이어하기' : '모험 고르기'} →
          </Link>
        </section>
      </div>
      <section>
        <div className="row between">
          <h2>오늘의 이야기 주제</h2>
          <Link to="/topics/new">내가 주제 정하기</Link>
        </div>
        <div className="server-grid">
          {home.recommendations.map((t) => (
            <Link className="panel server-card" key={t.topicId} to={`/talk?topic=${t.topicId}`}>
              <span className="tag teal">{t.category}</span>
              <h3>{t.title}</h3>
              <p>{t.reason}</p>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <div className="row between">
          <h2>나의 책장</h2>
          <Link to="/shelf">모두 보기 →</Link>
        </div>
        <div className="server-grid">
          {home.recentRecords.map((r) => (
            <Link className="panel server-card" to={`/shelf/${r.id}`} key={r.id}>
              <h3>{r.title}</h3>
              <p>{r.summary}</p>
            </Link>
          ))}
          {!home.recentRecords.length && (
            <p className="muted">완성한 이야기와 모험이 여기에 모여요.</p>
          )}
        </div>
      </section>
      <section>
        <div className="row between">
          <h2>새로 만난 단어</h2>
          <Link to="/words">단어 보관함 →</Link>
        </div>
        <div className="server-grid">
          {home.recentWords.map((w) => (
            <article className="panel" key={w.id}>
              <h3>{w.word}</h3>
              <p>{w.meaning}</p>
            </article>
          ))}
          {!home.recentWords.length && <p>아직 보관한 단어가 없어요.</p>}
        </div>
      </section>
      <section>
        <div className="row between">
          <h2>친구들의 이야기</h2>
          <Link to="/community">모두 보기 →</Link>
        </div>
        <div className="server-grid">
          {home.communityStories.map((s) => (
            <Link className="panel server-card" to={`/community/${s.id}`} key={s.id}>
              <span className="tag gold">보호자 확인 완료</span>
              <h3>{s.title}</h3>
              <p>{s.excerpt}</p>
            </Link>
          ))}
          {!home.communityStories.length && <p>공유된 이야기가 아직 없어요.</p>}
        </div>
      </section>
    </div>
  );
}

export function ServerLibrary() {
  const { request } = useBackend();
  const action = useAction();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('ALL');
  const [cursor, setCursor] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState('나의 이야기책');
  const [bookId, setBookId] = useState('');
  const [bookCursor, setBookCursor] = useState('');
  const q = useServerQuery<Page<RecordItem>>(
    `records?kind=${kind}&query=${encodeURIComponent(query)}&cursor=${encodeURIComponent(cursor)}`,
  );
  const books = useServerQuery<
    Page<{ id: string; title: string; status: string; version: number }>
  >(`books?cursor=${encodeURIComponent(bookCursor)}`);
  return (
    <>
      <header className="page-head">
        <h1>나의 책장</h1>
        <p>내가 완성한 이야기와 모험을 다시 만나요.</p>
      </header>
      <Message text={action.message} />
      <div className="row wrap">
        <label>
          기록 찾기{' '}
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor('');
            }}
          />
        </label>
        <select
          aria-label="기록 종류"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setCursor('');
          }}
        >
          <option value="ALL">모든 기록</option>
          <option value="STORY">이야기</option>
          <option value="ACTIVITY">생각 모험</option>
        </select>
      </div>
      {!q.data ? (
        <Wait error={q.error} retry={q.refetch} />
      ) : (
        <>
          <div className="server-grid">
            {q.data.items.map((r) => (
              <article className="panel" key={r.id}>
                <span className="tag teal">{r.kind === 'STORY' ? '이야기' : '생각 모험'}</span>
                <Link to={`/shelf/${r.id}`}>
                  <h2>{r.title}</h2>
                </Link>
                <p>{r.summary}</p>
                <button
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      await request(
                        `${r.kind === 'STORY' ? 'stories' : 'activity-records'}/${r.id}/favorite`,
                        { method: r.favorite ? 'DELETE' : 'PUT' },
                      );
                    })
                  }
                >
                  {r.favorite ? '★ 아끼는 기록' : '☆ 아끼는 기록에 담기'}
                </button>
                {r.kind === 'STORY' && (
                  <label>
                    <input
                      type="checkbox"
                      checked={selected.includes(r.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, r.id]
                            : selected.filter((id) => id !== r.id),
                        )
                      }
                    />{' '}
                    이야기책에 넣기
                  </label>
                )}
              </article>
            ))}
          </div>
          {!q.data.items.length && <p>아직 기록이 없어요. 첫 이야기를 시작해 볼까요?</p>}
          <div className="row">
            <button className="btn light" disabled={!cursor} onClick={() => setCursor('')}>
              처음으로
            </button>
            <button
              className="btn light"
              disabled={!q.data.nextCursor}
              onClick={() => setCursor(q.data!.nextCursor!)}
            >
              다음 기록
            </button>
          </div>
        </>
      )}
      <section className="panel">
        <h2>이야기책 만들기</h2>
        <label>
          책 제목 <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <button
          className="btn"
          disabled={action.busy || !selected.length || !title.trim()}
          onClick={() =>
            void action.run(async () => {
              const result = await request<{ book: { id: string } }>(
                'books',
                json({ title, storyIds: selected }),
              );
              setBookId(result.book.id);
              setSelected([]);
              action.setMessage('이야기책 초안을 만들었어요.');
            })
          }
        >
          선택한 {selected.length}편으로 책 만들기
        </button>
        {books.data?.items.map((book) => (
          <div className="row between" key={book.id}>
            <strong>{book.title}</strong>
            <button onClick={() => setBookId(book.id)}>책 열기</button>
            <span>{book.status === 'COMPLETED' ? '완성된 책' : '편집 중'}</span>
            {book.status === 'DRAFT' && (
              <button
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await request(`books/${book.id}/complete`, json({}, 'POST', book.version));
                  })
                }
              >
                책 완성하기
              </button>
            )}
          </div>
        ))}
        {!!books.error && <Wait error={books.error} retry={books.refetch} />}
        <button
          disabled={!books.data?.nextCursor}
          onClick={() => setBookCursor(books.data!.nextCursor!)}
        >
          다음 책
        </button>
      </section>
      {bookId && <BookEditor key={bookId} id={bookId} close={() => setBookId('')} />}
    </>
  );
}

interface DetailRecord extends RecordItem {
  body?: string;
  result?: { state: Record<string, unknown>; track: string };
}
export function ServerRecord() {
  const id = useLocation().pathname.split('/').at(-1);
  const { request } = useBackend();
  const action = useAction();
  const navigate = useNavigate();
  const q = useServerQuery<{
    record: { kind: string; story?: DetailRecord; activity?: DetailRecord };
  }>(`records/${id}`);
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  if (!q.data) return <Wait error={q.error} retry={q.refetch} />;
  const item = q.data.record;
  const record = (item.story ?? item.activity)!;
  return (
    <article className="panel server-detail">
      <Link to="/shelf">← 책장으로</Link>
      <h1>{record.title}</h1>
      <Message text={action.message} />
      {edit ? (
        <>
          <label>
            제목
            <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            이야기
            <textarea
              rows={10}
              value={body}
              maxLength={20000}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <button
            className="btn"
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                await request(`stories/${id}`, json({ title, body }, 'PATCH', record.version));
                setEdit(false);
              })
            }
          >
            수정 저장
          </button>
        </>
      ) : (
        <>
          {(!record.result || record.body) && (
            <div className="server-prose">{record.body ?? record.summary}</div>
          )}
          {record.result &&
            Object.entries(record.result.state)
              .filter(([, v]) => typeof v === 'string')
              .map(([k, v]) => <p key={k}>{String(v)}</p>)}
        </>
      )}
      <div className="row wrap">
        {item.kind === 'STORY' && (
          <>
            <button
              className="btn light"
              onClick={() => {
                setTitle(record.title);
                setBody(record.body ?? '');
                setEdit(!edit);
              }}
            >
              이야기 다듬기
            </button>
            <Link className="btn" to={`/story-share?story=${id}`}>
              보호자에게 공유 요청
            </Link>
          </>
        )}
        <button
          className="btn light"
          disabled={action.busy}
          onClick={() => {
            if (window.confirm('이 기록을 삭제할까요?'))
              void action.run(async () => {
                await request(`${item.kind === 'STORY' ? 'stories' : 'activity-records'}/${id}`, {
                  method: 'DELETE',
                  headers: { 'If-Match': `"${record.version}"` },
                });
                navigate('/shelf');
              });
          }}
        >
          기록 삭제
        </button>
      </div>
    </article>
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
            onClick={() => {
              const reason = window.prompt('불편한 내용을 짧게 알려 주세요.');
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
      <header className="page-head">
        <h1>친구들의 이야기</h1>
        <p>서로 다른 생각을 만나고, 새로운 궁금증을 찾아요.</p>
      </header>
      {!list.data ? (
        <Wait error={list.error} retry={list.refetch} />
      ) : (
        <>
          <div className="server-grid">
            {list.data.items.map((s) => (
              <Link className="panel server-card" to={`/community/${s.id}`} key={s.id}>
                <span className="tag gold">보호자 확인 완료</span>
                <h2>{s.title}</h2>
                <p>{s.excerpt}</p>
                <small>
                  {s.author.displayName} · 추천 {s.recommendationCount}
                </small>
              </Link>
            ))}
          </div>
          {!list.data.items.length && <p>아직 공개된 이야기가 없어요.</p>}
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

interface Quiz {
  id: string;
  questions: {
    id: string;
    wordId: string;
    prompt: string;
    options: { id: string; label: string }[];
  }[];
  answeredQuestionIds: string[];
  completedAt: string | null;
}
export function ServerWords() {
  const { request, me } = useBackend();
  const action = useAction();
  const [word, setWord] = useState('');
  const quizKey = `jjcp-quiz-${me?.user.id}`;
  const [quizId, setQuizId] = useState(() => sessionStorage.getItem(quizKey) ?? '');
  const restoredQuiz = useServerQuery<{ quiz: Quiz }>(quizId ? `word-quizzes/${quizId}` : null);
  const cache = useServerCache();
  const quiz = restoredQuiz.data?.quiz;
  const setQuiz = (value: Quiz) => {
    cache.set(`word-quizzes/${value.id}`, { quiz: value });
    setQuizId(value.id);
    sessionStorage.setItem(quizKey, value.id);
  };
  const [cursor, setCursor] = useState('');
  const [filter, setFilter] = useState('');
  const q = useServerQuery<
    Page<Word> & {
      summary: { total: number; familiar: number; practicing: number; newThisWeek: number };
    }
  >(`wordbook?cursor=${encodeURIComponent(cursor)}${filter ? `&status=${filter}` : ''}`);
  const question = quiz?.questions.find((item) => !quiz.answeredQuestionIds.includes(item.id));
  return (
    <>
      <header className="page-head">
        <h1>새로 알게 된 말을 모아요</h1>
        <p>이야기에서 만난 말을 내 문장으로 만들어 보자.</p>
      </header>
      <Message text={action.message} />
      {!!restoredQuiz.error && <Wait error={restoredQuiz.error} retry={restoredQuiz.refetch} />}
      <label>
        학습 상태
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setCursor('');
          }}
        >
          <option value="">모든 단어</option>
          <option value="NEW">새 단어</option>
          <option value="PRACTICING">연습 중</option>
          <option value="FAMILIAR">익숙한 단어</option>
        </select>
      </label>
      <form
        className="panel row wrap"
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            await request('wordbook/entries', json({ word }));
            setWord('');
          });
        }}
      >
        <label>
          새 단어 <input value={word} maxLength={30} onChange={(e) => setWord(e.target.value)} />
        </label>
        <button className="btn" disabled={action.busy || !word.trim()}>
          단어 보관
        </button>
        <button
          type="button"
          className="btn light"
          disabled={action.busy || !q.data?.summary.total}
          onClick={() =>
            void action.run(async () => {
              const r = await request<{ quiz: Quiz }>('word-quizzes', json({ count: 5 }));
              setQuiz(r.quiz);
            })
          }
        >
          단어 퀴즈
        </button>
      </form>
      {quiz && (
        <section className="quiz-panel">
          <h2>{question?.prompt ?? '모든 문제를 풀었어요!'}</h2>
          {question?.options.map((option) => (
            <button
              className="chip"
              disabled={action.busy}
              key={option.id}
              onClick={() =>
                void action.run(async () => {
                  const answer = await request<{ correct: boolean; explanation: string }>(
                    `word-quizzes/${quiz.id}/answers`,
                    json({ questionId: question.id, optionId: option.id }),
                  );
                  action.setMessage(
                    `${answer.correct ? '맞았어요!' : '다시 기억해 볼까요?'} ${answer.explanation}`,
                  );
                  setQuiz((await request<{ quiz: Quiz }>(`word-quizzes/${quiz.id}`)).quiz);
                })
              }
            >
              {option.label}
            </button>
          ))}
        </section>
      )}
      {!q.data ? (
        <Wait error={q.error} retry={q.refetch} />
      ) : (
        <>
          <p>
            보관한 단어 {q.data.summary.total}개 · 익숙한 단어 {q.data.summary.familiar}개 · 이번 주{' '}
            {q.data.summary.newThisWeek}개
          </p>
          <div className="word-grid">
            {q.data.items.map((w) => (
              <article className="word-card" key={w.id}>
                <span className="tag teal">{w.status === 'FAMILIAR' ? '익숙해요' : '연습 중'}</span>
                <h2>
                  {w.word} <small>{w.reading}</small>
                </h2>
                <p>{w.meaning}</p>
                <blockquote>{w.example}</blockquote>
                {w.mySentence && <p>내 문장: {w.mySentence}</p>}
                <button
                  className="btn light"
                  disabled={action.busy}
                  onClick={() => {
                    const sentence = window.prompt(
                      '이 단어를 넣어 내 문장을 만들어 주세요.',
                      w.mySentence ?? '',
                    );
                    if (sentence !== null)
                      void action.run(async () => {
                        await request(
                          `wordbook/entries/${w.id}`,
                          json({ mySentence: sentence }, 'PATCH', w.version),
                        );
                      });
                  }}
                >
                  내 문장 만들기
                </button>
                <button
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      await request(
                        `wordbook/entries/${w.id}`,
                        json(
                          { status: w.status === 'FAMILIAR' ? 'PRACTICING' : 'FAMILIAR' },
                          'PATCH',
                          w.version,
                        ),
                      );
                    })
                  }
                >
                  학습 상태 바꾸기
                </button>
                <button
                  disabled={action.busy}
                  onClick={() => {
                    if (window.confirm('이 단어를 보관함에서 지울까요?'))
                      void action.run(async () => {
                        await request(`wordbook/entries/${w.id}`, {
                          method: 'DELETE',
                          headers: { 'If-Match': `"${w.version}"` },
                        });
                      });
                  }}
                >
                  단어 삭제
                </button>
              </article>
            ))}
          </div>
          {!q.data.items.length && <p>아직 보관한 단어가 없어요.</p>}
          <button
            className="btn light"
            disabled={!q.data.nextCursor}
            onClick={() => setCursor(q.data!.nextCursor!)}
          >
            다음 단어
          </button>
        </>
      )}
    </>
  );
}

export function ServerTopics() {
  const { request } = useBackend();
  const action = useAction();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('SCIENCE');
  const [customCategory, setCustomCategory] = useState('');
  const categories = useServerQuery<Page<TopicCategory>>('topic-categories');
  return (
    <>
      <section className="panel">
        <h1>내가 주제 정하기</h1>
        <p>요즘 궁금했던 것을 이야기 주제로 만들어 보자.</p>
        <Message text={action.message} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(async () => {
              const r = await request<{ topic: { id: string } }>(
                'topics',
                json({
                  title,
                  category,
                  ...(customCategory ? { customCategoryId: customCategory } : {}),
                }),
              );
              navigate(`/talk?topic=${r.topic.id}`);
            });
          }}
        >
          <label>
            이야기 주제
            <input value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            관심 분야
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.data?.items
                .filter((c) => c.source === 'BUILTIN')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            내 분류
            <select value={customCategory} onChange={(e) => setCustomCategory(e.target.value)}>
              <option value="">선택 안 함</option>
              {categories.data?.items
                .filter((c) => c.source === 'USER')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          {!!categories.error && <Wait error={categories.error} retry={categories.refetch} />}
          <button className="btn" disabled={action.busy || !title.trim()}>
            주제 저장하고 이야기하기
          </button>
        </form>
      </section>
      <CategoryManager />
    </>
  );
}

export function ServerShare() {
  const location = useLocation();
  const initialId = new URLSearchParams(location.search).get('story') ?? '';
  const { request, me } = useBackend();
  const action = useAction();
  const [story, setStory] = useState(initialId);
  const [audience, setAudience] = useState('FAMILY');
  const [cursor, setCursor] = useState('');
  const shareKey = `jjcp-share-${me?.user.id}`;
  const [requestId, setRequestId] = useState(() => sessionStorage.getItem(shareKey) ?? '');
  const share = useServerQuery<{
    shareRequest: { status: string; snapshot: { title: string; body: string } };
  }>(requestId ? `share-requests/${requestId}` : null);
  const q = useServerQuery<Page<RecordItem>>(
    `records?kind=STORY&cursor=${encodeURIComponent(cursor)}`,
  );
  return (
    <section className="panel">
      <h1>내 이야기 공유하기</h1>
      <p>보호자가 확인한 이야기만 공개돼요.</p>
      <Message text={action.message} />
      {!q.data ? (
        <Wait error={q.error} retry={q.refetch} />
      ) : (
        <>
          <label>
            공유할 이야기
            <select value={story} onChange={(e) => setStory(e.target.value)}>
              <option value="">이야기를 골라 주세요</option>
              {q.data.items.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>
          <button disabled={!q.data.nextCursor} onClick={() => setCursor(q.data!.nextCursor!)}>
            다음 이야기 찾기
          </button>
          <label>
            누구와 볼까요?
            <select value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option value="FAMILY">우리 가족</option>
              <option value="PEERS">친구들</option>
            </select>
          </label>
          <button
            className="btn"
            disabled={action.busy || !story}
            onClick={() =>
              void action.run(async () => {
                const result = await request<{ shareRequest: { id: string } }>(
                  `stories/${story}/share-requests`,
                  json({ audience, hideProfile: true }),
                );
                setRequestId(result.shareRequest.id);
                sessionStorage.setItem(shareKey, result.shareRequest.id);
                action.setMessage('보호자에게 확인을 요청했어요.');
              })
            }
          >
            공유 확인 요청
          </button>
        </>
      )}
      {share.data && (
        <section className="panel">
          <h2>공유 요청 내용</h2>
          <h3>{share.data.shareRequest.snapshot.title}</h3>
          <p className="server-prose">{share.data.shareRequest.snapshot.body}</p>
          <p>
            {
              (
                {
                  PENDING_GUARDIAN: '보호자 확인을 기다려요.',
                  PENDING_REVIEW: '내용 확인 중이에요.',
                  PUBLISHED: '공유했어요.',
                  REJECTED: '내용 보완이 필요해요.',
                  CANCELLED: '취소했어요.',
                  REVOKED: '공유를 중단했어요.',
                } as Record<string, string>
              )[share.data.shareRequest.status]
            }
          </p>
          <button onClick={() => void share.refetch()}>상태 확인</button>
          {share.data.shareRequest.status === 'PENDING_GUARDIAN' && (
            <button
              disabled={action.busy}
              onClick={() =>
                void action.run(async () => {
                  await request(`share-requests/${requestId}`, { method: 'DELETE' });
                })
              }
            >
              공유 요청 취소
            </button>
          )}
        </section>
      )}
      {!!share.error && <Wait error={share.error} retry={share.refetch} />}
    </section>
  );
}
