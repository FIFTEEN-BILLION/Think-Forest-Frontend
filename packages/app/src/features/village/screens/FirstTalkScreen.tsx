import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { Icon } from '../components/Icon';
import { useVillage } from '../state/VillageProvider';

const questions = [
  {
    title: '안녕! 난 네 생각친구 티키야.',
    body: '우리 천천히 서로를 알아가 볼까? 틀린 답은 없으니까 편하게 이야기해 줘!',
  },
  { title: '친구들은 너를 어떻게 부르면 좋아?', body: '본명 대신 내가 불러 줄 별명을 알려 줘.' },
  {
    title: '어디에서 어느 학년 생활을 하고 있어?',
    body: '예를 들면 “새봄초등학교 2학년이야”처럼 말해 줘.',
  },
  {
    title: '요즘 가장 좋아하는 것은 뭐야?',
    body: '여러 개를 골라도 좋아. 네가 좋아하는 것으로 다음 모험을 만들게!',
  },
  {
    title: '우리가 같이 키워 보고 싶은 힘은 뭐야?',
    body: '나중에 바꾸고 싶으면 언제든지 다시 이야기해 줘.',
  },
] as const;
const interests = ['🦕 공룡', '🚀 우주', '🐶 동물', '🌳 식물', '⚽ 운동', '🎨 만들기'];
const goals = [
  '내 생각의 이유 말하기',
  '궁금한 것 질문하기',
  '새로운 것 자세히 보기',
  '내 생각을 길게 표현하기',
];

export function FirstTalkScreen() {
  const { data, update, toast } = useVillage();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(data.profile.name || '');
  const [grade, setGrade] = useState(data.profile.grade || '');
  const [likes, setLikes] = useState<string[]>(data.profile.interests);
  const [goal, setGoal] = useState(data.profile.goal || '');
  const ready =
    step === 0 ||
    (step === 1 && name.trim().length > 0) ||
    (step === 2 && grade.trim().length > 2) ||
    (step === 3 && likes.length > 0) ||
    (step === 4 && goal.length > 0);
  const next = () => {
    if (!ready) return;
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    update((previous) => ({
      ...previous,
      profile: {
        name: name.trim(),
        grade: grade.trim(),
        interests: likes.map((item) => item.replace(/^\S+\s/, '')),
        goal,
      },
      consent: {
        ...previous.consent,
        done: true,
        guardian: '보호자 계정과 연결',
        noticeAt: new Date().toISOString(),
      },
      onboarding: { ...previous.onboarding, step: 4, acknowledged: true, childPolicy: true },
    }));
    toast(`${name.trim()}와 티키가 친구가 됐어요!`);
    navigate('/talk');
  };
  return (
    <div className="first-talk-page">
      <header className="first-talk-head">
        <Link to="/" className="icon-btn">
          <Icon name="close" />
        </Link>
        <div>
          <span>티키와 첫 인사</span>
          <div className="dots">
            {questions.map((_, index) => (
              <i className={index <= step ? 'on' : ''} key={index} />
            ))}
          </div>
        </div>
        <small>
          {step + 1} / {questions.length}
        </small>
      </header>
      <div className="first-talk-stage">
        <section className="first-buddy">
          <div className="first-buddy-face">🌱</div>
          <strong>생각친구 티키</strong>
          <p>{step === 0 ? '너를 만나서 반가워!' : '네 이야기를 잘 듣고 있어.'}</p>
        </section>
        <section className="first-chat">
          <div className="ai-bubble">
            <span className="bubble-name">🌱 티키</span>
            <h1>{questions[step]!.title}</h1>
            <p>{questions[step]!.body}</p>
          </div>
          <div className="first-answer">
            {step === 0 && (
              <div className="hello-visual">
                <span>👋</span>
                <p>
                  어떤 말이든 편하게 해도 돼.
                  <br />네 말을 소중하게 기억할게!
                </p>
              </div>
            )}
            {step === 1 && (
              <label className="talk-input">
                <span>내가 불러 줄 별명</span>
                <input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="예: 지우, 별빛이"
                />
              </label>
            )}
            {step === 2 && (
              <label className="talk-input">
                <span>소속과 학년</span>
                <input
                  autoFocus
                  value={grade}
                  onChange={(event) => setGrade(event.target.value)}
                  placeholder="예: 새봄초등학교 2학년"
                />
              </label>
            )}
            {step === 3 && (
              <div className="first-options">
                {interests.map((item) => (
                  <button
                    className={likes.includes(item) ? 'selected' : ''}
                    onClick={() =>
                      setLikes((current) =>
                        current.includes(item)
                          ? current.filter((value) => value !== item)
                          : [...current, item],
                      )
                    }
                    key={item}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
            {step === 4 && (
              <div className="goal-options">
                {goals.map((item) => (
                  <button
                    className={goal === item ? 'selected' : ''}
                    onClick={() => setGoal(item)}
                    key={item}
                  >
                    <span>{goal === item ? '✓' : '○'}</span>
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="conversation-actions">
            <button
              className="text-back"
              disabled={step === 0}
              onClick={() => setStep(Math.max(0, step - 1))}
            >
              ← 이전
            </button>
            <Button disabled={!ready} onClick={next}>
              {step === 0
                ? '응, 인사할래!'
                : step === 4
                  ? '내 첫 이야기 시작'
                  : '티키에게 말해 줄게'}{' '}
              <Icon name="arrow" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
