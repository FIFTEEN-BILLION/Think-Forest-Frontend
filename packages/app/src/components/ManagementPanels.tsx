import { confirmAction, promptText } from './dialogs';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Model } from '../api/schema';
import { json } from '../api/requestOptions';
import { useServerQuery, useAction } from '../hooks/useServerApi';
import { useBackend } from '../providers/BackendProvider';
import { Message, Wait } from './QueryFeedback';
import { ChoiceControl } from './ChoiceControl';
export type TopicCategory = Model<'TopicCategoryOut'>;
export function BookEditor({ id, close }: { id: string; close: () => void }) {
  const { request } = useBackend();
  const action = useAction();
  const [cursor, go] = useState('');
  const q = useServerQuery<Model<'BookResponse'>>(`books/${id}`);
  const stories = useServerQuery<Model<'StoryList'>>(
    `stories?cursor=${encodeURIComponent(cursor)}`,
  );
  if (!q.data) return <Wait error={q.error} retry={q.refetch} />;
  const b = q.data.book;
  const edit = b.status === 'DRAFT';
  return (
    <section className="panel">
      <button className="btn light" onClick={close}>
        책 닫기
      </button>
      <h2>{b.title}</h2>
      <Message text={action.message} />
      {edit ? (
        <form
          key={b.version}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void action.run(async () => {
              await request(
                `books/${id}`,
                json(
                  {
                    title: f.get('title'),
                    introduction: f.get('intro'),
                    cover: { theme: f.get('theme'), emoji: '🌱' },
                  },
                  'PATCH',
                  b.version,
                ),
              );
            });
          }}
        >
          <label>
            책 제목
            <input name="title" defaultValue={b.title} required maxLength={60} />
          </label>
          <label>
            소개
            <textarea name="intro" defaultValue={b.introduction} maxLength={600} />
          </label>
          <label>
            표지
            <select name="theme" defaultValue={b.cover?.theme ?? 'forest'}>
              <option value="forest">생각의 숲</option>
              <option value="lab">실험실</option>
              <option value="theater">마음극장</option>
            </select>
          </label>
          <button className="btn light" disabled={action.busy}>
            책 정보 저장
          </button>
        </form>
      ) : (
        <p>{b.introduction}</p>
      )}
      <ol>
        {b.stories.map((s, index) => (
          <li key={s.id}>
            <Link to={`/shelf/${s.id}`}>{s.title}</Link>
            {edit && (
              <>
                <button
                  className="btn light"
                  disabled={action.busy || !index}
                  onClick={() =>
                    void action.run(async () => {
                      const ids = b.stories.map((v) => v.id);
                      [ids[index - 1], ids[index]] = [ids[index]!, ids[index - 1]!];
                      await request(`books/${id}`, json({ storyIds: ids }, 'PATCH', b.version));
                    })
                  }
                >
                  앞으로
                </button>
                <button
                  className="btn light"
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      await request(`books/${id}/stories/${s.id}`, {
                        method: 'DELETE',
                        headers: { 'If-Match': `"${b.version}"` },
                      });
                    })
                  }
                >
                  책에서 빼기
                </button>
              </>
            )}
          </li>
        ))}
      </ol>
      {edit && (
        <>
          <h3>이야기 더 담기</h3>
          {stories.data ? (
            <>
              {stories.data.items
                .filter((s) => !b.stories.some((x) => x.id === s.id))
                .map((s) => (
                  <button
                    className="btn light"
                    key={s.id}
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(async () => {
                        await request(
                          `books/${id}/stories`,
                          json({ storyId: s.id }, 'POST', b.version),
                        );
                      })
                    }
                  >
                    {s.title} +
                  </button>
                ))}
              <button
                className="btn light"
                disabled={!stories.data.nextCursor}
                onClick={() => go(stories.data!.nextCursor!)}
              >
                다음 이야기
              </button>
            </>
          ) : (
            <Wait error={stories.error} retry={stories.refetch} />
          )}
          <button
            className="btn light"
            disabled={action.busy || !b.stories.length}
            onClick={async () => {
              if (await confirmAction('현재 내용으로 책을 완성할까요?'))
                void action.run(async () => {
                  await request(`books/${id}/complete`, json({}, 'POST', b.version));
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
        onClick={async () => {
          if (await confirmAction('이 책을 삭제할까요? 원래 이야기는 남아요.'))
            void action.run(async () => {
              await request(`books/${id}`, {
                method: 'DELETE',
                headers: { 'If-Match': `"${b.version}"` },
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
export function CategoryManager() {
  const { request } = useBackend();
  const action = useAction();
  const [name, setName] = useState('');
  const q = useServerQuery<Model<'TopicCategoryList'>>('topic-categories');
  return (
    <section className="panel">
      <h2>내 주제 분류</h2>
      <Message text={action.message} />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          void action.run(async () => {
            await request('topic-categories', json({ name }));
            setName('');
          });
        }}
      >
        <label>
          새 분류
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} required />
        </label>
        <button className="btn light" disabled={action.busy}>
          추가
        </button>
      </form>
      {q.data ? (
        q.data.items.map((c) => (
          <p key={c.id}>
            {c.name}
            {c.editable && (
              <>
                <button
                  className="btn light"
                  disabled={action.busy}
                  onClick={async () => {
                    const renamed = await promptText('새 분류 이름', c.name);
                    if (renamed?.trim())
                      void action.run(async () => {
                        await request(`topic-categories/${c.id}`, json({ name: renamed }, 'PATCH'));
                      });
                  }}
                >
                  이름 바꾸기
                </button>
                <button
                  className="btn light"
                  disabled={action.busy}
                  onClick={async () => {
                    if (await confirmAction('분류를 지울까요?'))
                      void action.run(async () => {
                        await request(`topic-categories/${c.id}`, { method: 'DELETE' });
                      });
                  }}
                >
                  삭제
                </button>
              </>
            )}
          </p>
        ))
      ) : (
        <Wait error={q.error} retry={q.refetch} />
      )}
    </section>
  );
}
export function NotificationSettings() {
  const { request } = useBackend();
  const action = useAction();
  const q = useServerQuery<Model<'NotificationSettingsResponse'>>('notification-settings');
  return (
    <section className="panel">
      <h2>알림 설정</h2>
      <Message text={action.message} />
      {q.data ? (
        (['pushEnabled', 'shareRequests', 'safetyNotices', 'activitySummary'] as const).map(
          (k, i) => (
            <ChoiceControl
              key={k}
              variant="switch"
              label={['푸시 알림', '공유 요청', '안전 안내', '활동 요약'][i]!}
              checked={q.data!.settings[k]}
              disabled={action.busy}
              onChange={(e) => {
                const v = e.target.checked;
                void action.run(async () => {
                  await request('notification-settings', json({ [k]: v }, 'PATCH'));
                });
              }}
            />
          ),
        )
      ) : (
        <Wait error={q.error} retry={q.refetch} />
      )}
    </section>
  );
}
export function ConsentHistory({ profileId }: { profileId: string }) {
  const { request } = useBackend();
  const action = useAction();
  const q = useServerQuery<Model<'ConsentListResponse'>>(`consents?profileId=${profileId}`);
  const legal = useServerQuery<Model<'LegalDocumentListResponse'>>('legal-documents');
  return (
    <section className="panel">
      <h2>이용 안내와 동의</h2>
      <Message text={action.message} />
      {legal.data && q.data ? (
        legal.data.items.map((d) => {
          const current = q.data.items.find((c) => c.documentId === d.id && c.current);
          return (
            <details key={d.id}>
              <summary>
                {d.title} · {current ? '동의함' : '미동의'}
              </summary>
              <p className="server-prose">{d.body}</p>
              {d.draft && <p>{d.draftNotice}</p>}
              <button
                className="btn light"
                disabled={action.busy}
                onClick={async () => {
                  if (
                    await confirmAction(
                      current ? '이 동의를 철회할까요?' : '안내 내용을 읽고 동의할까요?',
                    )
                  )
                    void action.run(async () => {
                      if (current) await request(`consents/${current.id}`, { method: 'DELETE' });
                      else
                        await request(
                          'consents',
                          json({
                            profileId,
                            items: [{ documentId: d.id, version: d.version, agreed: true }],
                          }),
                        );
                    });
                }}
              >
                {current ? '동의 철회' : '읽고 동의하기'}
              </button>
            </details>
          );
        })
      ) : (
        <Wait
          error={legal.error || q.error}
          retry={() => {
            void legal.refetch();
            void q.refetch();
          }}
        />
      )}
    </section>
  );
}
export function SafetyEvents({ profileId }: { profileId: string }) {
  const [cursor, go] = useState('');
  const q = useServerQuery<Model<'SafetyEventList'>>(
    `guardian/safety-events?profileId=${profileId}&cursor=${encodeURIComponent(cursor)}`,
  );
  return (
    <section className="panel">
      <h2>보호자 확인 알림</h2>
      {q.data ? (
        <>
          <p>{q.data.notice}</p>
          {q.data.items.map((v) => (
            <p key={v.id}>
              {new Date(v.occurredAt).toLocaleString('ko-KR')} · {v.guidance}
            </p>
          ))}
          {!q.data.items.length && <p>확인할 알림이 없어요.</p>}
          <button
            className="btn light"
            disabled={!q.data.nextCursor}
            onClick={() => go(q.data!.nextCursor!)}
          >
            다음 알림
          </button>
        </>
      ) : (
        <Wait error={q.error} retry={q.refetch} />
      )}
    </section>
  );
}
