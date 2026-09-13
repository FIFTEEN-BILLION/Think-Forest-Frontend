import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Button } from '../components/ui';
import { useVillage } from '../state/VillageProvider';
import { WORDS } from '../data/experience';

type SpeechEvent = { results: ArrayLike<{ 0: { transcript: string } }> };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
const prompts = [
  '오늘은 과학 이야기를 해 볼까? 차가운 얼음물 컵 밖에 왜 물방울이 생기는지 궁금해!',
  '좋은 생각이야! 그럼 컵 밖의 물은 어디서 왔다고 생각해?',
  '왜 그 답을 골랐는지 “내 생각에는…”으로 시작해서 말해 줄래?',
  '마지막으로, 처음 생각과 지금 생각을 한 문장으로 이어 보자. 천천히 길게 말해도 괜찮아.',
];

export function ConversationScreen() {
  const { data, update, toast } = useVillage();
  const [step, setStep] = useState(0),
    [choice, setChoice] = useState(''),
    [text, setText] = useState('');
  const [listening, setListening] = useState(false),
    [done, setDone] = useState(false),
    [showWord, setShowWord] = useState(false),
    [saved, setSaved] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  useEffect(() => () => recognition.current?.stop(), []);
  const listen = () => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const SpeechRecognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    setListening(true);
    if (!SpeechRecognition) {
      window.setTimeout(() => {
        setText(
          step >= 3
            ? '처음에는 컵 안의 물이 새어 나온다고 생각했지만, 지금은 공기 속 물이 차가운 컵을 만나 물방울로 변한 것 같아요.'
            : '내 생각에는 컵이 너무 차가워서 공기 속의 물이 컵 겉에 붙은 것 같아요.',
        );
        setListening(false);
      }, 1400);
      return;
    }
    const instance = new SpeechRecognition();
    recognition.current = instance;
    instance.lang = 'ko-KR';
    instance.interimResults = true;
    instance.continuous = false;
    instance.onresult = (event) =>
      setText(
        Array.from(event.results)
          .map((result) => result[0].transcript)
          .join(''),
      );
    instance.onend = () => setListening(false);
    instance.onerror = () => {
      setListening(false);
      toast('음성을 듣지 못했어요. 글로 써도 괜찮아요.');
    };
    instance.start();
  };
  const next = () => {
    if (step === 1 && !choice) return;
    if (step >= 2 && text.trim().length < 8) {
      toast('“왜냐하면”을 붙여 한 문장으로 더 말해 볼까요?');
      return;
    }
    if (step === 3) {
      setDone(true);
      return;
    }
    setStep((value) => value + 1);
    if (step >= 2) setText('');
  };
  const saveStory = () => {
    if (saved) return;
    const now = new Date();
    update((prev) => ({
      ...prev,
      sessions: [
        {
          id: 'voice-ice-story',
          track: 'lab',
          activityId: 'shadow',
          title: '컵 밖의 비밀 탐험대',
          date: now.toISOString().slice(0, 10),
          completedAt: now.toISOString(),
          durationMinutes: 15,
          source: 'local',
          text: '처음에는 컵 안의 물이 새어 나온다고 생각했지만, 지금은 공기 속 물이 차가운 컵을 만나 물방울로 변한 것 같아요.',
          answers: [
            { question: '처음 생각', text: '컵 안의 물이 새어 나온 것 같아요.' },
            { question: '지금 생각', text: '공기 속 물이 차가운 컵을 만나 물방울로 변했어요.' },
          ],
          rubric: { observe: 80, reason: 82, express: 86 },
          favorite: true,
        },
        ...prev.sessions.filter((session) => session.id !== 'voice-ice-story'),
      ],
    }));
    setSaved(true);
    toast('지우의 이야기를 책장에 담았어요!');
  };
  if (done)
    return (
      <div className="talk-complete">
        <div className="celebration">✨</div>
        <span className="tag teal">15분 이야기 완성</span>
        <h1>{data.profile.name}가 만든 첫 과학 모험!</h1>
        <p>내가 말한 생각이 한 권의 이야기가 됐어요.</p>
        <article className="finished-story">
          <div className="finished-cover">
            <span>🧊</span>
            <small>지우의 과학 모험 01</small>
            <h2>컵 밖의 비밀 탐험대</h2>
          </div>
          <div className="finished-copy">
            <span className="eyebrow">MY STORY</span>
            <p>
              지우는 얼음물 컵 밖에 맺힌 물방울을 보고 작은 탐험대를 만들었어요. 처음에는 컵 안의
              물이 새어 나왔다고 생각했지만, 컵이 안 새었다는 근거를 발견했어요. 그리고 공기 속 물이
              차가운 컵을 만나 물방울로 변한다는 새로운 생각에 도착했답니다.
            </p>
            <div className="thought-change">
              <span>
                처음 생각
                <br />
                <strong>컵 안의 물이 새었어!</strong>
              </span>
              <Icon name="arrow" />
              <span>
                지금 생각
                <br />
                <strong>공기 속 물이 맺혔어!</strong>
              </span>
            </div>
          </div>
        </article>
        <div className="actions center-actions">
          <Button className="light" onClick={saveStory}>
            {saved ? '책장에 담았어요' : '나의 책장에 담기'}
          </Button>
          <Link className="btn" to="/community">
            <Icon name="share" /> 가족에게 보여 주기
          </Link>
        </div>
      </div>
    );
  return (
    <div className="conversation-page">
      <header className="conversation-head">
        <Link to="/" className="icon-btn" aria-label="홈으로">
          <Icon name="close" />
        </Link>
        <div className="session-clock">
          <Icon name="clock" />
          <strong>07:42</strong>
          <span>/ 15분</span>
        </div>
        <div className="session-progress">
          <span style={{ width: `${28 + step * 20}%` }} />
        </div>
        <span className="tag teal">🧪 과학 이야기</span>
      </header>
      <div className="chat-stage">
        <aside className="visual-lab">
          <div className="visual-label">
            <span>지금 보는 자료</span>
            <strong>{step < 2 ? '차가운 컵을 관찰해 보자' : '공기 속 물의 여행'}</strong>
          </div>
          <div className={`cup-visual step-${step}`}>
            <div className="air-particles">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="glass">
              <span>🧊</span>
              <b>차가운 물</b>
            </div>
            <div className="outside-drops">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="temperature">
              <span>-</span>
              <i />
              <strong>4℃</strong>
            </div>
            {step >= 2 && <div className="particle-arrow">공기 속 물 → 물방울</div>}
          </div>
          <div className="visual-note">
            <span>💡</span>
            <p>
              {step === 0
                ? '컵 안과 밖을 천천히 살펴봐.'
                : step === 1
                  ? '물방울은 컵의 어느 쪽에 있을까?'
                  : '차가운 표면에 가까워진 물 알갱이를 보자.'}
            </p>
          </div>
          <div className="mini-buddy">
            <span>🌱</span>
            <div>
              <strong>생각친구 티키</strong>
              <small>{listening ? '지우의 말을 듣는 중…' : '자료를 같이 보는 중'}</small>
            </div>
          </div>
        </aside>
        <section className="chat-workspace">
          <div className="ai-bubble">
            <span className="bubble-name">🌱 티키</span>
            <p>{prompts[step]}</p>
            {step === 0 && (
              <button className="word-inline" onClick={() => setShowWord(true)}>
                결로 <small>뜻 보기</small>
              </button>
            )}
          </div>
          {showWord && (
            <div className="word-popover">
              <button onClick={() => setShowWord(false)} aria-label="닫기">
                ×
              </button>
              <span>💧 새로운 단어</span>
              <h3>{WORDS[0]!.word}</h3>
              <p>{WORDS[0]!.meaning}</p>
              <Link to="/words">내 단어 보관함에 담기 →</Link>
            </div>
          )}
          {step === 0 && (
            <div className="first-response">
              <p>“어? 컵이 젖었네!”라고 생각한 적 있어?</p>
              <div className="choice-row">
                <Button onClick={() => setStep(1)}>응, 본 적 있어</Button>
                <Button className="light" onClick={() => setStep(1)}>
                  아니, 처음이야
                </Button>
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="big-choices" role="group" aria-label="생각 선택">
              {(
                [
                  ['A', '컵 안의 물이 새었다', '🥤'],
                  ['B', '공기 속의 물이 붙었다', '🌬️'],
                  ['C', '컵이 물을 만들었다', '✨'],
                ] as const
              ).map(([key, label, emoji]) => (
                <button
                  key={key}
                  className={choice === key ? 'selected' : ''}
                  onClick={() => setChoice(key)}
                >
                  <span>{emoji}</span>
                  <strong>{key}</strong>
                  <p>{label}</p>
                </button>
              ))}
            </div>
          )}
          {step >= 2 && (
            <div className="voice-composer">
              <div className={`live-text ${listening ? 'is-listening' : ''}`}>
                <span>{listening ? '● 듣고 있어요' : '내 말이 여기에 보여요'}</span>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="마이크를 누르고 천천히 말해 보세요…"
                />
              </div>
              <button
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
          {step > 0 && (
            <div className="conversation-actions">
              <button className="text-back" onClick={() => setStep(Math.max(0, step - 1))}>
                ← 이전
              </button>
              <Button disabled={(step === 1 && !choice) || listening} onClick={next}>
                {step === 1
                  ? '이 생각으로 이야기할래'
                  : step === 3
                    ? '내 이야기 만들기'
                    : '말했어! 다음 질문'}{' '}
                <Icon name="arrow" />
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
