// 이야기책 묶기(명세 28절). 이야기 고르기 → 책 만들기 → 차례 바꾸기 → 완성.

import { useEffect, useState } from 'react';
import {
  addBookStory,
  bookStoryIds,
  categoryEmoji,
  completeBook,
  createBook,
  deleteBook,
  editBook,
  getBook,
  listBooks,
  removeBookStory,
  reorderStories,
} from '../../../api/v1/endpoints';
import type { BookDetail, BookSummary, StorySummary } from '../../../api/v1/types';
import { useAuth } from '../../../providers/AuthProvider';
import { Icon } from './Icon';
import {
  libraryErrorText,
  LibraryConfirmButton,
  LibraryErrorNotice,
  LibraryLoading,
} from './LibraryParts';
import { Button, Notice } from './ui';
import { useVillage } from '../state/VillageProvider';

interface BookListResult {
  key: string;
  books: BookSummary[];
  error: string;
}

/** 서버에 저장된 이야기만 책에 담을 수 있다. 목록은 책장 화면이 이미 불러온 것을 받는다. */
export function LibraryBookshelf({ stories }: { stories: StorySummary[] }) {
  const { client, status } = useAuth();
  const { toast } = useVillage();
  const [result, setResult] = useState<BookListResult | null>(null);
  const [reloads, setReloads] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [making, setMaking] = useState(false);
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const key = String(reloads);
  const loading = status === 'signedIn' && result?.key !== key;
  const books = result?.key === key ? result.books : [];
  const error = result?.key === key ? result.error : '';
  const reload = () => setReloads((n) => n + 1);

  useEffect(() => {
    if (status !== 'signedIn') return;
    const abort = new AbortController();
    listBooks(client, { limit: 20 }, abort.signal)
      .then((page) => {
        if (!abort.signal.aborted) setResult({ key, books: page.items, error: '' });
      })
      .catch((reason: unknown) => {
        if (!abort.signal.aborted)
          setResult({
            key,
            books: [],
            error: libraryErrorText(reason, '이야기책을 불러오지 못했어요.'),
          });
      });
    return () => abort.abort();
  }, [client, status, key]);

  if (status !== 'signedIn')
    return <Notice>로그인하면 내 이야기를 모아 한 권으로 묶을 수 있어요.</Notice>;
  if (loading) return <LibraryLoading label="이야기책을 펼치고 있어요…" />;

  const make = async () => {
    setBusy(true);
    try {
      const body = await createBook(client, {
        title: title.trim(),
        storyIds: picked,
        generateIntroduction: true,
      });
      setMaking(false);
      setTitle('');
      setPicked([]);
      setOpenId(body.book.id);
      toast('새 이야기책을 만들었어요!');
      reload();
    } catch (reason) {
      setResult((prev) =>
        prev ? { ...prev, error: libraryErrorText(reason, '이야기책을 만들지 못했어요.') } : prev,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="section-title">
        <small>{books.length}권의 이야기책</small>
        <Button
          className="light small"
          onClick={() => {
            setMaking((value) => !value);
            setOpenId(null);
          }}
        >
          <Icon name="plus" /> 새 이야기책 만들기
        </Button>
      </div>
      <LibraryErrorNotice error={error} onRetry={reload} />
      {making && (
        <section className="panel">
          <h2>어떤 책을 만들까요?</h2>
          <div className="field">
            <label htmlFor="book-title">책 이름</label>
            <input
              id="book-title"
              value={title}
              maxLength={40}
              placeholder="예: 별이의 과학 이야기"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <p className="muted">담고 싶은 이야기를 눌러 골라요. 나중에 더 넣어도 돼요.</p>
          {stories.length ? (
            <div className="filters">
              {stories.map((story) => (
                <button
                  type="button"
                  key={story.id}
                  className={`chip ${picked.includes(story.id) ? 'active' : ''}`}
                  aria-pressed={picked.includes(story.id)}
                  onClick={() =>
                    setPicked((prev) =>
                      prev.includes(story.id)
                        ? prev.filter((value) => value !== story.id)
                        : [...prev, story.id],
                    )
                  }
                >
                  {categoryEmoji(story.category)} {story.title}
                </button>
              ))}
            </div>
          ) : (
            <Notice>아직 서버에 저장된 이야기가 없어요. 티키와 이야기를 하나 마쳐 볼까요?</Notice>
          )}
          <div className="actions split">
            <Button className="light" onClick={() => setMaking(false)}>
              그만두기
            </Button>
            <Button disabled={busy || !title.trim()} onClick={() => void make()}>
              {busy ? '만드는 중…' : `이야기 ${picked.length}편으로 책 만들기`}
            </Button>
          </div>
        </section>
      )}
      {books.length === 0 && !making && (
        <div className="panel empty">
          <Icon name="book" />
          <h2>아직 만든 이야기책이 없어요.</h2>
          <p>마음에 드는 이야기를 골라 한 권으로 묶어 보세요.</p>
        </div>
      )}
      <div className="cards books">
        {books.map((book) => (
          <article className="book" key={book.id}>
            <div className="book-cover mint">
              <span className="eyebrow">MY STORYBOOK</span>
              <h3>{book.title}</h3>
              <span aria-hidden="true">{book.cover?.emoji ?? '📚'}</span>
            </div>
            <div className="book-body">
              <div className="row between">
                <span className={`tag ${book.status === 'COMPLETED' ? 'teal' : 'gold'}`}>
                  {book.status === 'COMPLETED' ? '완성한 책' : '만드는 중'}
                </span>
                <span className="tag sky">{book.storyCount}편</span>
              </div>
              <p className="line-clamp">{book.introduction}</p>
              <Button
                className="light"
                onClick={() => setOpenId(openId === book.id ? null : book.id)}
              >
                {openId === book.id ? '접기' : '펼쳐 보기'}
                <Icon name="arrow" />
              </Button>
            </div>
          </article>
        ))}
      </div>
      {openId && (
        <LibraryBookDetail
          bookId={openId}
          stories={stories}
          onClose={() => setOpenId(null)}
          onChanged={reload}
        />
      )}
    </>
  );
}

function LibraryBookDetail({
  bookId,
  stories,
  onClose,
  onChanged,
}: {
  bookId: string;
  stories: StorySummary[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { client } = useAuth();
  const { toast } = useVillage();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    getBook(client, bookId, abort.signal)
      .then((body) => {
        if (!abort.signal.aborted) setBook(body.book);
      })
      .catch((reason: unknown) => {
        if (!abort.signal.aborted) setError(libraryErrorText(reason, '이야기책을 열지 못했어요.'));
      });
    return () => abort.abort();
  }, [client, bookId]);

  if (!book) return <LibraryLoading label="이야기책을 여는 중이에요…" />;

  const run = async (task: () => Promise<{ book: BookDetail }>, message: string) => {
    setBusy(true);
    setError('');
    try {
      const body = await task();
      setBook(body.book);
      toast(message);
      onChanged();
    } catch (reason) {
      setError(libraryErrorText(reason, '바꾸지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };

  const move = (from: number, to: number) =>
    run(
      () =>
        editBook(
          client,
          book.id,
          { storyIds: reorderStories(bookStoryIds(book), from, to) },
          book.version,
        ),
      '차례를 바꿨어요.',
    );

  const notInBook = stories.filter((story) => !bookStoryIds(book).includes(story.id));
  const done = book.status === 'COMPLETED';

  return (
    <section className="panel">
      <div className="row between wrap">
        <h2>{book.title}</h2>
        <Button className="ghost small" onClick={onClose}>
          닫기
        </Button>
      </div>
      <p className="muted">{book.introduction}</p>
      <LibraryErrorNotice error={error} />
      {done && <Notice>완성한 책이에요. 이제 이야기를 더하거나 뺄 수 없어요.</Notice>}
      <ol className="journey-list">
        {book.stories.map((story, index) => (
          <li key={story.id}>
            <div className="row between wrap">
              <span>
                {index + 1}. {categoryEmoji(story.category)} {story.title}
              </span>
              {!done && (
                <span className="row">
                  <Button
                    className="ghost small"
                    aria-label={`${story.title} 앞으로 옮기기`}
                    disabled={busy || index === 0}
                    onClick={() => void move(index, index - 1)}
                  >
                    ↑
                  </Button>
                  <Button
                    className="ghost small"
                    aria-label={`${story.title} 뒤로 옮기기`}
                    disabled={busy || index === book.stories.length - 1}
                    onClick={() => void move(index, index + 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    className="ghost small"
                    disabled={busy}
                    onClick={() =>
                      void run(() => removeBookStory(client, book.id, story.id), '이야기를 뺐어요.')
                    }
                  >
                    빼기
                  </Button>
                </span>
              )}
            </div>
          </li>
        ))}
        {book.stories.length === 0 && <li className="muted">아직 담긴 이야기가 없어요.</li>}
      </ol>
      {!done && notInBook.length > 0 && (
        <>
          <p className="muted">더 담을 이야기</p>
          <div className="filters">
            {notInBook.map((story) => (
              <button
                type="button"
                key={story.id}
                className="chip"
                disabled={busy}
                onClick={() =>
                  void run(() => addBookStory(client, book.id, story.id), '이야기를 담았어요.')
                }
              >
                <Icon name="plus" /> {story.title}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="actions split">
        {!done && (
          <Button
            disabled={busy || book.stories.length === 0}
            onClick={() => void run(() => completeBook(client, book.id), '이야기책을 완성했어요!')}
          >
            <Icon name="check" /> 이 책 완성하기
          </Button>
        )}
        <LibraryConfirmButton
          label="이 책 지우기"
          question={`“${book.title}” 을 지울까요? 안에 담긴 이야기는 책장에 그대로 남아요.`}
          confirmLabel="네, 지울래요"
          onConfirm={() => {
            void deleteBook(client, book.id)
              .then(() => {
                toast('이야기책을 지웠어요.');
                onClose();
                onChanged();
              })
              .catch((reason: unknown) =>
                setError(libraryErrorText(reason, '이야기책을 지우지 못했어요.')),
              );
          }}
        />
      </div>
    </section>
  );
}
