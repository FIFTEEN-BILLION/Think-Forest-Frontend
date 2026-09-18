// 이야기 공유 요청(명세 15절, 아이 쪽). 보호자 승인 화면은 F3 이 맡는다.

import { useEffect, useState } from 'react';
import {
  cancelShareRequest,
  existingShareRequestId,
  getShareRequest,
  requestShare,
  SHARE_AUDIENCE,
  shareStatusText,
} from '../../../api/v1/endpoints';
import type { ShareAudience, ShareRequest } from '../../../api/v1/types';
import { useAuth } from '../../../providers/AuthProvider';
import { Icon } from './Icon';
import { libraryErrorText, LibraryErrorNotice } from './LibraryParts';
import { Button, Notice } from './ui';
import { useVillage } from '../state/VillageProvider';

// 새로고침해도 “보호자가 보는 중”을 이어 보여 주려고 요청 id 만 기기에 남긴다.
const STORE_KEY = 'jjcp.f2.shareRequests';

function readStore(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function rememberShareRequest(storyId: string, requestId: string | null) {
  try {
    const store = readStore();
    if (requestId) store[storyId] = requestId;
    else delete store[storyId];
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // 저장소가 막혀도 이번 화면에서는 상태를 계속 보여 준다.
  }
}

export function savedShareRequestId(storyId: string): string | null {
  return readStore()[storyId] ?? null;
}

/** 이야기 한 편의 공유 요청 상태와 조작. compact 는 책장 상세 안에 끼워 넣을 때 쓴다. */
export function ShareRequestPanel({
  storyId,
  storyTitle,
  compact = false,
  onChange,
}: {
  storyId: string;
  storyTitle?: string;
  compact?: boolean;
  onChange?: (request: ShareRequest | null) => void;
}) {
  const { client, status } = useAuth();
  const { toast } = useVillage();
  const [state, setState] = useState<{ key: string; request: ShareRequest | null } | null>(null);
  const [audience, setAudience] = useState<ShareAudience>('PEERS');
  const [hideProfile, setHideProfile] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const key = `${storyId}|${status}`;
  const request = state?.key === key ? state.request : null;

  const apply = (next: ShareRequest | null) => {
    setState({ key, request: next });
    rememberShareRequest(storyId, next && next.status !== 'CANCELLED' ? next.id : null);
    onChange?.(next);
  };

  useEffect(() => {
    const saved = savedShareRequestId(storyId);
    if (!saved || status !== 'signedIn') return;
    const abort = new AbortController();
    getShareRequest(client, saved, abort.signal)
      .then((body) => {
        if (!abort.signal.aborted) setState({ key, request: body.shareRequest });
      })
      .catch(() => {
        if (!abort.signal.aborted) {
          rememberShareRequest(storyId, null);
          setState({ key, request: null });
        }
      });
    return () => abort.abort();
  }, [client, storyId, status, key]);

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      const body = await requestShare(client, storyId, { audience, hideProfile });
      apply(body.shareRequest);
      toast('보호자에게 공유 확인을 요청했어요.');
    } catch (reason) {
      // 다른 기기에서 이미 보냈으면 서버가 그 요청 id 를 알려 준다. 오류 대신 그 상태를 보여 준다.
      const existing = existingShareRequestId(reason);
      if (existing) {
        try {
          apply((await getShareRequest(client, existing)).shareRequest);
          toast('이미 보호자에게 보낸 이야기예요.');
          return;
        } catch {
          // 상태를 못 읽으면 아래 오류 안내로 넘어간다.
        }
      }
      setError(libraryErrorText(reason, '공유 요청을 보내지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!request) return;
    setBusy(true);
    setError('');
    try {
      const body = await cancelShareRequest(client, request.id);
      apply(body.shareRequest);
      toast('공유 요청을 취소했어요.');
    } catch (reason) {
      setError(libraryErrorText(reason, '요청을 취소하지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };

  if (status !== 'signedIn')
    return <Notice>로그인하면 내 이야기를 보호자에게 보여 주고 친구들과 나눌 수 있어요.</Notice>;

  const statusText = request ? shareStatusText(request.status) : null;
  const done = request !== null && request.status !== 'CANCELLED';

  return (
    <section className="panel share-form">
      {!compact && <span className="eyebrow">SHARE WITH CARE</span>}
      <h2>{storyTitle ? `“${storyTitle}” 나누기` : '이 이야기 나누기'}</h2>
      <LibraryErrorNotice error={error} />
      {done && statusText ? (
        <>
          <div className="row between wrap">
            <span className="tag gold">{statusText.label}</span>
            <small className="muted">
              {new Date(request.requestedAt).toLocaleDateString('ko-KR')}에 보냈어요
            </small>
          </div>
          <p>{statusText.help}</p>
          <dl className="definition">
            <dt>보여 줄 사람</dt>
            <dd>{SHARE_AUDIENCE.find((a) => a.key === request.audience)?.label ?? '또래 친구'}</dd>
            <dt>내 정보</dt>
            <dd>{request.hideProfile ? '이름과 학교는 숨겨요' : '프로필을 함께 보여요'}</dd>
          </dl>
          {request.rejectReason && <Notice>보호자 메모 · {request.rejectReason}</Notice>}
          {statusText.cancellable && (
            <Button className="light" disabled={busy} onClick={() => void cancel()}>
              아직 안 보낼래요 (취소)
            </Button>
          )}
        </>
      ) : (
        <>
          <fieldset className="share-audience">
            <legend>보여 줄 사람</legend>
            {SHARE_AUDIENCE.map((item) => (
              <button
                type="button"
                key={item.key}
                className={audience === item.key ? 'selected' : ''}
                aria-pressed={audience === item.key}
                onClick={() => setAudience(item.key)}
              >
                <Icon name={item.icon} />
                <strong>{item.label}</strong>
                <small>{item.help}</small>
              </button>
            ))}
          </fieldset>
          <label className="setting-row">
            <span>
              <strong>내가 누구인지 숨기기</strong>
              <p>이름과 학교처럼 나를 알아볼 수 있는 것은 친구에게 보이지 않아요.</p>
            </span>
            <input
              type="checkbox"
              checked={hideProfile}
              onChange={(e) => setHideProfile(e.target.checked)}
            />
          </label>
          <Notice>
            보내기를 눌러도 바로 공개되지 않아요. 먼저 보호자 휴대폰으로 가고, 보호자가 읽어 본 뒤
            “좋아” 하면 그때 친구들이 볼 수 있어요.
          </Notice>
          <Button disabled={busy} onClick={() => void send()}>
            <Icon name="share" /> 보호자에게 확인 요청
          </Button>
        </>
      )}
    </section>
  );
}
