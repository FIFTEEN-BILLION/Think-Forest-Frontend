import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage, json } from '../api/requestOptions';
import { useAction, useServerQuery } from '../hooks/useServerApi';
import { useBackend } from '../providers/BackendProvider';
import { Message, Wait } from './QueryFeedback';
import type { Page, RecordItem } from '../screens/ReaderScreens';

interface Book {
  id: string;
  title: string;
  introduction: string;
  coverKey: string | null;
  status: string;
  version: number;
  items: { storyId: string; snapshot: { title: string; body: string } | null }[];
}

export function BookEditor({ id, close }: { id: string; close: () => void }) {
  const { request } = useBackend();
  const action = useAction();
  const q = useServerQuery<{ book: Book }>(`books/${id}`);
  const [cursor, setCursor] = useState('');
  const stories = useServerQuery<Page<RecordItem>>(
    `records?kind=STORY&cursor=${encodeURIComponent(cursor)}`,
  );
  if (!q.data) return <Wait error={q.error} retry={q.refetch} />;
  const book = q.data.book;
  const editable = book.status === 'DRAFT';
  return (
    <section className="panel">
      <div className="row between">
        <h2>{book.title}</h2>
        <button onClick={close}>책 닫기</button>
      </div>
      <Message text={action.message} />
      {editable ? (
        <form
          key={book.version}
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void action.run(async () => {
              await request(
                `books/${id}`,
                json(
                  {
                    title: form.get('title'),
                    introduction: form.get('introduction'),
                    coverKey: form.get('cover') || null,
                  },
                  'PATCH',
                  book.version,
                ),
              );
            });
          }}
        >
          <label>
            책 제목
            <input name="title" defaultValue={book.title} maxLength={80} required />
          </label>
          <label>
            책 소개
            <textarea name="introduction" defaultValue={book.introduction} maxLength={1000} />
          </label>
          <label>
            표지
            <select name="cover" defaultValue={book.coverKey ?? ''}>
              <option value="">기본</option>
              <option value="forest">생각의 숲</option>
              <option value="lab">호기심 실험실</option>
              <option value="theater">마음극장</option>
            </select>
          </label>
          <button className="btn" disabled={action.busy}>
            책 정보 저장
          </button>
        </form>
      ) : (
        <p>{book.introduction}</p>
      )}
      <ol>
        {book.items.map((item, index) => (
          <li key={item.storyId}>
            {item.snapshot ? (
              <details>
                <summary>{item.snapshot.title}</summary>
                <p className="server-prose">{item.snapshot.body}</p>
              </details>
            ) : (
              <Link to={`/shelf/${item.storyId}`}>이야기 {index + 1} 읽기</Link>
            )}
            {editable && (
              <div className="row">
                <button
                  disabled={action.busy || index === 0}
                  onClick={() =>
                    void action.run(async () => {
                      const ids = book.items.map((i) => i.storyId);
                      [ids[index - 1], ids[index]] = [ids[index]!, ids[index - 1]!];
                      await request(`books/${id}`, json({ storyIds: ids }, 'PATCH', book.version));
                    })
                  }
                >
                  앞으로 옮기기
                </button>
                <button
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      await request(`books/${id}/stories/${item.storyId}`, {
                        method: 'DELETE',
                        headers: { 'If-Match': `"${book.version}"` },
                      });
                    })
                  }
                >
                  책에서 빼기
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
      {editable && (
        <>
          <h3>이야기 더 담기</h3>
          {!stories.data ? (
            <Wait error={stories.error} retry={stories.refetch} />
          ) : (
            <>
              {stories.data.items
                .filter((s) => !book.items.some((i) => i.storyId === s.id))
                .map((s) => (
                  <button
                    key={s.id}
                    className="chip"
                    disabled={action.busy || book.items.length >= 30}
                    onClick={() =>
                      void action.run(async () => {
                        await request(
                          `books/${id}/stories`,
                          json({ storyId: s.id }, 'POST', book.version),
                        );
                      })
                    }
                  >
                    {s.title} +
                  </button>
                ))}
              <button
                disabled={!stories.data.nextCursor}
                onClick={() => setCursor(stories.data!.nextCursor!)}
              >
                다음 이야기 찾기
              </button>
            </>
          )}
          <button
            className="btn"
            disabled={action.busy || !book.items.length}
            onClick={() => {
              if (window.confirm('완성하면 현재 내용으로 고정돼요. 책을 완성할까요?'))
                void action.run(async () => {
                  await request(`books/${id}/complete`, json({}, 'POST', book.version));
                });
            }}
          >
            책 완성하기
          </button>
        </>
      )}
      <button
        className="btn light"
        disabled={action.busy}
        onClick={() => {
          if (window.confirm('책을 삭제할까요? 원래 이야기는 책장에 남아요.'))
            void action.run(async () => {
              await request(`books/${id}`, {
                method: 'DELETE',
                headers: { 'If-Match': `"${book.version}"` },
              });
              close();
            });
        }}
      >
        책 삭제
      </button>
    </section>
  );
}

