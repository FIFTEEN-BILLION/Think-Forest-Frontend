import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  buildMessageRequest,
  canFinish,
  classifySendError,
  FIRST_GREETING_FIELDS,
  mergeMessages,
  profileDraftChips,
  progressValue,
  safeReturnTo,
  toLocalProfile,
} from '../api/v1/chat';
import { newIdempotencyKey, V1Error } from '../api/v1/client';
import {
  completeFirstGreeting,
  getFirstGreeting,
  sendFirstGreetingMessage,
  startFirstGreeting,
} from '../api/v1/endpoints';
import type {
  ChatMessage,
  FirstGreetingCompletion,
  FirstGreetingReadiness,
  FirstGreetingSession,
  NextInteraction,
  ProfileDraft,
  SendMessageRequest,
  SessionStatus,
} from '../api/v1/types';
import { useAuth } from '../providers/AuthProvider';
import { Button, Notice } from '../components/ui';
import { Icon } from '../components/Icon';
import { ChatThread, ChoiceButtons, ReadinessBar, useSpeechInput } from '../components/ServerChat';
import { useVillage } from '../providers/VillageProvider';

const interestOptions = [
  ['🦕', '공룡'],
  ['🚀', '우주'],
  ['🐶', '동물'],
  ['🌳', '식물'],
  ['⚽', '운동'],
  ['🎨', '만들기'],
  ['🎵', '음악'],
  ['📚', '이야기'],
] as const;
const goalOptions = [
  '내 생각의 이유 말하기',
  '궁금한 것 질문하기',
  '새로운 것 자세히 보기',
  '내 생각을 길게 표현하기',
];

type SessionView = {
  sessionId: string;
  status: SessionStatus;
  messages: ChatMessage[];
  profileDraft: ProfileDraft;
  readiness: FirstGreetingReadiness;
  interaction: NextInteraction | null;
};
type Pending = { request: SendMessageRequest; text: string; failed: boolean };

const fromSession = (session: FirstGreetingSession): SessionView => ({
  sessionId: session.sessionId,
  status: session.status,
  messages: mergeMessages([], session.messages),
  profileDraft: session.profileDraft,
  readiness: session.readiness,
  interaction: session.currentInteraction ?? null,
});

