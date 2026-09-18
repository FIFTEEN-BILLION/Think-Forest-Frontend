// 명세 15절 보호자 쪽. 공유 승인·반려·철회.
// 승인할 때는 보호자가 읽은 본문 판(confirmedBodyVersion)을 반드시 같이 보낸다.
// 그 사이 아이가 이야기를 고쳤으면 서버가 409 로 막고, 화면은 새로 읽어 오라고 말한다.

import { useCallback, useEffect, useState } from 'react';
import {
  approveShareRequest,
  getStoryPreview,
  listGuardianShareRequests,
  rejectShareRequest,
  revokeShareRequest,
  shareConflictMessage,
  sharePublicScope,
  shareStatusLabel,
} from '../../api/v1/endpoints';
import type { ShareRequest, StoryPreview } from '../../api/v1/types';
import { useAuth } from '../../providers/AuthProvider';
import { Icon } from '../../components/Icon';
import {
  ActionResult,
  errorCode,
  errorDetails,
  errorText,
  GuardianGate,
  GuardianSection,
  useAction,
  useGuardian,
} from '../../components/GuardianParts';
import { Button, Notice } from '../../components/ui';

const PENDING: ShareRequest['status'][] = ['PENDING_GUARDIAN'];
const PENDING_COUNT = (items: ShareRequest[]) =>
  items.filter((item) => PENDING.includes(item.status)).length;

function RequestCard({
  request,
  profileId,
  onDone,
}: {
  request: ShareRequest;
  profileId: string | null;
  onDone: () => void;
}) {
  const { client } = useAuth();
  const { busy, message, failed, runQuiet } = useAction();
  const [story, setStory] = useState<StoryPreview | null>(null);
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [read, setRead] = useState(false);
  const [conflict, setConflict] = useState('');

  const loadStory = useCallback(
    (signal?: AbortSignal) => {
      getStoryPreview(client, request.storyId, signal).then((found) => {
        if (!signal?.aborted) setStory(found);
      });
    },
    [client, request.storyId],
  );

  useEffect(() => {
    const abort = new AbortController();
    loadStory(abort.signal);
    return () => abort.abort();
  }, [loadStory]);

  // 승인에 쓸 판 번호. 본문을 읽을 수 있으면 그 버전을, 아니면 요청에 담긴 판을 쓴다.
  const version = story?.version ?? request.requestedBodyVersion;
  const pending = request.status === 'PENDING_GUARDIAN';
  const published = request.status === 'PUBLISHED' || request.status === 'APPROVED';

  const approve = () =>
    runQuiet(async () => {
      setConflict('');
      try {
        await approveShareRequest(client, request.id, version, profileId ?? undefined);
        onDone();
        return '공개를 승인했어요. 친구들 화면에 올라가요.';
      } catch (reason_) {
        if (errorCode(reason_) === 'SHARE_VERSION_MISMATCH') {
          setConflict(shareConflictMessage(errorDetails(reason_)));
          setRead(false);
          loadStory();
          onDone();
          throw new Error(errorText(reason_), { cause: reason_ });
        }
        throw reason_;
      }
    });

  return (
    <section className="panel">
      <div className="row between wrap">
        <h3>{story?.title ?? '이야기 공유 요청'}</h3>
        <span className={`tag ${pending ? 'gold' : published ? 'teal' : 'coral'}`}>
          {shareStatusLabel(request.status)}
        </span>
      </div>
      <p className="muted space-top">
        {new Date(request.requestedAt).toLocaleString('ko-KR')}에 아이가 보낸 요청이에요.
      </p>

      <h4 className="section-title">이대로 올라가요</h4>
      <ul className="checklist">
        {sharePublicScope(request).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {story ? (
        <details open={pending}>
          <summary>공개될 본문 그대로 읽기 ({story.version}번째 판)</summary>
          <p className="muted space-top">{story.summary}</p>
          <pre className="story-body">{story.body}</pre>
        </details>
      ) : (
        <Notice>
          이 계정 권한으로는 본문을 직접 열 수 없어요. 아이 화면에서 함께 읽고 승인해 주세요. 승인은
          아이가 보낸 {request.requestedBodyVersion}번째 판에 대해서만 이뤄져요.
        </Notice>
      )}

      {conflict && (
        <div role="alert">
          <Notice variant="error">{conflict}</Notice>
        </div>
      )}

      {pending && (
        <>
          <label className="setting-row">
            <span>
              <strong>위 내용을 끝까지 읽었어요</strong>
              <p>읽은 판({version}번째)을 그대로 서버에 보내 승인해요.</p>
            </span>
            <input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} />
          </label>
          {rejecting ? (
            <>
              <div className="field">
                <label htmlFor={`reject-${request.id}`}>아이에게 전할 이유</label>
                <textarea
                  id={`reject-${request.id}`}
                  value={reason}
                  maxLength={200}
                  placeholder="예: 친구 이름이 들어 있어서 한 번만 고쳐 볼까?"
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div className="actions split">
                <Button className="light" onClick={() => setRejecting(false)}>
                  그만두기
                </Button>
                <Button
                  className="danger"
                  disabled={busy || reason.trim().length < 2}
                  onClick={() =>
                    runQuiet(async () => {
                      await rejectShareRequest(
                        client,
                        request.id,
                        reason.trim(),
                        profileId ?? undefined,
                      );
                      setRejecting(false);
                      onDone();
                      return '반려하고 이유를 전했어요.';
                    })
                  }
                >
                  반려하기
                </Button>
              </div>
            </>
          ) : (
            <div className="actions split">
              <Button className="ghost" onClick={() => setRejecting(true)}>
                반려하기
              </Button>
              <Button disabled={busy || !read} onClick={approve}>
                <Icon name="check" />
                {busy ? '보내는 중…' : `${version}번째 판으로 승인하기`}
              </Button>
            </div>
          )}
        </>
      )}

      {published && (
        <div className="actions split">
          <Button
            className="ghost"
            disabled={busy}
            onClick={() =>
              runQuiet(async () => {
                await revokeShareRequest(
                  client,
                  request.id,
                  '보호자가 공개를 멈췄어요',
                  profileId ?? undefined,
                );
                onDone();
                return '공개를 멈췄어요. 친구들 화면에서 더는 보이지 않아요.';
              })
            }
          >
            공개 멈추기
          </Button>
        </div>
      )}

      {request.rejectReason && (
        <p className="muted space-top">아이에게 전한 이유: {request.rejectReason}</p>
      )}
      <ActionResult message={message} failed={failed} />
    </section>
  );
}