export interface TopicCategory {
  id: string;
  name: string;
  source: string;
  sortOrder: number;
  version: number;
}
export function CategoryManager() {
  const { request } = useBackend();
  const action = useAction();
  const [name, setName] = useState('');
  const q = useServerQuery<Page<TopicCategory>>('topic-categories');
  return (
    <section className="panel">
      <h2>내 주제 분류</h2>
      <Message text={action.message} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            await request('topic-categories', json({ name, sortOrder: q.data?.items.length ?? 0 }));
            setName('');
          });
        }}
      >
        <label>
          새 분류 이름
          <input maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button disabled={action.busy || !name.trim()}>분류 추가</button>
      </form>
      {q.data?.items
        .filter((c) => c.source === 'USER')
        .map((c) => (
          <div className="row wrap" key={c.id}>
            <span>{c.name}</span>
            <button
              disabled={action.busy}
              onClick={() => {
                const renamed = window.prompt('새 분류 이름', c.name);
                if (renamed?.trim())
                  void action.run(async () => {
                    await request(
                      `topic-categories/${c.id}`,
                      json({ name: renamed }, 'PATCH', c.version),
                    );
                  });
              }}
            >
              이름 바꾸기
            </button>
            <button
              disabled={action.busy}
              onClick={() => {
                if (window.confirm('분류를 삭제할까요? 이야기는 유지돼요.'))
                  void action.run(async () => {
                    await request(`topic-categories/${c.id}`, {
                      method: 'DELETE',
                      headers: { 'If-Match': `"${c.version}"` },
                    });
                  });
              }}
            >
              분류 삭제
            </button>
          </div>
        ))}
      {!!q.error && <Wait error={q.error} retry={q.refetch} />}
    </section>
  );
}

interface Preferences {
  shareRequests: boolean;
  safetyEvents: boolean;
  reviewReminders: boolean;
  version: number;
}
export function NotificationSettings() {
  const { request } = useBackend();
  const action = useAction();
  const q = useServerQuery<Preferences>('notification-settings');
  return (
    <section className="panel">
      <h2>알림 설정</h2>
      <Message text={action.message} />
      {!q.data ? (
        <Wait error={q.error} retry={q.refetch} />
      ) : (
        (['shareRequests', 'safetyEvents', 'reviewReminders'] as const).map((field, i) => (
          <label key={field}>
            <input
              type="checkbox"
              checked={q.data![field]}
              disabled={action.busy}
              onChange={(e) => {
                const checked = e.target.checked;
                void action.run(async () => {
                  await request(
                    'notification-settings',
                    json({ [field]: checked }, 'PATCH', q.data!.version),
                  );
                });
              }}
            />
            {['공유 확인 요청', '안전 관련 알림', '복습 알림'][i]}
          </label>
        ))
      )}
    </section>
  );
}