export function FirstTalkScreen() {
  const { update, toast } = useVillage();
  const { client, updateUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [session, setSession] = useState<SessionView | null>(null);
  const [loadError, setLoadError] = useState('');
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completion, setCompletion] = useState<FirstGreetingCompletion | null>(null);
  // StrictMode 에서 effect 가 두 번 돌아도 같은 키라 세션이 하나만 생긴다.
  const startKey = useRef(newIdempotencyKey());
  const completeKey = useRef(newIdempotencyKey());
  const { listening, listen } = useSpeechInput(setInput, toast, undefined, {
    questionId: session?.interaction?.questionId,
  });

  const applyLoad = useCallback(
    (request: Promise<FirstGreetingSession>, isActive: () => boolean = () => true) =>
      request.then(
        (loaded) => {
          if (!isActive()) return;
          setLoadError('');
          setSession(fromSession(loaded));
        },
        (error: unknown) => {
          // 401 은 가드가 로그인 화면으로 보낸다.
          if (!isActive() || (error instanceof V1Error && error.status === 401)) return;
          setLoadError(error instanceof Error ? error.message : '티키를 부르지 못했어요.');
        },
      ),
    [],
  );
  // 시작하거나 진행 중인 첫인사를 이어서 불러온다.
  useEffect(() => {
    let active = true;
    void applyLoad(startFirstGreeting(client, startKey.current), () => active);
    return () => {
      active = false;
    };
  }, [client, applyLoad]);
  const retryLoad = () => applyLoad(startFirstGreeting(client, startKey.current));

  /** 질문이 바뀌었거나 세션이 사라졌을 때 서버 상태로 다시 맞춘다. */
  const reload = async (sessionId: string) => {
    try {
      setSession(fromSession(await getFirstGreeting(client, sessionId)));
    } catch {
      startKey.current = newIdempotencyKey();
      await retryLoad();
    }
  };

  const finish = (result: FirstGreetingCompletion) => {
    update((previous) => ({
      ...previous,
      profile: toLocalProfile(result.profile, previous.profile),
      consent: {
        ...previous.consent,
        done: true,
        guardian: '보호자 계정과 연결',
        noticeAt: new Date().toISOString(),
      },
      // step is 0..3 in storage decode; 4 would make the saved data unreadable after reload.
      onboarding: { ...previous.onboarding, step: 3, acknowledged: true, childPolicy: true },
    }));
    updateUser({ needsFirstGreeting: false });
    setSession((current) => (current ? { ...current, status: 'COMPLETED' } : current));
    setCompletion(result);
  };

  const send = async (request: SendMessageRequest, text: string) => {
    if (!session) return;
    setSending(true);
    setNotice('');
    setPending({ request, text, failed: false });
    try {
      const response = await sendFirstGreetingMessage(client, session.sessionId, request);
      setSession((current) =>
        current
          ? {
              ...current,
              messages: mergeMessages(current.messages, [
                response.userMessage,
                response.assistantMessage,
              ]),
              profileDraft: response.profileDraft,
              readiness: response.readiness,
              status: response.status,
              interaction: response.nextInteraction,
            }
          : current,
      );
      setPending(null);
      setInput('');
      if (response.completion) finish(response.completion);
    } catch (error) {
      const failure = classifySendError(error);
      setNotice(failure.kind === 'signin' ? '' : failure.message);
      if (failure.kind === 'retry' || failure.kind === 'wait') {
        // 같은 clientMessageId 로 다시 보낼 수 있게 남겨 둔다.
        setPending({ request, text, failed: true });
      } else {
        setPending(null);
        if (failure.kind === 'reload') await reload(session.sessionId);
      }
    } finally {
      setSending(false);
    }
  };

  const submit = () => {
    const text = input.trim();
    if (!text) {
      toast('티키에게 하고 싶은 말을 알려 줘!');
      return;
    }
    if (pending?.failed && pending.text === text) {
      void send(pending.request, text);
      return;
    }
    const request = buildMessageRequest(newIdempotencyKey(), session?.interaction, { text });
    if (request) void send(request, text);
  };
  const choose = (optionId: string) => {
    const option = session?.interaction?.options.find((item) => item.id === optionId);
    const request = buildMessageRequest(newIdempotencyKey(), session?.interaction, { optionId });
    if (request && option) void send(request, option.label);
  };

  const complete = async () => {
    if (!session) return;
    setCompleting(true);
    setNotice('');
    try {
      finish(await completeFirstGreeting(client, session.sessionId, 'BUTTON', completeKey.current));
    } catch (error) {
      const failure = classifySendError(error);
      // 일시 실패만 같은 키로 다시 시도한다. 그 밖의 응답은 새 키로 다시 판단받는다.
      if (failure.kind !== 'retry') completeKey.current = newIdempotencyKey();
      if (failure.kind === 'reload') await reload(session.sessionId);
      if (failure.kind !== 'signin') setNotice(failure.message);
    } finally {
      setCompleting(false);
    }
  };

  const addSuggestion = (text: string) =>
    setInput((current) => (current.includes(text) ? current : `${current} ${text}`.trim()));

  const draft = session?.profileDraft;
  const name = draft?.nickname || completion?.profile.nickname || '나';
  const progress = completion ? 100 : progressValue(session?.readiness);
  const chips = profileDraftChips(draft);
  const nextMissing = session?.readiness.missing[0];
  const busy = sending || completing;
  const ready = session ? canFinish(session.readiness, session.status) : false;
  const choice = session?.interaction?.type === 'SINGLE_CHOICE' ? session.interaction : null;

  return (
    <div className="first-talk-page adaptive-intro">
      <header className="first-talk-head">
        <Link to="/" className="icon-btn" aria-label="홈으로">
          <Icon name="close" />
        </Link>
        <div>
          <span>티키와 첫 인사</span>
          <small>티키가 네 이야기를 듣고 궁금한 것을 물어봐요</small>
        </div>
        <span className="tag teal">자유 대화</span>
      </header>
      <div className="first-talk-stage">
        <section className="first-buddy">
          <div className="first-buddy-face">🌱</div>
          <strong>생각친구 티키</strong>
          <p>{listening ? '네 이야기를 듣는 중…' : '네가 말한 것을 잘 기억할게!'}</p>
          <ReadinessBar value={progress} label="티키가 너를 알아 가는 정도" />
          <div className="extract-status">
            {FIRST_GREETING_FIELDS.map((field) => {
              const done =
                !!completion || (!!session && !session.readiness.missing.includes(field.key));
              return (
                <span className={done ? 'done' : ''} key={field.key}>
                  {field.label}
                </span>
              );
            })}
          </div>
          {chips.length > 0 && (
            <div className="draft-chips" aria-label="티키가 기억한 것">
              {chips.map((chip) => (
                <span className="chip" key={chip.key} title={chip.label}>
                  {chip.value}
                </span>
              ))}
            </div>
          )}
        </section>
        <section className="first-chat">
          <div className="chat-title">
            <div>
              <span>🌱</span>
              <div>
                <strong>생각친구 티키</strong>
                <small>첫 인사를 나누는 중</small>
              </div>
            </div>
            <span className="online-dot">지금 접속 중</span>
          </div>
          {!session ? (
            <div className="first-conversation-thread adaptive-thread" role="status">
              {loadError ? (
                <Notice variant="error">
                  {loadError}
                  <div className="actions">
                    <Button className="light small" onClick={() => void retryLoad()}>
                      다시 불러오기
                    </Button>
                  </div>
                </Notice>
              ) : (
                <p className="muted">티키를 부르고 있어요…</p>
              )}
            </div>
          ) : (
            <ChatThread
              variant="first"
              messages={session.messages}
              childName={name}
              pendingText={pending?.text}
              pendingFailed={pending?.failed}
              thinking={sending}
            />
          )}
          {completion ? (
            <div className="first-answer">
              <div className="profile-confirm">
                <span className="profile-confirm-avatar">{name.slice(0, 1) || '🌱'}</span>
                <div>
                  <strong>{name}의 생각 프로필</strong>
                  <p>{completion.profile.gradeOrAgeBand}</p>
                </div>
                <dl>
                  <dt>좋아하는 것</dt>
                  <dd>{completion.profile.interests.join(' · ')}</dd>
                  <dt>더 알게 된 것</dt>
                  <dd>{completion.profile.interestDetails.join(' · ')}</dd>
                  <dt>키우고 싶은 힘</dt>
                  <dd>{completion.profile.growthGoal}</dd>
                </dl>
                {completion.summary && <p>{completion.summary}</p>}
              </div>
            </div>
          ) : (
            session && (
              <div className="adaptive-composer">
                {notice && (
                  <div role="alert">
                    <Notice variant="error">{notice}</Notice>
                  </div>
                )}
                {choice ? (
                  <ChoiceButtons options={choice.options} disabled={busy} onChoose={choose} />
                ) : (
                  <>
                    {nextMissing === 'INTEREST' && (
                      <div className="intro-suggestions">
                        {interestOptions.map(([emoji, label]) => (
                          <button
                            type="button"
                            className={input.includes(label) ? 'selected' : ''}
                            onClick={() => addSuggestion(label)}
                            key={label}
                          >
                            {emoji} {label}
                          </button>
                        ))}
                      </div>
                    )}
                    {nextMissing === 'GROWTH_GOAL' && (
                      <div className="goal-suggestions">
                        {goalOptions.map((option) => (
                          <button type="button" onClick={() => setInput(option)} key={option}>
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className={`intro-input ${listening ? 'is-listening' : ''}`}>
                      <textarea
                        autoFocus
                        value={input}
                        maxLength={1000}
                        onChange={(event) => setInput(event.target.value)}
                        placeholder={
                          session.messages.length <= 1
                            ? '예: 나는 지우야. 2학년이고 공룡을 좋아해!'
                            : '티키에게 편하게 말해 줘…'
                        }
                      />
                      <button
                        type="button"
                        className={listening ? 'active' : ''}
                        onClick={listen}
                        aria-label="음성으로 말하기"
                      >
                        <Icon name={listening ? 'pause' : 'mic'} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          )}
          <div className="conversation-actions">
            {completion ? (
              <>
                <span className="adaptive-help">설정에서 언제든 바꿀 수 있어요.</span>
                <Button onClick={() => navigate(safeReturnTo(params.get('next'), '/talk'))}>
                  좋아! 첫 이야기 시작 <Icon name="arrow" />
                </Button>
              </>
            ) : (
              <>
                <span className="adaptive-help">
                  {ready
                    ? '티키가 너를 잘 알게 됐어요. 더 이야기해도 좋아요.'
                    : '길게 말해도, 짧게 말해도 괜찮아요.'}
                </span>
                <Button
                  className="light"
                  disabled={!ready || busy}
                  onClick={() => void complete()}
                  title={ready ? undefined : '조금 더 이야기하면 마칠 수 있어요'}
                >
                  {completing ? '정리하는 중…' : '첫인사 마치기'}
                </Button>
                {!choice && (
                  <Button
                    disabled={!session || busy || listening || !input.trim()}
                    onClick={submit}
                  >
                    {pending?.failed && pending.text === input.trim()
                      ? '다시 보내기'
                      : '티키에게 말하기'}{' '}
                    <Icon name="arrow" />
                  </Button>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
