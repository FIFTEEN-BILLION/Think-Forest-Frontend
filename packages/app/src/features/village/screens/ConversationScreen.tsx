import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  buildMessageRequest,
  canFinish,
  classifySendError,
  DIMENSIONS,
  isOpenStatus,
  mergeMessages,
  progressValue,
} from '../../../api/v1/chat';
import { newIdempotencyKey, V1Error } from '../../../api/v1/client';
import {
  cancelConversation,
  completeConversation,
  getConversation,
  getHome,
  listConversations,
  listTopics,
  sendConversationMessage,
  startConversation,
} from '../../../api/v1/endpoints';
import type {
  ChatMessage,
  ConversationDetail,
  ConversationListItem,
  ConversationReadiness,
  Dimension,
  NextInteraction,
  SendMessageRequest,
  SessionStatus,
  Story,
  TopicSummary,
} from '../../../api/v1/types';
import { useAuth } from '../../../providers/AuthProvider';
import { Icon } from '../components/Icon';
import { ChatThread, ChoiceButtons, ReadinessBar, useSpeechInput } from '../components/ServerChat';
import { Button, Notice } from '../components/ui';
import { useVillage } from '../state/VillageProvider';

const CATEGORIES: Record<string, [emoji: string, label: string]> = {
  SCIENCE: ['🧪', '과학'],
  NATURE: ['🌳', '자연'],
  FEELINGS: ['💛', '마음'],
  IMAGINATION: ['✨', '상상'],
  DAILY_LIFE: ['🏠', '내 일상'],
  MATH: ['🔢', '수학'],
  HISTORY: ['🏛️', '역사'],
};
const category = (key?: string | null) => CATEGORIES[key ?? ''] ?? ['💬', '이야기'];
const cardColors = ['mint', 'sky', 'lavender'];
const dimensionLabel = (key: Dimension) => DIMENSIONS.find((d) => d.key === key)?.label ?? key;
const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/** 티키와 이야기: 주제 고르기·이어하기 ↔ 대화. 대화 id 는 주소에 둬서 새로고침해도 이어진다. */
export function ConversationScreen() {
  const [params, setParams] = useSearchParams();
  const conversationId = params.get('conversationId');
  if (conversationId)
    return (
      <ConversationChat
        key={conversationId}
        conversationId={conversationId}
        onExit={() => setParams({}, { replace: true })}
      />
    );
  return (
    <TopicPicker
      topicId={params.get('topicId')}
      onOpen={(id) => setParams({ conversationId: id }, { replace: true })}
      onClearTopic={() => setParams({}, { replace: true })}
    />
  );
}

type TopicCard = {
  id: string;
  title: string;
  category: string;
  reason?: string | null;
  minutes?: number | null;
};