export function ConsentHistory({ profileId }: { profileId: string }) {
  const { request } = useBackend();
  const action = useAction();
  const q = useServerQuery<{
    items: {
      id: string;
      documentId: string;
      documentVersion: string;
      agreed: boolean;
      withdrawnAt: string | null;
    }[];
  }>(`consents?profileId=${profileId}`);
  const legal = useServerQuery<{
    items: { documentId: string; title: string; required: boolean }[];
  }>('legal-documents');
  return (
    <section className="panel">
      <h2>저장된 동의</h2>
      <Message text={action.message} />
      {!q.data ? (
        <Wait error={q.error} retry={q.refetch} />
      ) : q.data.items.length ? (
        q.data.items.map((c) => {
          const doc = legal.data?.items.find((d) => d.documentId === c.documentId);
          return (
            <div className="row wrap" key={c.id}>
              <span>
                {doc?.title ?? '이전 이용 안내'} ·{' '}
                {c.agreed && !c.withdrawnAt ? '동의함' : '동의하지 않음'}
              </span>
              {doc && !doc.required && c.agreed && !c.withdrawnAt && (
                <button
                  disabled={action.busy}
                  onClick={() => {
                    if (window.confirm('선택 동의를 철회할까요? 공유 이야기도 숨겨져요.'))
                      void action.run(async () => {
                        await request(`consents/${c.id}`, { method: 'DELETE' });
                      });
                  }}
                >
                  동의 철회
                </button>
              )}
            </div>
          );
        })
      ) : (
        <p>저장한 동의가 없어요.</p>
      )}
    </section>
  );
}

export function RetentionControl({
  profileId,
  settings,
}: {
  profileId: string;
  settings: { version: number; retentionDays: number };
}) {
  const { request, invalidate } = useBackend();
  const [days, setDays] = useState(settings.retentionDays);
  const mutation = useMutation({
    mutationFn: (confirmed: boolean) =>
      request<{
        retentionImpact: {
          affectedCount: number;
          effectiveAt: string;
          confirmationRequired: boolean;
        } | null;
      }>(
        `profiles/${profileId}/settings`,
        json({ retentionDays: days, confirmRetentionChange: confirmed }, 'PATCH', settings.version),
      ),
    onSuccess: (result) =>
      result.retentionImpact?.confirmationRequired ? undefined : invalidate(),
  });
  const impact = mutation.data?.retentionImpact?.confirmationRequired
    ? mutation.data.retentionImpact
    : null;
  const message = mutation.error
    ? errorMessage(mutation.error)
    : mutation.isSuccess && !impact
      ? '보관 기간 변경을 예약했어요. 24시간 뒤 적용돼요.'
      : '';
  const update = (confirmed: boolean) => mutation.mutate(confirmed);
  return (
    <div>
      <h3>보관 기간 변경</h3>
      <p>최근 5분 안에 로그인한 보호자만 변경할 수 있어요.</p>
      <Message text={message} />
      <select
        aria-label="새 보관 기간"
        value={days}
        disabled={mutation.isPending}
        onChange={(e) => {
          setDays(Number(e.target.value));
          mutation.reset();
        }}
      >
        <option value={30}>30일</option>
        <option value={90}>90일</option>
        <option value={180}>180일</option>
      </select>
      <button
        disabled={mutation.isPending || days === settings.retentionDays}
        onClick={() => void update(false)}
      >
        변경 내용 확인
      </button>
      {impact && (
        <div role="alert">
          <p>
            기간이 지난 데이터 {impact.affectedCount}건이{' '}
            {new Date(impact.effectiveAt).toLocaleString('ko-KR')} 이후 삭제 대상이 돼요.
          </p>
          <button disabled={mutation.isPending} onClick={() => void update(true)}>
            확인하고 변경 예약
          </button>
        </div>
      )}
    </div>
  );
}

export function GuardianPermissions({
  link,
}: {
  link: { id: string; version: number; permissions: string[] };
}) {
  const { request } = useBackend();
  const action = useAction();
  const [checked, setChecked] = useState(link.permissions);
  const labels: Record<string, string> = {
    VIEW_PROFILE: '프로필 보기',
    EDIT_PROFILE: '프로필 수정',
    VIEW_STORIES: '이야기 보기',
    VIEW_REPORTS: '보고서 보기',
    REVIEW_SHARING: '공유 확인',
    MANAGE_DATA: '데이터 관리',
    MANAGE_LINKS: '연결 관리',
    VIEW_SAFETY: '안전 알림 보기',
  };
  return (
    <details>
      <summary>연결 권한 관리</summary>
      <Message text={action.message} />
      <p>권한을 줄일 수 있어요. 다시 추가하려면 연결을 새로 확인해야 해요.</p>
      {link.permissions.map((permission) => (
        <label key={permission}>
          <input
            type="checkbox"
            checked={checked.includes(permission)}
            onChange={(e) =>
              setChecked(
                e.target.checked
                  ? [...checked, permission]
                  : checked.filter((p) => p !== permission),
              )
            }
          />
          {labels[permission] ?? permission}
        </label>
      ))}
      <button
        disabled={action.busy}
        onClick={() => {
          if (window.confirm('선택한 권한으로 변경할까요?'))
            void action.run(async () => {
              await request(
                `guardian-links/${link.id}`,
                json({ permissions: checked }, 'PATCH', link.version),
              );
            });
        }}
      >
        권한 저장
      </button>
    </details>
  );
}