function ShareBody() {
  const { client } = useAuth();
  const { profileId } = useGuardian();
  const [requests, setRequests] = useState<ShareRequest[]>([]);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    listGuardianShareRequests(
      client,
      { profileId: profileId ?? undefined, status: showAll ? 'ALL' : undefined },
      abort.signal,
    )
      .then((page) => {
        if (!abort.signal.aborted) {
          setRequests(page.items);
          setError('');
        }
      })
      .catch((reason) => {
        if (!abort.signal.aborted) setError(errorText(reason, '공유 요청을 불러오지 못했어요.'));
      });
    return () => abort.abort();
  }, [client, profileId, showAll, tick]);

  const shown = showAll ? requests : requests.filter((request) => PENDING.includes(request.status));

  return (
    <>
      <Notice>
        승인 전에 <strong>무엇이 공개되는지</strong> 먼저 보여 드려요. 실명, 학교 이름, 대화 원문
        전체는 올라가지 않아요. 승인 뒤 아이가 이야기를 고치면 다시 확인이 필요해요.
      </Notice>
      {error && (
        <div role="alert">
          <Notice variant="error">{error}</Notice>
        </div>
      )}
      <div className="row between wrap space-top">
        <h2>
          {showAll
            ? `공유 요청 ${requests.length}건`
            : `확인을 기다리는 요청 ${PENDING_COUNT(requests)}건`}
        </h2>
        <Button className="light small" onClick={() => setShowAll((value) => !value)}>
          {showAll ? '기다리는 것만 보기' : '지난 요청까지 보기'}
        </Button>
      </div>
      {shown.length === 0 ? (
        <section className="panel">
          <p className="muted">
            지금은 확인할 요청이 없어요. 아이가 이야기를 공유하겠다고 하면 여기로 와요.
          </p>
        </section>
      ) : (
        <div className="stack space-top">
          {shown.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              profileId={profileId}
              onDone={() => setTick((n) => n + 1)}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function GuardianShareScreen() {
  return (
    <GuardianSection
      title="공개되기 전에, 보호자가 먼저 읽어요."
      description="아이가 올리고 싶어 하는 이야기를 그대로 보여 드려요. 읽은 판을 그대로 승인하고, 그 사이 바뀌면 다시 확인해요."
    >
      <GuardianGate>
        <ShareBody />
      </GuardianGate>
    </GuardianSection>
  );
}
