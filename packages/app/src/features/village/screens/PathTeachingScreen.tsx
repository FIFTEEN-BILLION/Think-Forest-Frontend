import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { reactTiki, teachTiki, useApiClient } from '../../../api';
import { Icon } from '../components/Icon';
import { GridWorld, PathRecordCard, ProgramView, useRunReplay } from '../components/PathParts';
import { Button } from '../components/ui';
import {
  CHALLENGES,
  MAX_HELP,
  OUTCOME_TEXT,
  PATH_STEPS,
  challengeCandidates,
  currentMap,
  fallbackReaction,
  finished,
  helpText,
  isProgram,
  lastRun,
  pathGuard,
} from '../lib/path';
import { useVillage } from '../state/VillageProvider';
import type { Draft, InputOrigin, PathRun, PathTurn, ProgramStep } from '../types';

const EXAMPLES = [
  '앞으로 쭉 가',
  '앞으로 세 칸 가',
  '오른쪽으로 돌아서 두 칸 가',
  '웅덩이가 나오면 오른쪽으로 돌아',
  '우체국에 갈 때까지 앞으로 가',
];

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function speakLine(text: string, enabled: boolean) {
  if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) return;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith('ko'));
  if (!voice) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = 'ko-KR';
  u.rate = 1;
  u.pitch = 1.3;
  speechSynthesis.speak(u);
}

function TikiSays({
  children,
  source,
  speaking = false,
}: {
  children: ReactNode;
  source?: 'ai' | 'fallback' | null;
  speaking?: boolean;
}) {
  return (
    <div className={`chat-row tiki ${speaking ? 'speaking' : ''}`}>
      <span className="chat-avatar" aria-hidden="true">
        •ᴗ•
      </span>
      <div className="chat-bubble">
        <span className={`tag ${source === 'fallback' ? 'gold' : 'teal'}`}>
          {source === 'ai' ? '티키 · AI' : source === 'fallback' ? '티키 · 준비된 대사' : '티키'}
        </span>
        <div>{children}</div>
      </div>
    </div>
  );
}
const ChildSays = ({ text }: { text: string }) => (
  <div className="chat-row child">
    <div className="chat-bubble">{text}</div>
  </div>
);