export function SafetyEvents({ profileId }: { profileId: string }) {
  const [cursor, setCursor] = useState('');
  const q = useServerQuery<
    Page<{ id: string; createdAt: string; kind?: string; category?: string; severity?: string }>
  >(`guardian/safety-events?profileId=${profileId}&cursor=${encodeURIComponent(cursor)}`);
  return (
    <section className="panel">
      <h2>보호자 확인 알림</h2>
      {!q.data ? (
        <Wait error={q.error} retry={q.refetch} />
      ) : (
        <>
          {q.data.items.length ? (
            q.data.items.map((event) => (
              <p key={event.id}>
                {new Date(event.createdAt).toLocaleString('ko-KR')} · 아이와 함께 대화 내용을 확인해
                주세요.
              </p>
            ))
          ) : (
            <p>확인할 안전 알림이 없어요.</p>
          )}
          <button disabled={!q.data.nextCursor} onClick={() => setCursor(q.data!.nextCursor!)}>
            다음 알림
          </button>
        </>
      )}
    </section>
  );
}

export function AccountDeletion() {
  const backend = useBackend();
  const action = useAction();
  const [confirmation, setConfirmation] = useState('');
  const storageKey = `jjcp-deletion-${backend.me?.user.id}`;
  const [id, setId] = useState(() => localStorage.getItem(storageKey) ?? '');
  const q = useServerQuery<{ job: { status: string }; cancelUntil: string }>(
    id ? `account-deletion-requests/${id}` : null,
  );
  return (
    <section className="panel">
      <h2>계정 삭제</h2>
      <Message text={action.message} />
      <p>요청 후 24시간 동안 취소할 수 있어요. 최근 5분 안에 로그인해야 해요.</p>
      {q.data && (
        <p>
          요청 상태:{' '}
          {
            (
              {
                QUEUED: '삭제 대기',
                RUNNING: '삭제 중',
                SUCCEEDED: '삭제 완료',
                CANCELLED: '취소됨',
                FAILED: '처리 실패',
              } as Record<string, string>
            )[q.data.job.status]
          }{' '}
          · 취소 기한 {new Date(q.data.cancelUntil).toLocaleString('ko-KR')}
        </p>
      )}
      {!!q.error && <Wait error={q.error} retry={q.refetch} />}
      {q.data?.job.status === 'QUEUED' ? (
        <button
          disabled={action.busy}
          onClick={() =>
            void action.run(async () => {
              await backend.request(`account-deletion-requests/${id}/cancel`, json({}));
              localStorage.removeItem(storageKey);
              setId('');
              await backend.refreshMe();
              action.setMessage('계정 삭제 요청을 취소했어요.');
            })
          }
        >
          계정 삭제 취소
        </button>
      ) : (
        <>
          <label>
            계정을 삭제하려면 DELETE를 입력해 주세요.
            <input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          </label>
          <button
            disabled={action.busy || confirmation !== 'DELETE' || (!!id && !q.data)}
            onClick={() =>
              void action.run(async () => {
                const result = await backend.request<{ job: { id: string } }>(
                  'account-deletion-requests',
                  json({ confirmation: 'DELETE' }),
                );
                setId(result.job.id);
                localStorage.setItem(storageKey, result.job.id);
                setConfirmation('');
              })
            }
          >
            계정 삭제 예약
          </button>
        </>
      )}
    </section>
  );
}
