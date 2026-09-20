import type { Model } from '../api/schema';
import { useId, useRef, useState } from 'react';
import { errorMessage } from '../api/requestOptions';

type Word = Model<'WordbookEntryOut'>;

export function WordbookCard({
  word,
  busy,
  onSave,
  onDelete,
}: {
  word: Word;
  busy: boolean;
  onSave: (values: { mySentence: string; status: Word['status'] }) => Promise<void>;
  onDelete: () => Promise<boolean>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const locked = useRef(false);
  const titleId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const disabled = busy || pending;
  const sentence = word.mySentence?.trim() || word.example;
  const perform = async (operation: () => Promise<boolean>) => {
    if (locked.current || busy) return;
    locked.current = true;
    setPending(true);
    setError('');
    try {
      if (await operation()) dialog.current?.close();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      locked.current = false;
      setPending(false);
    }
  };
  return (
    <article className="word-card word-pocket-card">
      <header className="word-pocket-heading">
        <h2>{word.word}</h2>
        <span className={`tag ${word.status === 'FAMILIAR' ? 'teal' : 'gold'}`}>
          {word.status === 'FAMILIAR' ? '알아요' : word.status === 'NEW' ? '새 단어' : '연습 중'}
        </span>
      </header>
      {word.reading && word.reading !== word.word && (
        <small className="word-reading">{word.reading}</small>
      )}
      <p className="word-pocket-meaning">{word.meaning}</p>
      {sentence && (
        <blockquote className="word-pocket-sentence">
          <small>{word.mySentence?.trim() ? '내 문장' : '예문'}</small>
          <p>{sentence}</p>
        </blockquote>
      )}
      <button
        type="button"
        className="word-pocket-edit"
        aria-haspopup="dialog"
        aria-label={`${word.word} 내 문장과 학습 상태 수정`}
        disabled={disabled}
        onClick={() => {
          form.current?.reset();
          setError('');
          dialog.current?.showModal();
        }}
      >
        내 문장 · 학습 상태 수정
      </button>
      <dialog
        ref={dialog}
        className="word-pocket-dialog"
        aria-labelledby={titleId}
        onCancel={(event) => {
          if (locked.current) event.preventDefault();
        }}
      >
        <header className="word-dialog-heading">
          <h2 id={titleId}>{word.word}</h2>
          <button
            type="button"
            className="btn light"
            aria-label="닫기"
            disabled={pending}
            onClick={() => dialog.current?.close()}
          >
            닫기
          </button>
        </header>
        <p className="word-dialog-meaning">{word.meaning}</p>
        <form
          ref={form}
          key={word.updatedAt}
          onSubmit={(event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            void perform(async () => {
              await onSave({
                mySentence: String(values.get('sentence') ?? '').trim(),
                status: values.get('status') as Word['status'],
              });
              return true;
            });
          }}
        >
          <label>
            내 문장
            <textarea
              name="sentence"
              rows={3}
              defaultValue={word.mySentence?.trim() || ''}
              maxLength={200}
              placeholder={word.example || '이 단어로 문장을 만들어 봐요.'}
              disabled={disabled}
            />
          </label>
          <label>
            학습 상태
            <select name="status" defaultValue={word.status} disabled={disabled}>
              <option value="NEW">새 단어</option>
              <option value="PRACTICING">연습 중</option>
              <option value="FAMILIAR">익숙한 단어</option>
            </select>
          </label>
          {error && (
            <p role="alert" className="word-dialog-error">
              {error}
            </p>
          )}
          <div className="word-pocket-actions">
            <button type="submit" className="btn light" disabled={disabled}>
              {pending ? '처리 중…' : '저장'}
            </button>
            <button
              type="button"
              className="btn light"
              disabled={disabled}
              onClick={() => void perform(onDelete)}
            >
              단어 삭제
            </button>
          </div>
        </form>
      </dialog>
    </article>
  );
}