// Chat thread: every child sentence, what 티키 heard, and 티키's reaction to every run.
function Thread({
  draft: d,
  onChoose,
}: {
  draft: Draft;
  onChoose: (turn: PathTurn, label: string, program: ProgramStep[]) => void;
}) {
  const q = d.path!;
  const end = useRef<HTMLDivElement>(null);
  const reacted = Boolean(lastRun(q)?.reaction);
  const ordered: ({ kind: 'turn'; turn: PathTurn } | { kind: 'run'; run: PathRun })[] = [];
  q.turns.forEach((turn, i) => {
    ordered.push({ kind: 'turn', turn });
    q.runs
      .filter((r) => r.afterTurn === i + 1)
      .forEach((run) => ordered.push({ kind: 'run', run }));
  });
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [q.turns.length, q.runs.length, reacted]);
  return (
    <div className="chat-thread" aria-live="polite">
      <TikiSays>
        안녕! 나는 티키야. 우체국 📮 에 편지를 배달해야 해. 나는 네가 <strong>말한 그대로만</strong>
        움직여. 어떻게 가면 될까?
      </TikiSays>
      {ordered.map((item) =>
        item.kind === 'turn' ? (
          <div key={item.turn.id}>
            <ChildSays text={item.turn.text} />
            <TikiSays source={item.turn.source}>
              <p>{item.turn.tikiLine}</p>
              {item.turn.heard.length > 0 && (
                <ul className="heard-list" aria-label="티키가 알아들은 것">
                  {item.turn.heard.map((h, i) => (
                    <li key={i}>
                      <mark>“{h.phrase}”</mark> → {h.meaning}
                    </li>
                  ))}
                </ul>
              )}
              {item.turn.kind === 'clarify' && item.turn.clarify && (
                <div className="clarify">
                  <strong>{item.turn.clarify.question}</strong>
                  <div className="choice-chips">
                    {item.turn.clarify.options.map((o) => (
                      <button
                        type="button"
                        key={o.label}
                        className={`choice-chip ${item.turn.chosen === o.label ? 'selected' : ''}`}
                        disabled={Boolean(item.turn.chosen)}
                        onClick={() => onChoose(item.turn, o.label, o.program)}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </TikiSays>
          </div>
        ) : (
          <div key={item.run.id} className="run-note">
            <span className={`run-chip ${item.run.outcome}`}>
              {item.run.outcome === 'arrived'
                ? '📮'
                : item.run.outcome === 'splashed'
                  ? '💦'
                  : item.run.outcome === 'bumped'
                    ? '💥'
                    : '❓'}{' '}
              {OUTCOME_TEXT[item.run.outcome]}
            </span>
            {item.run.reaction ? (
              <TikiSays source={item.run.reaction.source}>
                <p>{item.run.reaction.tikiLine}</p>
                {item.run.reaction.question && (
                  <p className="tiki-question">{item.run.reaction.question}</p>
                )}
                {item.run.reaction.challengeLine && (
                  <p className="tiki-challenge">
                    <strong>🔥 티키의 도전!</strong> {item.run.reaction.challengeLine}
                  </p>
                )}
              </TikiSays>
            ) : (
              <TikiSays>…</TikiSays>
            )}
          </div>
        ),
      )}
      <div ref={end} />
    </div>
  );
}

function Play({ draft: d }: { draft: Draft }) {
  const { send, data, toast } = useVillage();
  const request = useApiClient();
  const q = d.path!;
  const map = currentMap(q);
  const run = lastRun(q);
  const shown = run && run.map.id === map.id ? run : null;
  const replay = useRunReplay(shown);
  const [text, setText] = useState('');
  const [origin, setOrigin] = useState<InputOrigin>('adult');
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const reacting = useRef<string | null>(null);
  const tts = data.settings.tts;
  const previousMap = q.maps[q.maps.length - 2];
  const changed = previousMap
    ? [
        ...map.puddles.filter((c) => !previousMap.puddles.includes(c)),
        ...previousMap.puddles.filter((c) => !map.puddles.includes(c)),
      ]
    : [];

  // After a run finishes playing, ask 티키 (AI) to react — and pick a challenge on arrival.
  useEffect(() => {
    if (!run || run.reaction || !replay.done || reacting.current === run.id) return;
    reacting.current = run.id;
    const index = q.runs.indexOf(run);
    const previous = q.runs[index - 1] ?? null;
    const candidates =
      run.outcome === 'arrived' && q.awaitingChallenge
        ? challengeCandidates(run.map, run.program, q.maps)
        : [];
    const said = [...q.turns].reverse().find((t) => t.kind === 'program')?.text ?? '';
    const finish = (
      tikiLine: string,
      question: string | null,
      source: 'ai' | 'fallback',
      challengeId: string | null,
      challengeLine: string | null,
    ) => {
      const picked =
        candidates.find((c) => c.id === challengeId) ?? (candidates.length ? candidates[0] : null);
      const line = picked
        ? (challengeLine ?? '이번엔 내가 지도를 바꿔 볼게! 네 말 그대로면 어떻게 될까?')
        : null;
      send({
        type: 'path-react',
        runId: run.id,
        tikiLine,
        question,
        source,
        challenge: picked && line ? { map: picked.map, line } : null,
      });
      speakLine([tikiLine, line].filter(Boolean).join(' '), tts);
    };
    void reactTiki(request, {
      text: said,
      program: run.program,
      mapId: run.map.id,
      attempt: index,
      inputOrigin: origin,
      result: {
        outcome: run.outcome,
        moves: Math.max(0, run.cells.length - 1),
        stopStepLabel: run.stopLabel,
        previousOutcome: previous?.outcome ?? null,
        changedSinceLast: previous
          ? JSON.stringify(previous.program) !== JSON.stringify(run.program)
          : true,
      },
      challengeCandidates: candidates.map(({ id, summary }) => ({ id, summary })),
    }).then(
      (r) => finish(r.tikiLine, r.question, r.source, r.challengeId, r.challengeLine),
      () => finish(fallbackReaction(run, index), null, 'fallback', null, null),
    );
  }, [run, replay.done, q, request, send, origin, tts]);

  const say = (said: string, from: InputOrigin) => {
    const value = said.trim();
    if (!value || thinking) return;
    setThinking(true);
    const pending = [...q.turns].reverse().find((t) => t.kind === 'clarify' && !t.chosen);
    void teachTiki(request, {
      text: value,
      program: q.program,
      mapId: map.id,
      attempt: q.runs.length,
      inputOrigin: from,
      pendingClarify: pending?.clarify
        ? { question: pending.clarify.question, chosen: value }
        : null,
    }).then(
      (r) => {
        setThinking(false);
        setText('');
        const turn: PathTurn = {
          id: `turn-${Date.now().toString(36)}`,
          text: value,
          origin: from,
          kind: r.kind,
          heard: r.heard.slice(0, 4),
          tikiLine: r.tikiLine,
          source: r.source,
          clarify:
            r.kind === 'clarify' && r.clarify
              ? { ...r.clarify, options: r.clarify.options.filter((o) => isProgram(o.program)) }
              : null,
          chosen: null,
        };
        send({ type: 'path-teach', turn, program: r.kind === 'program' ? r.program : null });
        speakLine(r.tikiLine + (r.clarify ? ` ${r.clarify.question}` : ''), tts);
      },
      () => {
        setThinking(false);
        toast('티키와 연결하지 못했어요. 잠시 뒤에 다시 말해 줘.');
      },
    );
  };

  const listen = () => {
    const w = window as typeof window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return toast('이 브라우저는 말하기를 지원하지 않아요. 글로 써 줘.');
    if (listening) return recognition.current?.stop();
    const r = new SR();
    recognition.current = r;
    r.lang = 'ko-KR';
    r.interimResults = true;
    r.continuous = false;
    let heard = '';
    r.onresult = (e) => {
      heard = Array.from(e.results)
        .map((x) => x[0]?.transcript ?? '')
        .join('');
      setText(heard);
      setOrigin('adult');
    };
    r.onend = () => {
      setListening(false);
      if (heard.trim()) say(heard, 'adult');
    };
    r.onerror = () => {
      setListening(false);
      toast('잘 못 들었어요. 다시 말하거나 글로 써 줘.');
    };
    setListening(true);
    r.start();
  };

  const running = Boolean(shown && !replay.done);
  const waitingReaction = Boolean(run && !run.reaction);
  const help = q.help;
  const canHelp = Boolean(shown && replay.done && shown.outcome !== 'arrived');
  const stage = Math.min(q.maps.length - 1, CHALLENGES);
  return (
    <div className="tiki-play">
      <section className="panel tiki-map">
        <div className="stage-chips" role="list">
          {['첫 배달', '도전 1', '도전 2'].map((label, i) => (
            <span
              key={label}
              role="listitem"
              className={`stage-chip ${i < stage || (i === stage && q.wins > i) ? 'done' : i === stage ? 'now' : ''}`}
            >
              {label}
            </span>
          ))}
        </div>
        <GridWorld
          map={map}
          tiki={replay.tiki ?? { cell: map.start, heading: map.heading }}
          effect={replay.effect}
          trail={replay.trail}
          highlight={help >= 1 && canHelp ? (shown!.cells[shown!.cells.length - 1] ?? null) : null}
          marked={shown ? [] : changed}
          predicted={shown && !predicting ? shown.predicted : q.prediction}
          onCell={
            predicting
              ? (cell) => {
                  send({ type: 'path-predict', cell });
                  setPredicting(false);
                }
              : undefined
          }
          caption={
            predicting
              ? '티키가 어디까지 갈까? 칸 하나를 눌러 줘'
              : changed.length && !shown
                ? '티키가 바꾼 칸이 노랗게 보여요'
                : '티키 · 편지 배달 지도'
          }
        />
        <div className="actions tiki-actions">
          <Button
            onClick={() => send({ type: 'path-run' })}
            disabled={
              running || waitingReaction || !q.program.length || finished(q) || q.awaitingChallenge
            }
          >
            <Icon name="play" />
            티키야, 움직여!
          </Button>
          <Button
            className="light small"
            onClick={() => setPredicting((p) => !p)}
            disabled={running || !q.program.length}
          >
            {predicting
              ? '예상 그만'
              : q.prediction !== null
                ? '예상 다시 하기'
                : '어디까지 갈지 예상하기'}
          </Button>
          {canHelp && (
            <Button
              className="ghost small"
              disabled={help >= MAX_HELP}
              onClick={() => send({ type: 'path-help' })}
            >
              <Icon name="info" />
              {help ? '도움 더 받기' : '도움 받기'}
            </Button>
          )}
        </div>
        {canHelp && help > 0 && (
          <p className="path-help" role="status">
            <strong>도움 {help}</strong> {helpText(help, shown)}
          </p>
        )}
        <div className="tiki-brain">
          <div className="row between">
            <strong>🧠 티키 머릿속</strong>
            {q.program.length > 0 && (
              <button
                type="button"
                className="btn ghost small"
                onClick={() => send({ type: 'path-reset' })}
                disabled={running}
              >
                처음부터 다시 말하기
              </button>
            )}
          </div>
          <ProgramView
            program={shown && running ? shown.program : q.program}
            activeTop={replay.activeTop}
          />
        </div>
      </section>
      <section className="panel tiki-chat">
        <Thread
          draft={d}
          onChoose={(turn, label, program) =>
            send({ type: 'path-clarify', turnId: turn.id, label, program })
          }
        />
        {thinking && (
          <TikiSays>
            <span className="typing">티키가 생각 중</span>
          </TikiSays>
        )}
        {finished(q) ? (
          <p className="inquiry-note">배달을 모두 마쳤어! 아래에서 오늘 한 일을 돌아보자.</p>
        ) : (
          <div className="chat-input">
            <div className="example-chips" role="group" aria-label="예시 말 고르기">
              {EXAMPLES.map((example) => (
                <button
                  type="button"
                  key={example}
                  className="example-chip"
                  disabled={thinking}
                  onClick={() => {
                    setOrigin('example');
                    say(example, 'example');
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
            <form
              className="chat-form"
              onSubmit={(e) => {
                e.preventDefault();
                say(text, origin);
              }}
            >
              <button
                type="button"
                className={`mic ${listening ? 'on' : ''}`}
                onClick={listen}
                aria-label={listening ? '듣기 멈추기' : '말로 하기'}
              >
                <Icon name="mic" />
              </button>
              <input
                value={text}
                maxLength={200}
                placeholder="티키에게 어떻게 갈지 말해 줘"
                onChange={(e) => {
                  setText(e.target.value);
                  setOrigin('adult');
                }}
                aria-label="티키에게 할 말"
              />
              <Button type="submit" className="small" disabled={thinking || !text.trim()}>
                말하기
              </Button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}

export function PathTeachingScreen({ draft: d }: { draft: Draft }) {
  const { send, finish, storageError } = useVillage();
  const navigate = useNavigate();
  const q = d.path!;
  const error = pathGuard(d);
  return (
    <div className="inquiry path-mission" data-step={d.step}>
      <div className="row between wrap">
        <Link to="/" className="back">
          <Icon name="back" />
          나중에 이어서 하기
        </Link>
        <span className="muted">
          {storageError ? '기기 저장을 확인해 주세요' : '이 기기에 자동으로 보관해요'}
        </span>
      </div>
      <div className="inquiry-heading">
        <span className="tag teal">호기심 실험실 · 티키 가르치기</span>
        <h1>{d.step === 0 ? '티키에게 말로 길을 알려 줘!' : '오늘 티키와 한 배달'}</h1>
        <p>
          {d.step === 0
            ? '티키는 네 말을 글자 그대로 따라 해. 웅덩이에 빠지거나 벽에 부딪히면, 말을 고쳐서 다시 해 봐.'
            : '처음 한 말과 도착한 말, 내가 쓴 생각 기술을 돌아봐.'}
        </p>
      </div>
      <p className="inquiry-note demo-note">
        체험 모드예요. 어른이 말하거나 예시를 골라 주세요. 티키가 말을 알아듣고 반응하는 부분은
        AI이고, 움직임은 정해진 규칙이 계산해요.
      </p>
      {d.step === 0 ? <Play draft={d} /> : <PathRecordCard path={q} />}
      <div className="inquiry-next">
        <p id="inquiry-next-help">
          {error ??
            (d.step === 1
              ? '마치면 책장에서 다시 볼 수 있어.'
              : finished(q)
                ? '배달 완료! 돌아보러 가자.'
                : '충분히 했으면 언제든 마무리해도 돼.')}
        </p>
        <Button
          disabled={Boolean(error)}
          className={d.step === 0 && !finished(q) ? 'light' : ''}
          aria-describedby="inquiry-next-help"
          onClick={() => {
            if (d.step === 0) send({ type: 'advance' });
            else {
              const id = finish();
              if (id) navigate(`/complete/${id}`);
            }
          }}
        >
          {d.step === 0 ? '오늘 배달 마무리' : '내 미션을 마쳤어요'}
          <Icon name={d.step === 1 ? 'book' : 'arrow'} />
        </Button>
      </div>
      <p className="visually-hidden">{PATH_STEPS[d.step]}</p>
    </div>
  );
}
