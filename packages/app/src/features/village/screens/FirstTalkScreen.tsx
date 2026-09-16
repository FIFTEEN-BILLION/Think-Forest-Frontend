import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui';
import { Icon } from '../components/Icon';
import { useVillage } from '../state/VillageProvider';
import { safeNext } from '../lib/navigation';

type Field = 'intro' | 'name' | 'grade' | 'interests' | 'detail' | 'goal' | 'confirm';
type Message = { id: string; role: 'tiki' | 'child'; text: string };
type DraftProfile = { name: string; grade: string; likes: string[]; detail: string; goal: string };
type SpeechEvent = { results: ArrayLike<{ 0: { transcript: string } }> };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

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

const clean = (value: string) => value.trim().replace(/[.!?~]+$/, '');
function extractIntro(text: string, current: DraftProfile): DraftProfile {
  const source = clean(text);
  const name =
    source.match(/(?:이름은|별명은|나를)\s*([\uAC00-\uD7A3A-Za-z0-9]{1,10})/)?.[1] ??
    source.match(/나는\s*([\uAC00-\uD7A3]{2,6})(?:이야|야|라고)/)?.[1] ??
    current.name;
  const school =
    source.match(/([\uAC00-\uD7A3A-Za-z0-9]+(?:초등학교|중학교|유치원|학교|초))/)?.[1] ?? '';
  const grade = source.match(/(\d\s*학년)/)?.[1]?.replace(/\s/g, '') ?? '';
  const age = source.match(/(\d{1,2}살)/)?.[1] ?? '';
  const foundLikes = interestOptions
    .map(([, label]) => label)
    .filter((label) => source.includes(label));
  const goal = goalOptions.find((option) => {
    if (option.includes('이유')) return source.includes('이유');
    if (option.includes('질문')) return source.includes('질문');
    if (option.includes('자세히')) return source.includes('관찰') || source.includes('자세히');
    return source.includes('길게') || source.includes('표현');
  });
  return {
    ...current,
    name: name || '',
    grade: [school, grade || age].filter(Boolean).join(' ') || current.grade,
    likes: [...new Set([...current.likes, ...foundLikes])],
    goal: goal ?? current.goal,
  };
}
function nextMissing(profile: DraftProfile): Field {
  if (!profile.name) return 'name';
  if (
    !profile.grade ||
    !/(학교|초|중|유치원)/.test(profile.grade) ||
    !/(학년|살)/.test(profile.grade)
  )
    return 'grade';
  if (!profile.likes.length) return 'interests';
  if (!profile.detail) return 'detail';
  if (!profile.goal) return 'goal';
  return 'confirm';
}
function questionFor(field: Field, profile: DraftProfile) {
  if (field === 'name') return '너를 어떻게 부르면 좋을지 알려 줄래? 진짜 이름이 아닌 별명도 좋아.';
  if (field === 'grade')
    return `${profile.name}아, 어디에서 어느 학년 생활을 하고 있어? “새봄초등학교 2학년이야”처럼 말해 줘.`;
  if (field === 'interests')
    return `${profile.name}는 요즘 무엇을 가장 좋아해? 여러 개를 알려 줘도 좋아!`;
  if (field === 'detail')
    return `${profile.likes[0]}을 좋아하는구나! 그중에서도 무엇이 제일 좋은지, 왜 좋은지 더 이야기해 줄래?`;
  if (field === 'goal')
    return `${profile.detail ? `“${profile.detail}”라고 말한 부분이 재미있다! ` : ''}앞으로 나와 이야기하며 어떤 힘을 키워 보고 싶어?`;
  return `좋아, ${profile.name}에 대해 이렇게 이해했어. 내가 잘 기억했는지 함께 확인해 볼까?`;
}