function TopicPicker({
  topicId,
  onOpen,
  onClearTopic,
}: {
  topicId: string | null;
  onOpen: (conversationId: string) => void;
  onClearTopic: () => void;
}) {
  const { data } = useVillage();
  const { client } = useAuth();
  const [topics, setTopics] = useState<TopicCard[] | null>(null);
  const [resumes, setResumes] = useState<ConversationListItem[]>([]);
  const [loadError, setLoadError] = useState('');
  const [starting, setStarting] = useState<string | null>(topicId);
  const [notice, setNotice] = useState('');
  const autoStartKey = useRef(newIdempotencyKey());
  // 부모가 매번 새 함수를 넘겨도 자동 시작 effect 가 다시 돌지 않게 최신 콜백만 참조한다.
  const callbacks = useRef({ onOpen, onClearTopic });
  useEffect(() => {
    callbacks.current = { onOpen, onClearTopic };
  });

  useEffect(() => {
    let active = true;
    listConversations(client, { status: ['ACTIVE', 'READY_TO_FINISH'], limit: 5 }).then(
      (page) => active && setResumes(page.items),
      () => undefined,
    );
    // 추천 주제 우선, 비어 있거나 실패하면 홈 추천으로 채운다.
    listTopics(client, { recommended: true, limit: 6 })
      .then((page) =>
        page.items.length
          ? page.items.map((t) => ({
              id: t.id,
              title: t.title,
              category: t.category,
              minutes: t.estimatedMinutes,
            }))
          : Promise.reject(new Error('empty')),
      )
      .catch(() =>
        getHome(client).then((home) =>
          home.recommendations.map((r) => ({
            id: r.topicId,
            title: r.title,
            category: r.category,
            reason: r.reason,
            minutes: r.estimatedMinutes,
          })),
        ),
      )
      .then(
        (cards) => active && setTopics(cards),
        (error: unknown) => {
          if (!active || (error instanceof V1Error && error.status === 401)) return;
          setTopics([]);
          setLoadError(errorText(error, '주제를 불러오지 못했어요.'));
        },
      );
    return () => {
      active = false;
    };
  }, [client]);

  const start = useCallback(
    async (id: string, key: string) => {
      setStarting(id);
      setNotice('');
      try {
        const started = await startConversation(
          client,
          { topicId: id, inputMode: 'TEXT', locale: 'ko-KR' },
          key,
        );
        callbacks.current.onOpen(started.conversationId);
      } catch (error) {
        setStarting(null);
        if (!(error instanceof V1Error && error.status === 401))
          setNotice(errorText(error, '이야기를 시작하지 못했어요.'));
      }
    },
    [client],
  );

  // `/talk?topicId=` 로 들어오면 그 주제로 바로 시작한다. StrictMode 에서도 같은 키라 한 번만 만들어진다.
  useEffect(() => {
    if (!topicId) return;
    let active = true;
    startConversation(
      client,
      { topicId, inputMode: 'TEXT', locale: 'ko-KR' },
      autoStartKey.current,
    ).then(
      (started) => active && callbacks.current.onOpen(started.conversationId),
      (error: unknown) => {
        if (!active || (error instanceof V1Error && error.status === 401)) return;
        setStarting(null);
        setNotice(errorText(error, '이야기를 시작하지 못했어요.'));
        callbacks.current.onClearTopic();
      },
    );
    return () => {
      active = false;
    };
  }, [client, topicId]);

  return (
    <div className="conversation-page talk-picker">
      <header className="conversation-head">
        <Link to="/" className="icon-btn" aria-label="홈으로">
          <Icon name="close" />
        </Link>
        <div className="talk-picker-title">
          <span className="eyebrow">TALK WITH TIKI</span>
          <h1>{data.profile.name}야, 오늘은 무슨 이야기를 할까?</h1>
        </div>
      </header>
      {notice && (
        <div role="alert">
          <Notice variant="error">{notice}</Notice>
        </div>
      )}
      {resumes.length > 0 && (
        <section className="resume-list" aria-labelledby="resume-title">
          <h2 id="resume-title">이어서 이야기하기</h2>
          {resumes.map((item) => {
            const [emoji] = category(item.topic?.category);
            return (
              <div className="resume-row" key={item.conversationId}>
                <span className="topic-emoji-small" aria-hidden="true">
                  {emoji}
                </span>
                <div>
                  <strong>{item.topic?.title ?? item.title ?? '티키와 나눈 이야기'}</strong>
                  {item.status === 'READY_TO_FINISH' && (
                    <small className="tag teal">마칠 준비가 됐어요</small>
                  )}
                </div>
                <Button className="light small" onClick={() => onOpen(item.conversationId)}>
                  이어 말하기 <Icon name="arrow" />
                </Button>
              </div>
            );
          })}
        </section>
      )}
      <div className="section-title">
        <div>
          <span className="eyebrow">PICK A QUESTION</span>
          <h2>새 이야기 고르기</h2>
        </div>
        <Link to="/topics/new">내 주제 만들기 →</Link>
      </div>
      {topics === null ? (
        <div className="panel loading-page" role="status">
          <Icon name="sprout" />
          티키가 이야깃거리를 고르고 있어요…
        </div>
      ) : topics.length === 0 ? (
        <Notice variant={loadError ? 'error' : 'neutral'}>
          {loadError || '지금은 고를 수 있는 주제가 없어요. 조금 뒤에 다시 와 줘!'}
        </Notice>
      ) : (
        <div className="topic-grid">
          {topics.map((topic, index) => {
            const [emoji, label] = category(topic.category);
            return (
              <button
                type="button"
                className={`topic-card ${cardColors[index % cardColors.length]}`}
                key={topic.id}
                disabled={!!starting}
                onClick={() => void start(topic.id, newIdempotencyKey())}
              >
                <span className="topic-emoji">{emoji}</span>
                <div>
                  <span className="eyebrow">{label}</span>
                  <h3>{topic.title}</h3>
                  {topic.reason && <p>{topic.reason}</p>}
                  <small>
                    {starting === topic.id
                      ? '티키가 준비하는 중…'
                      : `${topic.minutes ? `약 ${topic.minutes}분 · ` : ''}자유롭게 이야기해요`}
                  </small>
                </div>
                <span className="round-arrow">
                  <Icon name="arrow" />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type ChatView = {
  status: SessionStatus;
  topic: TopicSummary | null;
  messages: ChatMessage[];
  nextCursor: string | null;
  interaction: NextInteraction | null;
  readiness: ConversationReadiness;
};
type Pending = { request: SendMessageRequest; text: string; failed: boolean };

const fromDetail = (detail: ConversationDetail): ChatView => ({
  status: detail.status,
  topic: detail.topic ?? null,
  messages: mergeMessages([], detail.messages),
  nextCursor: detail.nextCursor ?? null,
  interaction: detail.currentInteraction,
  readiness: detail.readiness,
});

function ConversationChat({
  conversationId,
  onExit,
}: {
  conversationId: string;
  onExit: () => void;
}) {
  const { data, toast } = useVillage();
  const { client } = useAuth();
  const [view, setView] = useState<ChatView | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [loadError, setLoadError] = useState('');
  const [text, setText] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [completing, setCompleting] = useState(false);
  const [cancelArmed, setCancelArmed] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const completeKey = useRef(newIdempotencyKey());
  const { listening, listen } = useSpeechInput(
    setText,
    toast,
    '내 생각에는 컵이 너무 차가워서 공기 속의 물이 컵 겉에 붙은 것 같아요.',
  );

  const applyDetail = useCallback(
    (request: Promise<ConversationDetail>, isActive: () => boolean = () => true) =>
      request.then(
        (detail) => {
          if (!isActive()) return;
          setLoadError('');
          setView(fromDetail(detail));
          if (detail.status === 'COMPLETED' && detail.story) setStory(detail.story);
        },
        (error: unknown) => {
          if (!isActive() || (error instanceof V1Error && error.status === 401)) return;
          setLoadError(
            error instanceof V1Error && (error.status === 404 || error.status === 403)
              ? '이 이야기를 찾을 수 없어요.'
              : errorText(error, '이야기를 불러오지 못했어요.'),
          );
        },
      ),
    [],
  );
  useEffect(() => {
    let active = true;
    void applyDetail(getConversation(client, conversationId, { limit: 50 }), () => active);
    return () => {
      active = false;
    };
  }, [client, conversationId, applyDetail]);
  const reload = () => applyDetail(getConversation(client, conversationId, { limit: 50 }));

  const loadOlder = async () => {
    if (!view?.nextCursor) return;
    try {
      const older = await getConversation(client, conversationId, {
        messageCursor: view.nextCursor,
        limit: 50,
      });
      setView((current) =>
        current
          ? {
              ...current,
              messages: mergeMessages(older.messages, current.messages),
              nextCursor: older.nextCursor ?? null,
            }
          : current,
      );
    } catch (error) {
      setNotice(errorText(error, '이전 이야기를 불러오지 못했어요.'));
    }
  };

  const send = async (request: SendMessageRequest, shown: string, fromText: boolean) => {
    setSending(true);
    setNotice('');
    setPending({ request, text: shown, failed: false });
    try {
      const response = await sendConversationMessage(client, conversationId, request);
      setView((current) =>
        current
          ? {
              ...current,
              messages: mergeMessages(current.messages, [
                response.userMessage,
                response.assistantMessage,
              ]),
              interaction: response.nextInteraction,
              readiness: response.readiness,
              status: response.status,
            }
          : current,
      );
      setPending(null);
      if (fromText) setText('');
      if (response.completion) {
        setStory(response.completion.story);
        setView((current) => (current ? { ...current, status: 'COMPLETED' } : current));
      }
    } catch (error) {
      const failure = classifySendError(error);
      setNotice(failure.kind === 'signin' ? '' : failure.message);
      if (failure.kind === 'retry' || failure.kind === 'wait') {
        // 같은 clientMessageId 로 다시 보낼 수 있게 남겨 둔다.
        setPending({ request, text: shown, failed: true });
      } else {
        setPending(null);
        if (failure.kind === 'reload') await reload();
      }
    } finally {
      setSending(false);
    }
  };

  const submitText = () => {
    const value = text.trim();
    if (!value) {
      toast('티키에게 네 생각을 말해 줘!');
      return;
    }
    if (pending?.failed && pending.request.input.type === 'TEXT' && pending.text === value) {
      void send(pending.request, value, true);
      return;
    }
    const request = buildMessageRequest(newIdempotencyKey(), view?.interaction, { text: value });
    if (request) void send(request, value, true);
  };
  const choose = (optionId: string) => {
    const option = view?.interaction?.options.find((item) => item.id === optionId);
    if (!option) return;
    const retry =
      pending?.failed &&
      pending.request.input.type === 'SINGLE_CHOICE' &&
      pending.request.input.optionId === optionId;
    const request = retry
      ? pending.request
      : buildMessageRequest(newIdempotencyKey(), view?.interaction, { optionId });
    if (request) void send(request, option.label, false);
  };

  const complete = async () => {
    setCompleting(true);
    setNotice('');
    try {
      const result = await completeConversation(
        client,
        conversationId,
        'BUTTON',
        completeKey.current,
      );
      setStory(result.story);
      setView((current) => (current ? { ...current, status: 'COMPLETED' } : current));
    } catch (error) {
      const failure = classifySendError(error);
      if (failure.kind !== 'retry') completeKey.current = newIdempotencyKey();
      if (failure.kind === 'notReady' && error instanceof V1Error) {
        const missing = (error.details.missingDimensions as Dimension[] | undefined) ?? [];
        setNotice(
          missing.length
            ? `조금만 더 이야기해 볼까? ${missing.map(dimensionLabel).join(', ')}을(를) 더 들려줘.`
            : failure.message,
        );
        void reload();
      } else if (failure.kind !== 'signin') {
        setNotice(failure.message);
        if (failure.kind === 'reload') void reload();
      }
    } finally {
      setCompleting(false);
    }
  };

  const cancel = async () => {
    setCancelling(true);
    try {
      await cancelConversation(client, conversationId);
      toast('이야기를 멈췄어요. 언제든 새 이야기를 시작할 수 있어요.');
      onExit();
    } catch (error) {
      setCancelling(false);
      setCancelArmed(false);
      setNotice(errorText(error, '이야기를 멈추지 못했어요.'));
    }
  };

  const name = data.profile.name || '나';
  const [emoji, label] = category(view?.topic?.category);

  if (story)
    return <StoryResult story={story} topic={view?.topic ?? null} name={name} onNew={onExit} />;

  if (!view)
    return (
      <div className="conversation-page">
        {loadError ? (
          <Notice variant="error">
            {loadError}
            <div className="actions">
              <Button className="light small" onClick={() => void reload()}>
                다시 불러오기
              </Button>
              <Button className="ghost small" onClick={onExit}>
                다른 이야기 고르기
              </Button>
            </div>
          </Notice>
        ) : (
          <div className="panel loading-page" role="status">
            <Icon name="sprout" />
            지난 이야기를 펼치고 있어요…
          </div>
        )}
      </div>
    );

  const open = isOpenStatus(view.status);
  const ready = canFinish(view.readiness, view.status);
  const busy = sending || completing || cancelling;
  const choice = view.interaction?.type === 'SINGLE_CHOICE' ? view.interaction : null;
  const covered = new Set(view.readiness.coveredDimensions);

  return (
    <div className="conversation-page">
      <header className="conversation-head">
        <button
          type="button"
          onClick={onExit}
          className="icon-btn"
          aria-label="주제 고르기로 돌아가기"
        >
          <Icon name="close" />
        </button>
        <div className="session-clock">
          <span aria-hidden="true">{emoji}</span>
          <strong>{view.topic?.title ?? '티키와 이야기'}</strong>
        </div>
        <ReadinessBar value={progressValue(view.readiness)} label="이야기가 모인 정도" />
        <span className="tag teal">
          {emoji} {label} 이야기
        </span>
      </header>
      <div className="chat-stage">
        <aside className="visual-lab">
          <div className="visual-label">
            <span>생각 지도</span>
            <strong>
              {ready ? '이야기를 마칠 준비가 됐어요!' : '티키와 생각을 하나씩 모아 봐요'}
            </strong>
          </div>
          <div className="extract-status dimension-status">
            {DIMENSIONS.map((dimension) => (
              <span className={covered.has(dimension.key) ? 'done' : ''} key={dimension.key}>
                {dimension.emoji} {dimension.label}
              </span>
            ))}
          </div>
          <div className="visual-note">
            <span>💡</span>
            <p>
              {ready
                ? '더 이야기해도 좋고, “이야기 마치기”를 눌러 책으로 만들어도 좋아요.'
                : '정답을 맞히는 게 아니에요. 네가 그렇게 생각한 까닭이 궁금해!'}
            </p>
          </div>
          <div className="mini-buddy">
            <span>🌱</span>
            <div>
              <strong>생각친구 티키</strong>
              <small>{listening ? `${name}의 말을 듣는 중…` : '네 이야기를 기다리는 중'}</small>
            </div>
          </div>
        </aside>
        <section className="chat-workspace">
          <div className="chat-title">
            <div>
              <span>🌱</span>
              <div>
                <strong>생각친구 티키</strong>
                <small>{name}와 대화 중</small>
              </div>
            </div>
            {view.nextCursor ? (
              <button type="button" className="text-back" onClick={() => void loadOlder()}>
                이전 이야기 보기
              </button>
            ) : (
              <span className="online-dot">지금 접속 중</span>
            )}
          </div>
          <ChatThread
            variant="talk"
            messages={view.messages}
            childName={name}
            pendingText={pending?.text}
            pendingFailed={pending?.failed}
            thinking={sending}
          />
          {notice && (
            <div role="alert" className="chat-notice">
              <Notice variant="error">{notice}</Notice>
            </div>
          )}
          {!open ? (
            <div className="chat-notice">
              <Notice>
                {view.status === 'CANCELLED'
                  ? '멈춘 이야기예요.'
                  : view.status === 'FINALIZING'
                    ? '티키가 이야기를 책으로 묶는 중이에요.'
                    : '끝난 이야기예요.'}
                <div className="actions">
                  {view.status === 'FINALIZING' && (
                    <Button className="light small" onClick={() => void reload()}>
                      다시 확인하기
                    </Button>
                  )}
                  <Button className="ghost small" onClick={onExit}>
                    다른 이야기 고르기
                  </Button>
                </div>
              </Notice>
            </div>
          ) : choice ? (
            <ChoiceButtons options={choice.options} disabled={busy} onChoose={choose} />
          ) : (
            <div className="voice-composer">
              <div className={`live-text ${listening ? 'is-listening' : ''}`}>
                <span>{listening ? '● 듣고 있어요' : '내 말이 여기에 보여요'}</span>
                <textarea
                  value={text}
                  maxLength={1000}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="마이크를 누르고 천천히 말해 보세요…"
                  aria-label="티키에게 할 말"
                />
              </div>
              <button
                type="button"
                className={`mic-button ${listening ? 'active' : ''}`}
                onClick={listen}
                aria-label="음성 입력"
              >
                <Icon name={listening ? 'pause' : 'mic'} />
              </button>
              <small>
                {listening
                  ? '편하게 말해요. 말하는 글이 바로 보여요.'
                  : '누르면 말할 수 있어요 · 글로 써도 괜찮아요'}
              </small>
            </div>
          )}
          {open && (
            <div className="conversation-actions">
              {cancelArmed ? (
                <span className="cancel-confirm">
                  이야기를 멈출까요?
                  <button type="button" className="text-back" onClick={() => setCancelArmed(false)}>
                    계속하기
                  </button>
                  <Button className="danger small" disabled={busy} onClick={() => void cancel()}>
                    {cancelling ? '멈추는 중…' : '멈추기'}
                  </Button>
                </span>
              ) : (
                <button type="button" className="text-back" onClick={() => setCancelArmed(true)}>
                  그만하기
                </button>
              )}
              <Button
                className="light"
                disabled={!ready || busy}
                onClick={() => void complete()}
                title={ready ? undefined : '조금 더 이야기하면 마칠 수 있어요'}
              >
                {completing ? '책으로 묶는 중…' : '이야기 마치기'}
              </Button>
              {!choice && (
                <Button disabled={busy || listening || !text.trim()} onClick={submitText}>
                  {pending?.failed && pending.text === text.trim()
                    ? '다시 보내기'
                    : '말했어! 보내기'}{' '}
                  <Icon name="arrow" />
                </Button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StoryResult({
  story,
  topic,
  name,
  onNew,
}: {
  story: Story;
  topic: TopicSummary | null;
  name: string;
  onNew: () => void;
}) {
  const [emoji, label] = category(topic?.category);
  const journey = story.thoughtJourney;
  return (
    <div className="talk-complete">
      <div className="celebration">✨</div>
      <span className="tag teal">이야기 완성</span>
      <h1>
        {name}가 만든 {label} 이야기!
      </h1>
      <p>내가 말한 생각이 한 권의 이야기가 됐어요. 나의 책장에 담아 두었어요.</p>
      <article className="finished-story">
        <div className="finished-cover">
          <span>{emoji}</span>
          <small>{topic?.title ?? `${name}의 이야기`}</small>
          <h2>{story.title}</h2>
        </div>
        <div className="finished-copy">
          <span className="eyebrow">MY STORY</span>
          <p>{story.summary}</p>
          {story.body && story.body !== story.summary && (
            <div className="story-body">
              {story.body
                .split(/\n+/)
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
            </div>
          )}
          {journey && (journey.initialIdea || journey.finalReflection) && (
            <div className="thought-change">
              <span>
                처음 생각
                <br />
                <strong>{journey.initialIdea}</strong>
              </span>
              <Icon name="arrow" />
              <span>
                지금 생각
                <br />
                <strong>{journey.finalReflection}</strong>
              </span>
            </div>
          )}
          {(journey?.evidence ?? []).length > 0 && (
            <div className="journey-list">
              <strong>🔍 내가 찾은 단서</strong>
              <ul>
                {journey.evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {(journey?.alternatives ?? []).length > 0 && (
            <div className="journey-list">
              <strong>🔀 함께 떠올린 다른 가능성</strong>
              <ul>
                {journey.alternatives.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </article>
      <div className="actions center-actions">
        <Link className="btn light" to="/shelf">
          <Icon name="book" /> 나의 책장 보기
        </Link>
        <Button onClick={onNew}>
          새 이야기 시작 <Icon name="arrow" />
        </Button>
      </div>
    </div>
  );
}
