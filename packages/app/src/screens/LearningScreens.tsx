import { useConversation } from '../hooks/useConversation';
import type { ChatMessage, ChatSession } from '../types/conversation';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { json } from '../api/requestOptions';
import { useAction, useServerQuery } from '../hooks/useServerApi';
import { useBackend } from '../providers/BackendProvider';
import { Message, Wait } from '../components/QueryFeedback';
import type { Page } from './ReaderScreens';
import { VoiceInput } from '../components/VoiceInput';
import { Simulation, StageArt } from '../components/Simulation';

export function ServerTalk({ greeting = false }: { greeting?: boolean }) {
  const backend = useBackend();
  const action = useAction();
  const reading = useAction({ invalidate: false });
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const existing = params.get('session');
  const topic = params.get('topic') ?? 'topic_ice_cup';
  const pendingMessage = useRef<{ text: string; key: string } | null>(null);
  const playback = useRef<{ player: HTMLAudioElement; url: string } | null>(null);
  const mounted = useRef(true);
  const voiceSettings = useServerQuery<{ settings: { ttsEnabled: boolean } }>(
    backend.me?.profile ? `profiles/${backend.me.profile.id}/settings` : null,
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (playback.current) {
        playback.current.player.pause();
        URL.revokeObjectURL(playback.current.url);
        playback.current = null;
      }
    };
  }, []);
  const [text, setText] = useState('');
  const prefix = greeting ? 'first-greeting/sessions' : 'conversations';
  const conversation = useConversation({ greeting, existing, topic });
  if (!conversation.data) return <Wait error={conversation.error} retry={conversation.retry} />;
  const session = conversation.data;
  const id = session.sessionId ?? session.conversationId!;
  const messages = session.messages ?? (session.assistantMessage ? [session.assistantMessage] : []);
  const interaction =
    session.nextInteraction !== undefined ? session.nextInteraction : session.currentInteraction;
  const send = (input: { type: string; text?: string; optionId?: string }) =>
    action.run(async () => {
      const signature = JSON.stringify({ input, questionId: interaction?.questionId });
      if (pendingMessage.current?.text !== signature)
        pendingMessage.current = { text: signature, key: crypto.randomUUID() };
      const result = await backend.request<ChatSession>(
        `${prefix}/${id}/messages`,
        json({
          clientMessageId: pendingMessage.current.key,
          questionId: interaction?.questionId,
          input,
        }),
      );
      pendingMessage.current = null;
      conversation.setData({
        ...session,
        ...result,
        messages: [
          ...messages,
          ...[result.userMessage, result.assistantMessage].filter((m): m is ChatMessage => !!m),
        ],
      });
      setText('');
      if (result.completion) {
        sessionStorage.removeItem(`jjcp-active-${backend.me?.user.id}-${prefix}-${topic}`);
        await backend.refreshMe();
        if (result.completion.story) navigate(`/shelf/${result.completion.story.id}`);
      }
    });
  const complete = () =>
    action.run(async () => {
      const result = await backend.request<{ story?: { id: string } }>(
        `${prefix}/${id}/complete`,
        json({ trigger: 'BUTTON' }),
      );
      await backend.refreshMe();
      sessionStorage.removeItem(`jjcp-active-${backend.me?.user.id}-${prefix}-${topic}`);
      navigate(result.story ? `/shelf/${result.story.id}` : '/');
    });
  return (
    <div className="server-chat">
      <header className="page-head">
        <h1>{greeting ? '티키와 첫 인사' : (session.topic?.title ?? '티키와 이야기')}</h1>
        <p>네 생각을 천천히 들려줘. 말한 내용은 확인한 뒤 보낼 수 있어.</p>
      </header>
      <Message text={action.message || reading.message} />
      {session.nextCursor && (
        <button
          disabled={reading.busy || action.busy}
          onClick={() =>
            void reading.run(async () => {
              const result = await backend.request<ChatSession>(
                `${prefix}/${id}?messageCursor=${encodeURIComponent(session.nextCursor!)}`,
              );
              const unique = new Map(
                [...(result.messages ?? []), ...messages].map((m) => [m.id, m]),
              );
              conversation.setData({
                ...session,
                messages: [...unique.values()],
                nextCursor: result.nextCursor,
              });
            })
          }
        >
          대화 더 불러오기
        </button>
      )}
      <div className="server-thread" aria-live="polite">
        {messages.map((m) => (
          <article className={`server-bubble ${m.role === 'USER' ? 'mine' : ''}`} key={m.id}>
            <small>
              {m.role === 'USER' ? '나' : '티키'}
              {m.source === 'fallback' ? ' · 준비된 안내' : ''}
            </small>
            <p>{m.content}</p>
            {m.role === 'ASSISTANT' && (
              <button
                disabled={
                  reading.busy || action.busy || voiceSettings.data?.settings.ttsEnabled === false
                }
                onClick={() =>
                  void reading.run(async () => {
                    const audio = await backend.request<Blob>('speech/synthesis', {
                      ...json({ conversationId: id, messageId: m.id }),
                      headers: { ...json({}).headers, Accept: 'audio/mpeg' },
                    });
                    if (!mounted.current) return;
                    if (playback.current) {
                      playback.current.player.pause();
                      URL.revokeObjectURL(playback.current.url);
                    }
                    const url = URL.createObjectURL(audio);
                    const player = new Audio(url);
                    playback.current = { player, url };
                    player.onended = () => URL.revokeObjectURL(url);
                    player.onerror = () => URL.revokeObjectURL(url);
                    try {
                      await player.play();
                    } catch (error) {
                      URL.revokeObjectURL(url);
                      throw error;
                    }
                  })
                }
              >
                소리로 듣기
              </button>
            )}
          </article>
        ))}
      </div>
      {session.status !== 'COMPLETED' ? (
        <section className="panel server-composer">
          {interaction?.type === 'SINGLE_CHOICE' ? (
            <div className="choice-row">
              {interaction.options.map((option) => (
                <button
                  className="chip"
                  disabled={action.busy}
                  key={option.id}
                  onClick={() => void send({ type: 'SINGLE_CHOICE', optionId: option.id })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <>
              <label>
                내 생각
                <textarea
                  value={text}
                  rows={4}
                  maxLength={1000}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="내 생각에는…"
                />
              </label>
              <VoiceInput
                key={`${id}-${interaction?.questionId ?? ''}`}
                sessionId={id}
                questionId={interaction?.questionId}
                onText={setText}
              />
              <button
                className="btn"
                disabled={action.busy || !text.trim()}
                onClick={() => void send({ type: 'TEXT', text })}
              >
                내 생각 보내기
              </button>
            </>
          )}
          <div className="row between">
            <span>이야기 진행 {session.readiness.progress}%</span>
            <button
              className="btn light"
              disabled={action.busy || !session.readiness.ready}
              onClick={() => void complete()}
            >
              {greeting ? '첫 인사 마치기' : '이야기 완성하기'}
            </button>
          </div>
          {!greeting && (
            <button
              disabled={action.busy}
              onClick={() => {
                if (window.confirm('이 대화를 그만둘까요?'))
                  void action.run(async () => {
                    await backend.request(`conversations/${id}/cancel`, json({}));
                    sessionStorage.removeItem(
                      `jjcp-active-${backend.me?.user.id}-${prefix}-${topic}`,
                    );
                    navigate('/');
                  });
              }}
            >
              대화 그만두기
            </button>
          )}
        </section>
      ) : (
        <section className="panel">
          <h2>이야기를 마쳤어요.</h2>
          <Link className="btn" to={session.storyId ? `/shelf/${session.storyId}` : '/shelf'}>
            저장된 기록 보기
          </Link>
          <Link className="btn light" to="/">
            홈으로
          </Link>
        </section>
      )}
    </div>
  );
}

interface Activity {
  id: string;
  title: string;
  track: string;
  rulesVersion: number;
  description?: string;
  steps: {
    id: string;
    title?: string;
    prompt?: string;
    requiredFields: string[];
    minLength?: number;
  }[];
  assets: string[];
}
interface ActivitySession {
  id: string;
  activityId: string;
  status: string;
  step: string;
  state: Record<string, unknown>;
  revision: number;
}

export function ServerAdventures() {
  const [, , track, activityId] = useLocation().pathname.split('/');
  const backend = useBackend();
  const action = useAction();
  const navigate = useNavigate();
  const catalog = useServerQuery<Page<Activity>>(
    `activities${track ? `?track=${track.toUpperCase()}` : ''}`,
  );
  const detail = useServerQuery<{ activity: Activity }>(
    activityId ? `activities/${activityId}` : null,
  );
  if (activityId) {
    if (!detail.data) return <Wait error={detail.error} retry={detail.refetch} />;
    const activity = detail.data.activity;
    return (
      <section className="panel">
        <Link to="/adventures">← 생각 모험</Link>
        <h1>{activity.title}</h1>
        <p>{activity.description}</p>
        <ol>
          {activity.steps.map((s) => (
            <li key={s.id}>{s.title ?? s.id}</li>
          ))}
        </ol>
        <Message text={action.message} />
        <button
          className="btn"
          disabled={action.busy}
          onClick={() =>
            void action.run(async () => {
              const r = await backend.request<{ session: ActivitySession }>(
                'activity-sessions',
                json({ activityId }),
              );
              navigate(
                `/session/${activity.track.toLowerCase()}?session=${r.session.id}&activity=${activityId}`,
              );
            })
          }
        >
          모험 시작하기
        </button>
      </section>
    );
  }
  return (
    <>
      <header className="page-head">
        <h1>오늘의 생각 모험</h1>
        <p>관찰하고, 비교하고, 마음을 나누어요.</p>
      </header>
      <div className="row wrap">
        {[
          ['forest', '생각의 숲'],
          ['lab', '호기심 실험실'],
          ['theater', '마음극장'],
        ].map(([id, label]) => (
          <Link className="chip" to={`/adventures/${id}`} key={id}>
            {label}
          </Link>
        ))}
      </div>
      {!catalog.data ? (
        <Wait error={catalog.error} retry={catalog.refetch} />
      ) : (
        <div className="server-grid">
          {catalog.data.items.map((activity) => (
            <Link
              className="panel server-card"
              to={`/adventures/${activity.track.toLowerCase()}/${activity.id}`}
              key={activity.id}
            >
              <h2>{activity.title}</h2>
              <p>{activity.description}</p>
              <small>{activity.steps.length}단계 모험 →</small>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

const fieldLabels: Record<string, string> = {
  prediction: '처음 예상',
  observation: '관찰한 사실',
  reason: '그렇게 생각한 이유',
  reflection: '새롭게 알게 된 점',
  feeling: '친구의 마음',
  response: '내가 건네고 싶은 말',
  question: '더 알아보고 싶은 질문',
  observationA: '첫 번째 관찰',
  observationB: '두 번째 관찰',
};
export function ServerActivity() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session');
  const backend = useBackend();
  const action = useAction();
  const navigate = useNavigate();
  const q = useServerQuery<{ session: ActivitySession }>(
    sessionId ? `activity-sessions/${sessionId}` : null,
  );
  const resumes = useServerQuery<Page<ActivitySession>>(
    !sessionId ? 'activity-sessions?status=ACTIVE' : null,
  );
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [value, setValue] = useState(50);
  const session = q.data?.session;
  const activity = useServerQuery<{ activity: Activity }>(
    session ? `activities/${session.activityId}` : null,
  );
  if (!sessionId)
    return (
      <section className="panel">
        <h1>이어갈 모험을 선택해 주세요.</h1>
        {!resumes.data ? (
          <Wait error={resumes.error} retry={resumes.refetch} />
        ) : (
          resumes.data.items.map((s) => (
            <p key={s.id}>
              <Link to={`${location.pathname}?session=${s.id}`}>저장한 모험 이어하기</Link>
            </p>
          ))
        )}
        <Link className="btn" to="/adventures">
          모험 고르기
        </Link>
      </section>
    );
  if (!session || !activity.data)
    return (
      <Wait
        error={q.error ?? activity.error}
        retry={() => {
          void q.refetch();
          void activity.refetch();
        }}
      />
    );
  const definition = activity.data.activity;
  const step = definition.steps.find((s) => s.id === session.step)!;
  const index = definition.steps.indexOf(step);
  const last = index === definition.steps.length - 1;
  const save = async () => {
    let current = session;
    for (const field of step.requiredFields) {
      if (draft[field] === undefined) continue;
      current = (
        await backend.request<{ session: ActivitySession }>(
          `activity-sessions/${sessionId}`,
          json(
            {
              clientRevision: current.revision,
              event: { type: 'SET_FIELD', field, value: draft[field] },
            },
            'PATCH',
          ),
        )
      ).session;
      q.setData({ session: current });
    }
    setDraft({});
    return current;
  };
  return (
    <section className="panel server-detail">
      <Link to="/adventures">← 생각 모험</Link>
      <h1>{definition.title}</h1>
      <p>
        {index + 1} / {definition.steps.length} · {step.title}
      </p>
      <h2>{step.prompt}</h2>
      <Message text={action.message} />
      {definition.track === 'LAB' &&
        ['shadow', 'balance', 'first-inquiry'].includes(definition.id) && (
          <div className="simulation">
            <Simulation
              lab={{
                mode: definition.id === 'balance' ? 'balance' : 'shadow',
                value,
                topic: '',
                low: false,
                high: false,
                a: '',
                b: '',
                source: '',
                prediction: '',
              }}
            />
            <label>
              조건 바꾸기
              <input
                type="range"
                min={10}
                max={100}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
              />
            </label>
          </div>
        )}
      {definition.track === 'THEATER' && <StageArt scene={index} activityId={definition.id} />}
      {step.requiredFields.map((field) => (
        <label key={field}>
          {fieldLabels[field] ?? '내 생각'}
          <textarea
            rows={4}
            maxLength={2000}
            value={draft[field] ?? String(session.state[field] ?? '')}
            onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
          />
        </label>
      ))}
      {session.status === 'ACTIVE' ? (
        <div className="row wrap">
          <button
            className="btn light"
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                await save();
                action.setMessage('입력 내용을 저장했어요.');
              })
            }
          >
            잠시 저장
          </button>
          <button
            className="btn"
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                const current = await save();
                if (last) {
                  const r = await backend.request<{ recordId: string }>(
                    `activity-sessions/${sessionId}/complete`,
                    json({ clientRevision: current.revision }),
                  );
                  navigate(`/complete/${r.recordId}`);
                } else {
                  const r = await backend.request<{ session: ActivitySession }>(
                    `activity-sessions/${sessionId}/advance`,
                    json({ clientRevision: current.revision }),
                  );
                  q.setData({ session: r.session });
                }
              })
            }
          >
            {last ? '모험 완성하기' : '다음 단계로'}
          </button>
          <button
            disabled={action.busy}
            onClick={() => {
              if (window.confirm('이 모험을 그만둘까요?'))
                void action.run(async () => {
                  await backend.request(`activity-sessions/${sessionId}`, {
                    method: 'DELETE',
                    headers: { 'If-Match': `"${session.revision}"` },
                  });
                  navigate('/adventures');
                });
            }}
          >
            모험 그만두기
          </button>
        </div>
      ) : (
        <Link className="btn" to="/shelf">
          완성한 기록 보기
        </Link>
      )}
    </section>
  );
}
