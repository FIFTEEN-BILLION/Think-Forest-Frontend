import { useEffect, useState } from 'react';
import { getWordbook, WORD_STATUS } from '../api/v1/endpoints';
import type { WordbookEntry, WordbookSummary, WordStatus } from '../api/v1/types';
import { useAuth } from '../providers/AuthProvider';
import { Icon } from '../components/Icon';
import {
  libraryErrorText,
  LibraryErrorNotice,
  LibraryLoading,
  LibrarySignedOutNotice,
} from '../components/LibraryParts';
import { WordEntryCard, WordQuizPanel } from '../components/WordParts';
import { Button, Notice, PageHeading } from '../components/ui';

interface WordbookResult {
  key: string;
  summary: WordbookSummary;
  items: WordbookEntry[];
  nextCursor: string | null;
  error: string;
}

const EMPTY: WordbookSummary = {
  total: 0,
  familiar: 0,
  practicing: 0,
  new: 0,
  newThisWeek: 0,
  dueForReview: 0,
};

/** 단어 보관함(명세 13절). 요약·목록·상태 필터·퀴즈 모두 서버 값으로만 채운다. */
export function WordsScreen() {
  const { client, status } = useAuth();
  const [filter, setFilter] = useState<WordStatus | ''>('');
  const [result, setResult] = useState<WordbookResult | null>(null);
  const [reloads, setReloads] = useState(0);
  const [quiz, setQuiz] = useState(false);
  const key = `${reloads}|${filter}`;
  const loading = status === 'signedIn' && result?.key !== key;
  const summary = result?.key === key ? result.summary : EMPTY;
  const items = result?.key === key ? result.items : [];
  const nextCursor = result?.key === key ? result.nextCursor : null;
  const error = result?.key === key ? result.error : '';

  useEffect(() => {
    if (status !== 'signedIn') return;
    const abort = new AbortController();
    getWordbook(client, { status: filter || undefined, limit: 30 }, abort.signal)
      .then((body) => {
        if (!abort.signal.aborted)
          setResult({
            key,
            summary: body.summary,
            items: body.items,
            nextCursor: body.nextCursor,
            error: '',
          });
      })
      .catch((reason: unknown) => {
        if (!abort.signal.aborted)
          setResult({
            key,
            summary: EMPTY,
            items: [],
            nextCursor: null,
            error: libraryErrorText(reason, '단어 보관함을 불러오지 못했어요.'),
          });
      });
    return () => abort.abort();
  }, [client, status, key, filter]);

  const more = async () => {
    if (!nextCursor) return;
    try {
      const body = await getWordbook(client, {
        status: filter || undefined,
        cursor: nextCursor,
        limit: 30,
      });
      setResult((prev) =>
        prev?.key === key
          ? { ...prev, items: [...prev.items, ...body.items], nextCursor: body.nextCursor }
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

  const update = (change: (items: WordbookEntry[]) => WordbookEntry[]) =>
    setResult((prev) => (prev ? { ...prev, items: change(prev.items) } : prev));

  const replace = (entry: WordbookEntry) =>
    update((prev) => prev.map((item) => (item.id === entry.id ? entry : item)));

  return (
    <>
      <PageHeading
        eyebrow="MY WORD POCKET"
        title="새로 알게 된 말을 모아요"
        description="티키와 이야기하다 만난 낱말을 담고, 내 문장으로 만들어 보자!"
      >
        <Button disabled={status !== 'signedIn'} onClick={() => setQuiz((value) => !value)}>
          <Icon name="spark" /> {quiz ? '퀴즈 닫기' : '단어 퀴즈'}
        </Button>
      </PageHeading>
      {status === 'signedOut' && (
        <LibrarySignedOutNotice what="내가 담은 낱말을" returnTo="/words" />
      )}
      {status === 'signedIn' && (
        <>
          <section className="word-summary">
            <div>
              <span>🌱</span>
              <strong>{summary.total}</strong>
              <small>담은 낱말</small>
            </div>
            <div>
              <span>⭐</span>
              <strong>{summary.familiar}</strong>
              <small>이제 알아요</small>
            </div>
            <div>
              <span>🎯</span>
              <strong>{summary.practicing}</strong>
              <small>연습 중이에요</small>
            </div>
            <p>
              {summary.newThisWeek > 0
                ? `이번 주에 새 낱말 ${summary.newThisWeek}개를 만났어요!`
                : '이번 주에 만난 새 낱말은 아직 없어요.'}
              {summary.dueForReview > 0 &&
                ` 오늘 다시 만날 낱말이 ${summary.dueForReview}개 있어요.`}
            </p>
          </section>
          {quiz && <WordQuizPanel onEntryChanged={replace} />}
          <div className="filters" role="group" aria-label="낱말 상태 고르기">
            <button
              className={`chip ${filter === '' ? 'active' : ''}`}
              aria-pressed={filter === ''}
              onClick={() => setFilter('')}
            >
              전체 <small>{summary.total}</small>
            </button>
            {WORD_STATUS.map((item) => (
              <button
                key={item.key}
                className={`chip ${filter === item.key ? 'active' : ''}`}
                aria-pressed={filter === item.key}
                onClick={() => setFilter(item.key)}
              >
                {item.label}{' '}
                <small>
                  {item.key === 'NEW'
                    ? summary.new
                    : item.key === 'PRACTICING'
                      ? summary.practicing
                      : summary.familiar}
                </small>
              </button>
            ))}
          </div>
          <LibraryErrorNotice error={error} onRetry={() => setReloads((n) => n + 1)} />
          {loading && items.length === 0 ? (
            <LibraryLoading label="담아 둔 낱말을 꺼내는 중이에요…" />
          ) : items.length === 0 ? (
            <div className="panel empty">
              <Icon name="book" />
              <h2>아직 담은 낱말이 없어요.</h2>
              <p>티키와 이야기하다 처음 보는 말이 나오면 그 자리에서 담을 수 있어요.</p>
            </div>
          ) : (
            <div className="word-grid">
              {items.map((entry) => (
                <WordEntryCard
                  key={entry.id}
                  entry={entry}
                  onChanged={replace}
                  onRemoved={(id) => {
                    update((prev) => prev.filter((item) => item.id !== id));
                    setReloads((n) => n + 1);
                  }}
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
          <Notice>
            퀴즈 결과는 점수나 등수로 쓰지 않아요. 낱말이 얼마나 친해졌는지와 다시 만날 날만
            바뀌어요.
          </Notice>
        </>
      )}
    </>
  );
}
