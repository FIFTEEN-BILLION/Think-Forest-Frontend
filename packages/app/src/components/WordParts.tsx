// 단어 보관함 조각(명세 13절). 점수나 등수는 어디에도 두지 않는다.
// 퀴즈 결과는 낱말의 상태(NEW·PRACTICING·FAMILIAR)와 다음에 다시 만날 날만 바꾼다.

import { useState } from 'react';
import {
  answerWordQuiz,
  createWordQuiz,
  deleteWordbookEntry,
  editWordbookEntry,
  nextReviewLabel,
  WORD_STATUS,
  wordStatusLabel,
  wordStatusTone,
} from '../api/v1/endpoints';
import type { WordbookEntry, WordQuiz, WordStatus } from '../api/v1/types';
import { useAuth } from '../providers/AuthProvider';
import { Icon } from './Icon';
import { libraryErrorText, LibraryConfirmButton, LibraryErrorNotice } from './LibraryParts';
import { Button, Notice } from './ui';
import { useVillage } from '../providers/VillageProvider';

export function WordEntryCard({
  entry,
  onChanged,
  onRemoved,
}: {
  entry: WordbookEntry;
  onChanged: (entry: WordbookEntry) => void;
  onRemoved: (entryId: string) => void;
}) {
  const { client } = useAuth();
  const { toast } = useVillage();
  const [writing, setWriting] = useState(false);
  const [sentence, setSentence] = useState(entry.mySentence ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const patch = async (
    body: { status?: WordStatus; mySentence?: string | null },
    message: string,
  ) => {
    setBusy(true);
    setError('');
    try {
      const next = await editWordbookEntry(client, entry.id, body);
      onChanged(next.entry);
      toast(message);
      return true;
    } catch (reason) {
      setError(libraryErrorText(reason, '바꾸지 못했어요.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="word-card">
      <span className="word-emoji" aria-hidden="true">
        📘
      </span>
      <div className="row between">
        <span className={`tag ${wordStatusTone(entry.status)}`}>
          {wordStatusLabel(entry.status)}
        </span>
        <small className="muted">{nextReviewLabel(entry.nextReviewAt)}</small>
      </div>
      <h2>
        {entry.word} <small>{entry.reading}</small>
      </h2>
      <p>{entry.meaning}</p>
      <blockquote>“{entry.sourceSentence || entry.example}”</blockquote>
      <LibraryErrorNotice error={error} />
      {entry.mySentence && !writing && <div className="quote">내 문장 · {entry.mySentence}</div>}
      {writing ? (
        <div className="field">
          <label htmlFor={`sentence-${entry.id}`}>{entry.word} 을(를) 넣은 내 문장</label>
          <textarea
            id={`sentence-${entry.id}`}
            value={sentence}
            maxLength={200}
            rows={3}
            onChange={(e) => setSentence(e.target.value)}
          />
          <div className="actions split">
            <Button
              className="light small"
              onClick={() => {
                setWriting(false);
                setSentence(entry.mySentence ?? '');
              }}
            >
              그만두기
            </Button>
            <Button
              className="small"
              disabled={busy || !sentence.trim()}
              onClick={() => {
                void patch({ mySentence: sentence.trim() }, '내 문장을 담았어요.').then((ok) => {
                  if (ok) setWriting(false);
                });
              }}
            >
              내 문장 담기
            </Button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn light" onClick={() => setWriting(true)}>
          {entry.mySentence ? '내 문장 고치기' : '내 문장 만들기'} <Icon name="arrow" />
        </button>
      )}
      <div className="filters" role="group" aria-label={`${entry.word} 지금 상태`}>
        {WORD_STATUS.map((item) => (
          <button
            type="button"
            key={item.key}
            className={`chip ${entry.status === item.key ? 'active' : ''}`}
            aria-pressed={entry.status === item.key}
            disabled={busy}
            onClick={() => void patch({ status: item.key }, `‘${entry.word}’ · ${item.label}`)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <LibraryConfirmButton
        label="보관함에서 빼기"
        question={`‘${entry.word}’ 를 보관함에서 뺄까요?`}
        confirmLabel="네, 뺄래요"
        onConfirm={() => {
          void deleteWordbookEntry(client, entry.id)
            .then(() => {
              onRemoved(entry.id);
              toast(`‘${entry.word}’ 를 보관함에서 뺐어요.`);
            })
            .catch((reason: unknown) => setError(libraryErrorText(reason, '빼지 못했어요.')));
        }}
      />
    </article>
  );
}

/** 지금 학습 상태에 맞춰 퀴즈를 만들고 답을 낸다. 맞은 개수를 세지 않고 낱말 상태 변화만 알려 준다. */
export function WordQuizPanel({
  onEntryChanged,
}: {
  onEntryChanged: (entry: WordbookEntry) => void;
}) {
  const { client } = useAuth();
  const [quiz, setQuiz] = useState<WordQuiz | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    word: string;
    status: WordStatus;
    nextReviewAt: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    setBusy(true);
    setError('');
    setFeedback(null);
    setPicked(null);
    setIndex(0);
    try {
      setQuiz(await createWordQuiz(client, { count: 5, mode: 'MEANING_TO_WORD' }));
    } catch (reason) {
      setError(libraryErrorText(reason, '퀴즈를 만들지 못했어요.'));
      setQuiz(null);
    } finally {
      setBusy(false);
    }
  };

  const answer = async (optionId: string) => {
    if (!quiz || picked) return;
    const question = quiz.questions[index];
    if (!question) return;
    setPicked(optionId);
    setBusy(true);
    try {
      const body = await answerWordQuiz(client, quiz.id, {
        questionId: question.id,
        optionId,
        clientAnsweredAt: new Date().toISOString(),
      });
      onEntryChanged(body.entry);
      setFeedback({
        correct: body.result.correct,
        word: body.entry.word,
        status: body.entry.status,
        nextReviewAt: body.entry.nextReviewAt,
      });
    } catch (reason) {
      setError(libraryErrorText(reason, '답을 보내지 못했어요.'));
      setPicked(null);
    } finally {
      setBusy(false);
    }
  };

  if (!quiz)
    return (
      <section className="quiz-panel">
        <span className="tag gold">보호자와 함께해도 좋아요</span>
        <h2>보관한 낱말로 퀴즈를 만들어 볼까?</h2>
        <p className="muted">맞고 틀리고는 세지 않아요. 낱말이 얼마나 친해졌는지만 바뀌어요.</p>
        <LibraryErrorNotice error={error} />
        <Button disabled={busy} onClick={() => void start()}>
          <Icon name="spark" /> {busy ? '만드는 중…' : '퀴즈 시작'}
        </Button>
      </section>
    );

  const question = quiz.questions[index];
  const last = index >= quiz.questions.length - 1;

  return (
    <section className="quiz-panel">
      <div className="row between wrap">
        <span className="tag gold">
          {index + 1} / {quiz.questions.length}번째 낱말
        </span>
        <Button className="ghost small" onClick={() => setQuiz(null)}>
          그만하기
        </Button>
      </div>
      <LibraryErrorNotice error={error} />
      {question ? (
        <>
          <h2>{question.prompt}</h2>
          <div className="choice-row">
            {question.options.map((option) => (
              <button
                type="button"
                key={option.id}
                className={`chip ${picked === option.id ? 'active' : ''}`}
                disabled={busy || picked !== null}
                onClick={() => void answer(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {feedback && (
            <>
              <p className={feedback.correct ? 'correct' : 'try-again'}>
                {feedback.correct
                  ? `맞았어! ‘${feedback.word}’ 랑 많이 친해졌구나.`
                  : `괜찮아. ‘${feedback.word}’ 는 조금 더 같이 연습해 보자.`}
              </p>
              <p className="muted">
                지금 ‘{feedback.word}’ 는 <strong>{wordStatusLabel(feedback.status)}</strong> ·{' '}
                {nextReviewLabel(feedback.nextReviewAt)}
              </p>
              <Button
                onClick={() => {
                  setFeedback(null);
                  setPicked(null);
                  if (last) setQuiz(null);
                  else setIndex((n) => n + 1);
                }}
              >
                {last ? '퀴즈 끝내기' : '다음 낱말'} <Icon name="arrow" />
              </Button>
            </>
          )}
        </>
      ) : (
        <Notice>퀴즈에 넣을 낱말이 없어요.</Notice>
      )}
    </section>
  );
}
