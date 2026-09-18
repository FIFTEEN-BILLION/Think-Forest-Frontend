// F2 책장·단어·공유 공용 조각. 서버 기록과 기기 기록을 구분해 보여 주는 표시가 여기 모여 있다.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SHELF_ORIGIN_LABEL } from '../api/v1/endpoints';
import type { ShelfItem } from '../api/v1/endpoints';
import { V1Error } from '../api/v1/client';
import { Icon } from './Icon';
import { Notice } from './ui';

const ORIGIN_TONE: Record<ShelfItem['origin'], string> = {
  server: 'teal',
  local: 'sky',
  sample: 'gold',
};

/** 이 기록이 어디에 저장돼 있는지. 책장에서 두 목록을 섞어 보여 주므로 카드마다 붙인다. */
export function LibraryOriginTag({ origin }: { origin: ShelfItem['origin'] }) {
  return <span className={`tag ${ORIGIN_TONE[origin]}`}>{SHELF_ORIGIN_LABEL[origin]}</span>;
}

/** 로그인해야 서버 기록을 볼 수 있다는 안내. 기기 기록은 로그인 없이도 그대로 보인다. */
export function LibrarySignedOutNotice({ what, returnTo }: { what: string; returnTo: string }) {
  return (
    <Notice>
      로그인하면 {what} 볼 수 있어요.{' '}
      <Link to={`/login?returnTo=${encodeURIComponent(returnTo)}`}>로그인하러 가기</Link>
    </Notice>
  );
}

export function libraryErrorText(error: unknown, fallback: string): string {
  if (error instanceof V1Error && error.message) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function LibraryErrorNotice({ error, onRetry }: { error: string; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <div className="notice error">
      <Icon name="info" />
      <div>
        {error}
        {onRetry && (
          <div className="actions">
            <button type="button" className="btn light small" onClick={onRetry}>
              다시 불러오기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function LibraryLoading({ label }: { label: string }) {
  return (
    <div className="panel loading-page" role="status">
      <Icon name="sprout" />
      {label}
    </div>
  );
}

/** 되돌릴 수 없는 일(삭제) 앞에서 한 번 더 묻는 버튼. */
export function LibraryConfirmButton({
  label,
  question,
  confirmLabel,
  onConfirm,
  className = 'ghost small',
}: {
  label: string;
  question: string;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 8000);
    return () => clearTimeout(id);
  }, [armed]);
  if (!armed)
    return (
      <button type="button" className={`btn ${className}`} onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  return (
    <div className="notice error">
      <Icon name="info" />
      <div>
        {question}
        <div className="actions">
          <button type="button" className="btn light small" onClick={() => setArmed(false)}>
            그대로 둘래요
          </button>
          <button
            type="button"
            className="btn danger small"
            onClick={() => {
              setArmed(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
