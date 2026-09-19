import { confirmAction } from '../components/dialogs';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Model } from '../api/schema';
import { json } from '../api/requestOptions';
import { useAction, useServerQuery } from '../hooks/useServerApi';
import { useBackend } from '../providers/BackendProvider';
import { Icon } from '../components/Icon';
import { PageHeading } from '../components/ui';
import { PLACES } from '../data/catalog';
import { Message, Wait } from '../components/QueryFeedback';
import { GridWorld, ProgramView } from '../components/PathParts';
import type { PathMap, ProgramStep, Heading } from '../types/village';
import { Simulation } from '../components/Simulation';
export function ActivityCatalog() {
  const { track, activityId } = useParams();
  const { request } = useBackend();
  const action = useAction();
  const navigate = useNavigate();
  const [cursor, go] = useState('');
  const [search, setSearch] = useState('');
  const q = useServerQuery<Model<'ActivityList'>>(
    !activityId
      ? `activities?${track ? `track=${track}&` : ''}query=${encodeURIComponent(search)}&cursor=${encodeURIComponent(cursor)}`
      : null,
  );
  const detail = useServerQuery<Model<'ActivityDetailResponse'>>(
    activityId ? `activities/${activityId}` : null,
  );
  const active = useServerQuery<{
    items: Model<'ActivitySessionOut'>[];
    nextCursor: string | null;
  }>('activity-sessions?status=ACTIVE');
  return (
    <>
      <PageHeading
        eyebrow="THINKING ADVENTURES"
        title={detail.data?.activity.title ?? '작은 질문에서 시작하는 생각 모험'}
        description={
          detail.data?.activity.subtitle ?? '이야기를 읽고, 직접 실험하고, 마음을 상상해 보세요.'
        }
      />
      <Message text={action.message} />
      <nav className="filters" aria-label="모험 공간">
        <Link className={`chip ${!track ? 'active' : ''}`} to="/adventures">
          전체
        </Link>
        <Link className={`chip ${track === 'forest' ? 'active' : ''}`} to="/adventures/forest">
          생각의 숲
        </Link>
        <Link className={`chip ${track === 'lab' ? 'active' : ''}`} to="/adventures/lab">
          실험실
        </Link>
        <Link className={`chip ${track === 'theater' ? 'active' : ''}`} to="/adventures/theater">
          마음극장
        </Link>
      </nav>
      {active.data?.items.map((a) => (
        <p key={a.sessionId}>
          <Link to={`/session/${a.track}?session=${a.sessionId}`}>{a.title} 이어하기</Link>
        </p>
      ))}
      {activityId ? (
        !detail.data ? (
          <Wait error={detail.error} retry={detail.refetch} />
        ) : (
          <section className="panel">
            <p>{detail.data.activity.description}</p>
            <p>{detail.data.activity.estimatedMinutes}분</p>
            <ol>
              {detail.data.activity.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <button
              className="btn"
              disabled={action.busy}
              onClick={() =>
                void action.run(async () => {
                  const r = await request<Model<'ActivitySessionResponse'>>(
                    'activity-sessions',
                    json({ activityId }),
                  );
                  navigate(`/session/${r.session.track}?session=${r.session.sessionId}`);
                })
              }
            >
              모험 시작
            </button>
          </section>
        )
      ) : (
        <>
          <label className="search-field">
            <Icon name="search" />
            <input
              aria-label="활동 찾기"
              placeholder="궁금한 모험을 찾아보세요"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                go('');
              }}
            />
          </label>
          {q.data ? (
            <>
              <div className="cards books">
                {q.data.items.map((a) => (
                  <article className="book" key={a.id}>
                    <div className={`book-cover ${PLACES[a.track].color}`}>
                      <span className="eyebrow">{a.area}</span>
                      <h3>{a.title}</h3>
                      <Icon name={PLACES[a.track].icon} />
                    </div>
                    <div className="book-body">
                      <span className={`tag ${PLACES[a.track].color}`}>{a.place}</span>
                      <h3>{a.subtitle}</h3>
                      <p>{a.description}</p>
                      <small className="muted">약 {a.estimatedMinutes}분 · 자유롭게 생각해요</small>
                      <Link className="btn light" to={`/adventures/${a.track}/${a.id}`}>
                        모험 만나기 <Icon name="arrow" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
              <button
                className="btn light"
                disabled={!q.data.nextCursor}
                onClick={() => go(q.data!.nextCursor!)}
              >
                다음 활동
              </button>
            </>
          ) : (
            <Wait error={q.error} retry={q.refetch} />
          )}
        </>
      )}
    </>
  );
}
type Session = Model<'ActivitySessionOut'>;
type Event = Model<'ActivityEvent'>;
export function ApiActivity() {
  const params = new URLSearchParams(useLocation().search);
  const id = params.get('session');
  const { request } = useBackend();
  const action = useAction();
  const navigate = useNavigate();
  const q = useServerQuery<Model<'ActivitySessionResponse'>>(id ? `activity-sessions/${id}` : null);
  const detail = useServerQuery<Model<'ActivityDetailResponse'>>(
    q.data ? `activities/${q.data.session.activityId}` : null,
  );
  if (!id)
    return (
      <section className="panel">
        <p>모험을 골라 시작해 주세요.</p>
        <Link to="/adventures">모험 고르기</Link>
      </section>
    );
  if (!q.data || !detail.data)
    return (
      <Wait
        error={q.error || detail.error}
        retry={() => {
          void q.refetch();
          void detail.refetch();
        }}
      />
    );
  const s = q.data.session;
  const a = detail.data.activity;
  const event = (e: Event) =>
    action.run(async () => {
      const r = await request<Model<'ActivitySessionResponse'>>(
        `activity-sessions/${id}`,
        json({ clientRevision: s.revision, event: e }, 'PATCH'),
      );
      q.setData(r);
    });
  const save = (type: Event['type'], field?: string, initial = '', label = '내 생각') => (
    <ActivityText
      key={`${s.step.index}-${type}-${field ?? ''}`}
      initial={initial}
      label={label}
      busy={action.busy}
      submit={(value) => event({ type, field, value })}
    />
  );
  const lab = s.draft.lab ?? {};
  const theater = s.draft.theater ?? {};
  const inquiry = s.draft.inquiry;
  const story = theater.story as { title: string; scenes: string[]; branches: string[] } | null;
  return (
    <>
      <header className="page-head">
        <h1>{s.title}</h1>
        <p>
          {s.step.index + 1}단계 · {s.step.label}
        </p>
        <small>진행 내용은 저장할 때마다 계정에 보관돼요.</small>
      </header>
      <Message text={action.message} />
      {s.status !== 'ACTIVE' ? (
        <section className="panel">
          <p>{s.status === 'COMPLETED' ? '완료한 모험이에요.' : '중단한 모험이에요.'}</p>
          {s.storyId && <Link to={`/shelf/${s.storyId}`}>저장한 기록 보기</Link>}
          <Link to="/adventures">다른 모험</Link>
        </section>
      ) : (
        <>
          <section className="panel">
            <p>{a.intro}</p>
            {a.clue && <p>{a.clue}</p>}
            {s.draft.followup && <p>{s.draft.followup}</p>}
            {s.activityId === 'path-teaching' ? (
              <PathActivity session={s} refresh={() => q.refetch()} />
            ) : s.activityId === 'first-inquiry' && inquiry ? (
              <>
                {s.step.index === 0 && (
                  <>
                    {save('INQUIRY', 'INITIAL', String(inquiry.initial ?? ''), '처음 생각')}
                    {save('INQUIRY', 'REASON', String(inquiry.reason ?? ''), '그렇게 생각한 이유')}
                  </>
                )}
                {s.step.index === 1 && (
                  <>
                    {save('INQUIRY', 'MEANING', String(inquiry.meaning ?? ''), '내가 말하려던 뜻')}
                    <button
                      className="btn light"
                      disabled={action.busy}
                      onClick={() =>
                        void event({ type: 'INQUIRY', field: 'CONFIRMED', value: true })
                      }
                    >
                      {inquiry.confirmed ? '뜻 확인됨' : '내 뜻이 맞아요'}
                    </button>
                  </>
                )}
                {s.step.index === 2 && (
                  <>
                    {a.visuals.items.map((v, i) => (
                      <button
                        className="btn light"
                        disabled={action.busy}
                        key={v}
                        onClick={() =>
                          void event({
                            type: 'INQUIRY',
                            field: 'OBSERVED',
                            value: i === 0 ? 'low' : 'high',
                          })
                        }
                      >
                        {v} 관찰하기
                      </button>
                    ))}
                    <p>관찰한 조건: {String(inquiry.observed ?? '')}</p>
                  </>
                )}
                {s.step.index === 3 && (
                  <>
                    <label>
                      지금 생각
                      <select
                        value={String(inquiry.judgment ?? '')}
                        disabled={action.busy}
                        onChange={(e) =>
                          void event({ type: 'INQUIRY', field: 'JUDGMENT', value: e.target.value })
                        }
                      >
                        <option value="">선택해 주세요</option>
                        <option value="keep">처음 생각과 같아요</option>
                        <option value="change">생각이 달라졌어요</option>
                        <option value="explore">더 알아보고 싶어요</option>
                      </select>
                    </label>
                    {save('INQUIRY', 'FINAL', String(inquiry.final ?? ''), '지금 생각')}
                    {save(
                      'INQUIRY',
                      'FINAL_REASON',
                      String(inquiry.finalReason ?? ''),
                      '지금 생각의 이유',
                    )}
                  </>
                )}
                {s.step.index === 4 && (
                  <>
                    <h2>처음과 지금</h2>
                    <p>{String(inquiry.initial)}</p>
                    <p>{String(inquiry.final)}</p>
                    <p>{String(inquiry.finalReason)}</p>
                  </>
                )}
              </>
            ) : (
              <>
                {s.track === 'forest' && (
                  <>
                    {a.visuals.items.map((v) => (
                      <p key={v}>{v}</p>
                    ))}
                    {s.step.writing && <p>{a.questions[s.step.index - 1]}</p>}
                  </>
                )}
                {s.track === 'lab' &&
                  s.step.index === 0 &&
                  lab.mode === 'custom' &&
                  save('TOPIC', undefined, String(lab.topic ?? ''), '궁금한 주제')}
                {s.track === 'lab' && s.step.index === 2 && (
                  <>
                    {lab.mode === 'custom' ? (
                      <>
                        {save('OBSERVATION', 'A', String(lab.a ?? ''), '첫 번째 관찰')}
                        {save('OBSERVATION', 'B', String(lab.b ?? ''), '두 번째 관찰')}
                      </>
                    ) : (
                      <>
                        <Simulation
                          lab={{
                            mode: lab.mode === 'balance' ? 'balance' : 'shadow',
                            value: Number(lab.value ?? 50),
                            topic: String(lab.topic ?? ''),
                            low: Boolean(lab.low),
                            high: Boolean(lab.high),
                            a: String(lab.a ?? ''),
                            b: String(lab.b ?? ''),
                            source: '',
                            prediction: String(lab.prediction ?? ''),
                          }}
                        />
                        <label>
                          실험 조건
                          <input
                            type="range"
                            min={10}
                            max={90}
                            defaultValue={Number(lab.value ?? 50)}
                            disabled={action.busy}
                            onPointerUp={(e) =>
                              void event({
                                type: 'LAB_VALUE',
                                value: Number(e.currentTarget.value),
                              })
                            }
                            onKeyUp={(e) =>
                              void event({
                                type: 'LAB_VALUE',
                                value: Number(e.currentTarget.value),
                              })
                            }
                          />
                        </label>
                        <button
                          className="btn light"
                          disabled={action.busy}
                          onClick={() => void event({ type: 'LAB_VALUE', value: 20 })}
                        >
                          낮은 조건 관찰
                        </button>
                        <button
                          className="btn light"
                          disabled={action.busy}
                          onClick={() => void event({ type: 'LAB_VALUE', value: 80 })}
                        >
                          높은 조건 관찰
                        </button>
                      </>
                    )}
                  </>
                )}
                {s.track === 'theater' && (
                  <>
                    {s.step.index === 0 &&
                      save('KEYWORD', undefined, String(theater.keyword ?? ''), '마음 키워드')}
                    {s.step.index === 1 && story && (
                      <>
                        <h2>{story.title}</h2>
                        {story.scenes.map((v, i) => (
                          <p key={i}>{v}</p>
                        ))}
                        {story.branches.map((v, i) => (
                          <p key={i}>
                            선택 {i + 1}: {v}
                          </p>
                        ))}
                        <button
                          className="btn light"
                          disabled={action.busy}
                          onClick={async () => {
                            if (await confirmAction('보호자가 대본과 두 가지 선택을 확인했나요?'))
                              void event({ type: 'APPROVE', value: true });
                          }}
                        >
                          {theater.approved ? '확인 완료' : '보호자 확인'}
                        </button>
                      </>
                    )}
                    {s.step.index === 2 && story && (
                      <>
                        <p>{story.scenes[Number(theater.scene)]}</p>
                        {Number(theater.scene) === 1 ? (
                          story.branches.map((v, i) => (
                            <button
                              className="btn light"
                              key={i}
                              disabled={action.busy}
                              onClick={() => void event({ type: 'CHOICE', value: i })}
                            >
                              {v}
                            </button>
                          ))
                        ) : (
                          <button
                            className="btn light"
                            disabled={action.busy || Number(theater.scene) === 3}
                            onClick={() => void event({ type: 'SCENE', value: 'NEXT' })}
                          >
                            다음 장면
                          </button>
                        )}
                      </>
                    )}
                    {s.step.index === 3 && (
                      <label>
                        느낀 마음
                        <select
                          value={String(theater.emotion ?? '')}
                          disabled={action.busy}
                          onChange={(e) => void event({ type: 'EMOTION', value: e.target.value })}
                        >
                          <option value="">선택해 주세요</option>
                          {a.visuals.items.map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </>
                )}
                {s.step.writing &&
                  save(
                    'TEXT',
                    undefined,
                    s.draft.text,
                    `내 생각 (공백 제외 ${s.minCharacters}자 이상)`,
                  )}
              </>
            )}
            {(s.draft.answers ?? []).map((v, i) => (
              <p key={i}>
                <strong>{v.question}</strong>
                <br />
                {v.text}
              </p>
            ))}
          </section>
          <section className="panel">
            {s.missing.map((v) => (
              <p key={v.code}>{v.message}</p>
            ))}
            {s.readyToComplete ? (
              <button
                className="btn"
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    const r = await request<Model<'ActivityCompleteResponse'>>(
                      `activity-sessions/${id}/complete`,
                      json({}),
                    );
                    navigate(`/shelf/${r.story.id}`);
                  })
                }
              >
                모험 마치고 책장에 저장
              </button>
            ) : (
              <button
                className="btn"
                disabled={action.busy || !!s.missing.length}
                onClick={() =>
                  void action.run(async () => {
                    const r = await request<Model<'ActivitySessionResponse'>>(
                      `activity-sessions/${id}/advance`,
                      json({}),
                    );
                    q.setData(r);
                  })
                }
              >
                다음 단계
              </button>
            )}
            <button
              className="btn light"
              disabled={action.busy}
              onClick={async () => {
                if (await confirmAction('이 모험을 중단할까요?'))
                  void action.run(async () => {
                    await request(`activity-sessions/${id}`, { method: 'DELETE' });
                    navigate('/adventures');
                  });
              }}
            >
              모험 중단
            </button>
          </section>
        </>
      )}
    </>
  );
}
function ActivityText({
  initial,
  label,
  busy,
  submit,
}: {
  initial: string;
  label: string;
  busy: boolean;
  submit: (value: string) => Promise<void>;
}) {
  const [text, setText] = useState(initial);
  const send = (e: FormEvent) => {
    e.preventDefault();
    void submit(text);
  };
  return (
    <form onSubmit={send}>
      <label>
        {label}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          rows={3}
        />
      </label>
      <button className="btn light" disabled={busy || text === initial}>
        저장
      </button>
      <small>{text === initial ? '저장됨' : '저장하지 않은 내용이 있어요.'}</small>
    </form>
  );
}
type PathState = {
  map: PathMap;
  program: ProgramStep[];
  runs: number;
  wins: number;
  turns: { text: string; reply: string }[];
  lastRun?: { cells: number[]; cell: number; heading: Heading; outcome: string };
  clarify?: { question: string; options: { label: string; program: ProgramStep[] }[] } | null;
};
function PathActivity({ session, refresh }: { session: Session; refresh: () => Promise<unknown> }) {
  const { request } = useBackend();
  const action = useAction();
  const [text, setText] = useState('');
  const path = session.draft.path as unknown as PathState;
  if (!path?.map) return <p role="alert">지도 데이터를 불러오지 못했어요.</p>;
  const ask = (value: string) =>
    action.run(async () => {
      await request(
        `activity-sessions/${session.sessionId}/path/teach`,
        json({ text: value, clientRevision: session.revision }),
      );
      setText('');
      await refresh();
    });
  return (
    <>
      <Message text={action.message} />
      <GridWorld
        map={path.map}
        tiki={
          path.lastRun
            ? { cell: path.lastRun.cell, heading: path.lastRun.heading }
            : { cell: path.map.start, heading: path.map.heading }
        }
        trail={path.lastRun?.cells ?? []}
        caption="티키에게 우체국까지 가는 길을 말해 주세요."
      />
      <ProgramView program={path.program ?? []} />
      <p>
        시도 {path.runs}번 · 도착 {path.wins}번
      </p>
      {path.turns?.map((v, i) => (
        <article key={i}>
          <strong>{v.text}</strong>
          <p>{v.reply}</p>
        </article>
      ))}
      {session.step.index === 0 && (
        <>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              void ask(text);
            }}
          >
            <label>
              티키에게 길 알려 주기
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
                placeholder="앞으로 두 칸, 오른쪽으로 돌아"
              />
            </label>
            <button className="btn light" disabled={action.busy || !text.trim()}>
              티키에게 말하기
            </button>
          </form>
          {path.clarify && (
            <>
              <p>{path.clarify.question}</p>
              {path.clarify.options.map((v) => (
                <button
                  className="btn light"
                  key={v.label}
                  disabled={action.busy}
                  onClick={() => void ask(v.label)}
                >
                  {v.label}
                </button>
              ))}
            </>
          )}
          <button
            className="btn light"
            disabled={action.busy || !path.program?.length}
            onClick={() =>
              void action.run(async () => {
                await request(
                  `activity-sessions/${session.sessionId}/path/run`,
                  json({ clientRevision: session.revision }),
                );
                await refresh();
              })
            }
          >
            티키 출발!
          </button>
        </>
      )}
      {path.lastRun && (
        <p>
          실행 결과:{' '}
          {
            (
              {
                arrived: '우체국에 도착했어요!',
                splashed: '웅덩이에 빠졌어요.',
                bumped: '벽에 부딪혔어요.',
                ended: '말한 순서가 끝났어요.',
                loop: '같은 길을 반복했어요.',
                tooLong: '너무 오래 움직였어요.',
              } as Record<string, string>
            )[path.lastRun.outcome]
          }
        </p>
      )}
    </>
  );
}
