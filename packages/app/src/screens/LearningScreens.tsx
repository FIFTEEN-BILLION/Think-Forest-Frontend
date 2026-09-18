import { confirmAction } from '../components/dialogs';
import { useConversation } from '../hooks/useConversation';
import type { ChatMessage, ChatSession } from '../types/conversation';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage, json } from '../api/requestOptions';
import { ApiError } from '../api/client';
import { safeReturnTo } from '../api/v1/chat';
import { useAction, useServerQuery } from '../hooks/useServerApi';
import { useBackend } from '../providers/BackendProvider';
import { Message, Wait } from '../components/QueryFeedback';
import { Icon } from '../components/Icon';
import { ReadinessBar } from '../components/ServerChat';
import { VoiceInput } from '../components/VoiceInput';
import type { Model } from '../api/schema';
import { Navigate } from 'react-router-dom';
import { ApiActivity, ActivityCatalog } from './ActivityScreens';

export function ServerTalk({ greeting = false }: { greeting?: boolean }) {
  const location = useLocation();
  const backend = useBackend();
  if (
    greeting &&
    !backend.me?.user.needsFirstGreeting &&
    !new URLSearchParams(location.search).has('sessionId')
  )
    return <Navigate replace to={safeReturnTo(new URLSearchParams(location.search).get('next'))} />;
  return <TalkSession key={`${location.pathname}${location.search}`} greeting={greeting} />;
}
function TalkSession({ greeting }: { greeting: boolean }) {
  const backend = useBackend();
  const action = useAction();
  const reading = useAction({ invalidate: false });
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const existing =
    params.get('session') ??
    params.get('conversationId') ??
    (greeting ? params.get('sessionId') : null);
  const topic = params.get('topic') ?? params.get('topicId') ?? 'topic_ice_cup';
  const returnTo = safeReturnTo(params.get('next'));
  const pendingMessage = useRef<{ text: string; key: string } | null>(null);
  const playback = useRef<{ player: HTMLAudioElement; url: string } | null>(null);
  const mounted = useRef(true);
  const voiceSettings = useServerQuery<Model<'SettingsResponse'>>(
    backend.profileId ? `profiles/${backend.profileId}/settings` : null,
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
  const [outgoing, setOutgoing] = useState<{
    content: string;
    input: { type: string; text?: string; optionId?: string };
    status: 'sending' | 'failed';
    warning?: string;
  } | null>(null);
  const thread = useRef<HTMLDivElement>(null);
  const [wordMessage, setWordMessage] = useState<string | null>(null);
  const [word, setWord] = useState('');
  const prefix = greeting ? 'first-greeting/sessions' : 'conversations';
  const conversation = useConversation({ greeting, existing, topic });
  const lastMessageId =
    conversation.data?.messages?.at(-1)?.id ?? conversation.data?.assistantMessage?.id;
  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: 'smooth' });
  }, [lastMessageId, outgoing]);
  const completedStory = useServerQuery<{ story: { title: string; body: string } }>(
    conversation.data?.status === 'COMPLETED' && conversation.data.storyId
      ? `stories/${conversation.data.storyId}`
      : null,
  );
  if (!greeting && backend.me?.user.needsFirstGreeting)
    return (
      <Navigate
        replace
        to={`/first-talk?next=${encodeURIComponent(location.pathname + location.search)}`}
      />
    );
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
      const content =
        input.text?.trim() ??
        interaction?.options.find((o) => o.id === input.optionId)?.label ??
        '';
      setOutgoing({ content, input, status: 'sending' });
      setText('');
      let result: ChatSession;
      try {
        result = await backend.request<ChatSession>(
          `${prefix}/${id}/messages`,
          json({
            clientMessageId: pendingMessage.current.key,
            questionId: interaction?.questionId,
            input,
          }),
        );
      } catch (error) {
        const warning =
          error instanceof ApiError && error.status === 422
            ? `입력 내용을 확인해 주세요. ${errorMessage(error)}`
            : errorMessage(error);
        setOutgoing({ content, input, status: 'failed', warning });
        if (input.text) setText((draft) => draft || input.text!);
        throw error;
      }
      pendingMessage.current = null;
      conversation.setData((previous) => ({
        ...(previous ?? session),
        ...result,
        messages: [
          ...new Map(
            [
              ...(previous?.messages ?? messages),
              ...[result.userMessage, result.assistantMessage].filter((m): m is ChatMessage => !!m),
            ].map((message) => [message.id, message]),
          ).values(),
        ],
      }));
      setOutgoing(null);
      if (result.completion) {
        sessionStorage.removeItem(`jjcp-active-${backend.scopeId}-${prefix}-${topic}`);
        await backend.refreshMe();
        if (greeting) navigate(returnTo);
        else if (result.completion.story) navigate(`/shelf/${result.completion.story.id}`);
      }
    });
  const complete = () =>
    action.run(async () => {
      if (greeting && session.profileDraft) {
        const draft = session.profileDraft;
        if (
          !(await confirmAction(
            `마지막으로 확인할게!\n이름(별명): ${draft.nickname ?? '미입력'}\n소속: ${draft.schoolOrGroup ?? draft.gradeOrAgeBand ?? '아직 알려주지 않음'}\n좋아하는 것: ${draft.interests.join(', ')}\n이렇게 기억하면 될까?`,
          ))
        )
          return;
      }
      const result = await backend.request<{ story?: { id: string } }>(
        `${prefix}/${id}/complete`,
        json({ trigger: 'BUTTON' }),
      );
      await backend.refreshMe();
      sessionStorage.removeItem(`jjcp-active-${backend.scopeId}-${prefix}-${topic}`);
      navigate(greeting ? returnTo : result.story ? `/shelf/${result.story.id}` : '/');
    });
  return (
    <div
      className={`server-chat ${greeting ? 'first-talk-page adaptive-intro' : 'conversation-page'}`}
    >
      <header className="first-talk-head">
        <Link to="/" className="icon-btn" aria-label="홈으로">
          <Icon name="close" />
        </Link>
        <div>
          <strong>{greeting ? '티키와 첫 인사' : (session.topic?.title ?? '티키와 이야기')}</strong>
          <small>말로 해도, 글로 써도 괜찮아. 네 생각을 들려줘.</small>
        </div>
        <span className="tag teal">생각 나누기</span>
      </header>
      <div className="first-talk-stage">
        <aside className="first-buddy">
          <div className="first-buddy-face" aria-hidden="true">
            🌱
          </div>
          <strong>생각친구 티키</strong>
          <p>
            {outgoing?.status === 'sending'
              ? '네 이야기를 생각하는 중…'
              : '작은 생각도 소중하게 들을게!'}
          </p>
          {greeting ? (
            <div className="extract-status">
              <span className={session.profileDraft?.nickname ? 'done' : ''}>이름·별명</span>
              <span className={session.profileDraft?.gradeOrAgeBand ? 'done' : ''}>소속·학년</span>
              <span className={session.profileDraft?.interests.length ? 'done' : ''}>
                좋아하는 것
              </span>
            </div>
          ) : (
            <div className="extract-status">
              <strong>지금 나누는 이야기</strong>
              <p>{session.topic?.title}</p>
              <Link className="home-text-link" to="/words">
                단어 보관함 <Icon name="arrow" />
              </Link>
            </div>
          )}
          <ReadinessBar value={session.readiness.progress} label="이야기 진행" />
        </aside>
        <section className="first-chat">
          <div className="chat-title">
            <div>
              <span aria-hidden="true">🌱</span>
              <div>
                <strong>생각친구 티키</strong>
                <small>{greeting ? '첫 인사를 나누는 중' : '함께 생각하는 중'}</small>
              </div>
            </div>
          </div>
          <Message
            text={
              outgoing?.status === 'failed' ? reading.message : action.message || reading.message
            }
          />
          {session.nextCursor && (
            <button
              className="btn light"
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
          <div
            className="server-thread first-conversation-thread adaptive-thread"
            role="log"
            aria-label="티키와 나눈 대화"
            aria-live="polite"
            ref={thread}
          >
            {messages.map((m) => (
              <article className={`server-bubble ${m.role === 'USER' ? 'mine' : ''}`} key={m.id}>
                <span
                  className={`message-avatar ${m.role === 'USER' ? 'child-avatar' : ''}`}
                  aria-hidden="true"
                >
                  {m.role === 'USER' ? (backend.me?.profile?.nickname?.slice(0, 1) ?? '나') : '🌱'}
                </span>
                <div className="server-bubble-content">
                  <small className="message-name">
                    {m.role === 'USER' ? '나' : '티키'}
                    {m.source === 'fallback' ? ' · 준비된 안내' : ''}
                  </small>
                  <p>{m.content}</p>
                  {m.role === 'ASSISTANT' &&
                    !greeting &&
                    (wordMessage === m.id ? (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          void action.run(async () => {
                            await backend.request<Model<'WordbookEntryResponse'>>(
                              'wordbook/entries',
                              json({ word: word.trim(), conversationId: id, messageId: m.id }),
                            );
                            setWordMessage(null);
                            setWord('');
                            action.setMessage('단어 보관함에 담았어요.');
                          });
                        }}
                      >
                        <label>
                          보관할 단어
                          <input
                            autoFocus
                            value={word}
                            onChange={(e) => setWord(e.target.value)}
                            maxLength={30}
                            required
                          />
                        </label>
                        <button className="btn light" disabled={action.busy || !word.trim()}>
                          단어 저장
                        </button>
                        <button
                          className="btn light"
                          type="button"
                          onClick={() => setWordMessage(null)}
                        >
                          취소
                        </button>
                      </form>
                    ) : (
                      <button
                        className="btn light"
                        disabled={action.busy}
                        onClick={async () => {
                          setWordMessage(m.id);
                          setWord('');
                        }}
                      >
                        단어 담기
                      </button>
                    ))}
                  {m.role === 'ASSISTANT' && (
                    <button
                      className="server-listen btn light"
                      disabled={
                        reading.busy ||
                        action.busy ||
                        voiceSettings.data?.settings.ttsEnabled === false ||
                        voiceSettings.data?.settings.voiceEnabled === false
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
                      <Icon name="sound" /> 소리로 듣기
                    </button>
                  )}
                </div>
              </article>
            ))}
            {outgoing && (
              <article className="server-bubble mine">
                <span className="message-avatar child-avatar" aria-hidden="true">
                  나
                </span>
                <div className="server-bubble-content">
                  <small>
                    나 · {outgoing.status === 'sending' ? '보내는 중' : '전송되지 않음'}
                  </small>
                  <p>{outgoing.content}</p>
                  {outgoing.status === 'failed' && (
                    <div className="chat-warning" role="alert">
                      <p>{outgoing.warning}</p>
                      <p>입력란에서 문장을 고쳐 다시 보낼 수 있어요.</p>
                      <button
                        className="btn light"
                        disabled={action.busy}
                        onClick={() => void send(outgoing.input)}
                      >
                        다시 보내기
                      </button>
                    </div>
                  )}
                </div>
              </article>
            )}
            {outgoing?.status === 'sending' && (
              <article className="server-bubble server-reply-loading" role="status">
                <span className="message-avatar" aria-hidden="true">
                  🌱
                </span>
                <div className="server-bubble-content">
                  <small>티키</small>
                  <p>
                    <span className="chat-loading-dots" aria-hidden="true">
                      ● ● ●
                    </span>{' '}
                    답변을 생각하고 있어요…
                  </p>
                </div>
              </article>
            )}
          </div>
          {session.status !== 'COMPLETED' ? (
            <section className="server-composer first-answer">
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
                      rows={2}
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
                    disabled={action.busy}
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
                {!(greeting && interaction?.options.some((o) => o.id === 'CONFIRM_PROFILE')) && (
                  <button
                    className="btn light"
                    disabled={action.busy || !session.readiness.ready}
                    onClick={() => void complete()}
                  >
                    {greeting ? '첫 인사 마치기' : '이야기 완성하기'}
                  </button>
                )}
              </div>
              {!greeting && (
                <button
                  className="btn light"
                  disabled={action.busy}
                  onClick={async () => {
                    if (await confirmAction('이 대화를 그만둘까요?'))
                      void action.run(async () => {
                        await backend.request(`conversations/${id}/cancel`, json({}));
                        sessionStorage.removeItem(
                          `jjcp-active-${backend.scopeId}-${prefix}-${topic}`,
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
              {session.storyId &&
                (completedStory.data ? (
                  <article>
                    <h3>{completedStory.data.story.title}</h3>
                    <p>{completedStory.data.story.body}</p>
                  </article>
                ) : (
                  <Wait error={completedStory.error} retry={completedStory.refetch} />
                ))}
              {greeting && (
                <Link className="btn" to={returnTo}>
                  이어서 시작하기
                </Link>
              )}
              <Link className="btn" to={session.storyId ? `/shelf/${session.storyId}` : '/shelf'}>
                저장된 기록 보기
              </Link>
              <Link className="btn light" to="/">
                홈으로
              </Link>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}

export function ServerFirstTalk() {
  return <ServerTalk greeting />;
}
export const ServerAdventures = ActivityCatalog;
export const ServerActivity = ApiActivity;