export function FirstTalkScreen() {
  const { update, toast } = useVillage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [field, setField] = useState<Field>('intro');
  const [input, setInput] = useState('');
  const [selectedLikes, setSelectedLikes] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [profile, setProfile] = useState<DraftProfile>({
    name: '',
    grade: '',
    likes: [],
    detail: '',
    goal: '',
  });
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'hello',
      role: 'tiki',
      text: '안녕! 난 네 생각친구 티키야. 나한테 너를 자유롭게 소개해 볼래? 어떻게 부르면 좋은지, 어디에 다니는지, 무엇을 좋아하는지처럼 말하고 싶은 것부터 이야기해 줘!',
    },
  ]);
  const recognition = useRef<Recognition | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => () => recognition.current?.stop(), []);
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);
  const addExchange = (answer: string, nextProfile: DraftProfile, nextField: Field) => {
    setMessages((current) => [
      ...current,
      { id: `child-${current.length}`, role: 'child', text: answer },
      { id: `tiki-${current.length + 1}`, role: 'tiki', text: questionFor(nextField, nextProfile) },
    ]);
    setProfile(nextProfile);
    setField(nextField);
    setInput('');
    setSelectedLikes([]);
  };
  const submit = () => {
    if (field === 'confirm') {
      update((previous) => ({
        ...previous,
        profile: {
          name: profile.name,
          grade: profile.grade,
          interests: [...profile.likes, profile.detail].filter(Boolean),
          goal: profile.goal,
        },
        consent: {
          ...previous.consent,
          done: true,
          guardian: '보호자 계정과 연결',
          noticeAt: new Date().toISOString(),
        },
        onboarding: { ...previous.onboarding, step: 4, acknowledged: true, childPolicy: true },
      }));
      toast(`${profile.name}와 티키가 친구가 됐어요!`);
      navigate(safeNext(params.get('next'), '/talk'));
      return;
    }
    const answer =
      field === 'interests'
        ? [...selectedLikes, clean(input)].filter(Boolean).join(', ')
        : clean(input);
    if (!answer) {
      toast('티키에게 하고 싶은 말을 알려 줘!');
      return;
    }
    let next = { ...profile };
    if (field === 'intro') next = extractIntro(answer, profile);
    if (field === 'name') next.name = answer;
    if (field === 'grade') next.grade = answer;
    if (field === 'interests')
      next.likes = [
        ...new Set([
          ...selectedLikes,
          ...interestOptions.map(([, label]) => label).filter((label) => answer.includes(label)),
          ...(input && !interestOptions.some(([, label]) => input.includes(label))
            ? [clean(input)]
            : []),
        ]),
      ];
    if (field === 'detail') next.detail = answer;
    if (field === 'goal') next.goal = answer;
    const nextField = nextMissing(next);
    const found =
      field === 'intro'
        ? [
            next.name && `${next.name}라고 부르면 되는구나`,
            next.grade && `${next.grade}에서 생활하고 있고`,
            next.likes.length && `${next.likes.join(', ')}을 좋아하네`,
          ]
            .filter(Boolean)
            .join('. ')
        : '';
    const acknowledgedProfile = next;
    if (found) {
      setMessages((current) => [
        ...current,
        { id: `child-${current.length}`, role: 'child', text: answer },
        {
          id: `tiki-ack-${current.length}`,
          role: 'tiki',
          text: `${found}! 잘 기억할게. ${questionFor(nextField, acknowledgedProfile)}`,
        },
      ]);
      setProfile(next);
      setField(nextField);
      setInput('');
      return;
    }
    addExchange(answer, next, nextField);
  };
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
        setInput(
          field === 'intro'
            ? '나는 지우야. 새봄초등학교 2학년이고 공룡을 정말 좋아해!'
            : '내 생각을 이유와 함께 길게 말하고 싶어.',
        );
        setListening(false);
      }, 1200);
      return;
    }
    const instance = new SpeechRecognition();
    recognition.current = instance;
    instance.lang = 'ko-KR';
    instance.interimResults = true;
    instance.continuous = false;
    instance.onresult = (event) =>
      setInput(
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
  return (
    <div className="first-talk-page adaptive-intro">
      <header className="first-talk-head">
        <Link to="/" className="icon-btn">
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
          <div className="extract-status">
            <span className={profile.name ? 'done' : ''}>별명 {profile.name && '✓'}</span>
            <span className={profile.grade ? 'done' : ''}>소속·학년 {profile.grade && '✓'}</span>
            <span className={profile.likes.length ? 'done' : ''}>
              좋아하는 것 {profile.likes.length > 0 && '✓'}
            </span>
            <span className={profile.goal ? 'done' : ''}>키우고 싶은 힘 {profile.goal && '✓'}</span>
          </div>
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
          <div
            className="first-conversation-thread adaptive-thread"
            ref={threadRef}
            aria-live="polite"
          >
            {messages.map((message) =>
              message.role === 'tiki' ? (
                <div className="chat-message ai-message" key={message.id}>
                  <span className="message-avatar">🌱</span>
                  <div>
                    <span className="message-name">티키</span>
                    <div className="first-message-copy">
                      <p>{message.text}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="chat-message child-message" key={message.id}>
                  <div>
                    <span className="message-name">{profile.name || '나'}</span>
                    <p>{message.text}</p>
                  </div>
                  <span className="message-avatar child-avatar">
                    {(profile.name || '나').slice(0, 1)}
                  </span>
                </div>
              ),
            )}
          </div>
          {field === 'confirm' ? (
            <div className="first-answer">
              <div className="profile-confirm">
                <span className="profile-confirm-avatar">{profile.name.slice(0, 1) || '🌱'}</span>
                <div>
                  <strong>{profile.name}의 생각 프로필</strong>
                  <p>{profile.grade}</p>
                </div>
                <dl>
                  <dt>좋아하는 것</dt>
                  <dd>{profile.likes.join(' · ')}</dd>
                  <dt>더 알게 된 것</dt>
                  <dd>{profile.detail}</dd>
                  <dt>키우고 싶은 힘</dt>
                  <dd>{profile.goal}</dd>
                </dl>
              </div>
            </div>
          ) : (
            <div className="adaptive-composer">
              {field === 'interests' && (
                <div className="intro-suggestions">
                  {interestOptions.map(([emoji, label]) => (
                    <button
                      className={selectedLikes.includes(label) ? 'selected' : ''}
                      onClick={() =>
                        setSelectedLikes((current) =>
                          current.includes(label)
                            ? current.filter((item) => item !== label)
                            : [...current, label],
                        )
                      }
                      key={label}
                    >
                      {emoji} {label}
                    </button>
                  ))}
                </div>
              )}
              {field === 'goal' && (
                <div className="goal-suggestions">
                  {goalOptions.map((option) => (
                    <button onClick={() => setInput(option)} key={option}>
                      {option}
                    </button>
                  ))}
                </div>
              )}
              <div className={`intro-input ${listening ? 'is-listening' : ''}`}>
                <textarea
                  autoFocus
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={
                    field === 'intro'
                      ? '예: 나는 지우야. 2학년이고 공룡을 좋아해!'
                      : '티키에게 편하게 말해 줘…'
                  }
                />
                <button
                  className={listening ? 'active' : ''}
                  onClick={listen}
                  aria-label="음성으로 말하기"
                >
                  <Icon name={listening ? 'pause' : 'mic'} />
                </button>
              </div>
            </div>
          )}
          <div className="conversation-actions">
            <span className="adaptive-help">
              {field === 'confirm'
                ? '설정에서 언제든 바꿀 수 있어요.'
                : '길게 말해도, 짧게 말해도 괜찮아요.'}
            </span>
            <Button
              disabled={field !== 'confirm' && !input.trim() && !selectedLikes.length}
              onClick={submit}
            >
              {field === 'confirm' ? '응, 맞아! 첫 이야기 시작' : '티키에게 말하기'}{' '}
              <Icon name="arrow" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
