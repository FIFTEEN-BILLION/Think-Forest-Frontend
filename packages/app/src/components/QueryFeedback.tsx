import { errorMessage } from '../api/requestOptions';

export function Wait({ error, retry }: { error?: unknown; retry?: () => unknown }) {
  return (
    <section className="panel" role={error ? 'alert' : 'status'}>
      <p>{error ? errorMessage(error) : '기록을 불러오고 있어요…'}</p>
      {!!error && (
        <button className="btn light" onClick={() => retry?.()}>
          다시 불러오기
        </button>
      )}
    </section>
  );
}
export function Message({ text }: { text: string }) {
  return text ? (
    <p role="status" className="notice">
      {text}
    </p>
  ) : null;
}
