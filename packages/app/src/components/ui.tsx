import { useId, useState } from 'react';
import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { count } from '../lib/learning';
import { RUBRIC } from '../data/catalog';
import type { Rubric } from '../types/village';
import { useVillage } from '../providers/VillageProvider';

export function Button({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`btn ${className}`} {...props}>
      {children}
    </button>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="eyebrow">{eyebrow}</div>
      <div className="row between wrap">
        <h1>{title}</h1>
        {children}
      </div>
      <p>{description}</p>
    </header>
  );
}
export function Notice({ children, variant = 'neutral' }: PropsWithChildren<{ variant?: string }>) {
  return (
    <div className={`notice ${variant}`}>
      <Icon name="info" />
      <div>{children}</div>
    </div>
  );
}
export function Provenance({ mock = false }: { mock?: boolean }) {
  return (
    <div className="provenance">
      <span>{mock ? '예시 목데이터' : '규칙 기반 체험'}</span>
      <span>실제 AI 호출 0회</span>
      <span>콘텐츠 사람 검수: 미완료</span>
    </div>
  );
}
export function Steps({ labels, current }: { labels: readonly string[]; current: number }) {
  return (
    <ol className="steps" aria-label="진행 단계">
      {labels.map((label, i) => (
        <li
          key={label}
          className={`step ${i === current ? 'current' : i < current ? 'done' : ''}`}
          aria-current={i === current ? 'step' : undefined}
        >
          {i < current ? '✓' : String(i + 1).padStart(2, '0')} &nbsp;{label}
        </li>
      ))}
    </ol>
  );
}
export function WritingGate({
  value,
  onChange,
  min,
  label = '내 생각을 먼저 써요',
  placeholder = '눈에 들어온 단서와 내 생각을 적어 보세요.',
}: {
  value: string;
  onChange: (value: string) => void;
  min: number;
  label?: string;
  placeholder?: string;
}) {
  const id = useId(),
    n = count(value);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={2000}
        placeholder={placeholder}
        aria-describedby={`${id}-count`}
      />
      <div id={`${id}-count`} className={`counter ${n >= min ? 'ready' : ''}`} aria-live="polite">
        <span>
          {n >= min
            ? '✓ 내 문장을 꺼낼 준비가 됐어요.'
            : `공백을 빼고 ${min}자 이상, 천천히 적어 보세요.`}
        </span>
        <span>
          {n} / {min}자
        </span>
      </div>
      <div className="gate-meter" aria-hidden="true">
        <span style={{ width: `${Math.min(100, (n / min) * 100)}%` }} />
      </div>
    </div>
  );
}
export function RubricBars({ rubric }: { rubric: Rubric }) {
  return (
    <>
      <div className="rubric">
        {RUBRIC.map(({ key, label, color, symbol }) => (
          <div key={key} className="rubric-row">
            <span>
              {symbol} {label}
            </span>
            <div className="bar">
              <span style={{ width: `${rubric[key]}%`, background: `var(${color})` }} />
            </div>
            <span>{rubric[key]}점</span>
          </div>
        ))}
      </div>
      <small className="muted">
        문장 길이·관찰 표현·이유 표현으로 계산한 활동 참고값이에요. 능력 평가가 아니에요.
      </small>
    </>
  );
}
export function EmptyState({
  icon = 'book',
  title,
  description,
  to = '/adventures',
  action = '모험 만나기',
}: {
  icon?: string;
  title: string;
  description: string;
  to?: string;
  action?: string;
}) {
  return (
    <div className="panel empty">
      <Icon name={icon} />
      <h2>{title}</h2>
      <p>{description}</p>
      <Link className="btn" to={to}>
        {action}
        <Icon name="arrow" />
      </Link>
    </div>
  );
}
export function ReadAloud({ text }: { text: string }) {
  const { data, toast } = useVillage();
  if (!data.settings.tts) return null;
  const speak = () => {
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      toast('이 브라우저는 읽어 주기를 지원하지 않아요.');
      return;
    }
    const voice = speechSynthesis
      .getVoices()
      .find((v) => v.lang.startsWith('ko') && v.localService);
    if (!voice) {
      toast('설치된 한국어 음성이 없어요. 화면의 글로 함께 읽어 주세요.');
      return;
    }
    speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.voice = voice;
    speech.lang = 'ko-KR';
    speech.rate = 0.85;
    speech.onerror = () => toast('음성을 재생하지 못했어요.');
    speechSynthesis.speak(speech);
  };
  return (
    <Button className="ghost small" onClick={speak}>
      <Icon name="sound" />
      이야기 듣기
    </Button>
  );
}
export function DiscardDraft({ onDone }: { onDone?: () => void }) {
  const { update, toast } = useVillage();
  const [armed, setArmed] = useState(false);
  return armed ? (
    <div className="notice error">
      <div>
        작성 중인 문장은 삭제돼요. 완료한 책장 기록은 남아요.
        <div className="actions">
          <Button className="light small" onClick={() => setArmed(false)}>
            계속 보관
          </Button>
          <Button
            className="danger small"
            onClick={() => {
              update((p) => ({ ...p, resume: null }));
              toast('작성 중인 모험을 정리했어요.');
              onDone?.();
            }}
          >
            작성 중인 모험 삭제
          </Button>
        </div>
      </div>
    </div>
  ) : (
    <Button className="ghost small" onClick={() => setArmed(true)}>
      다른 모험을 새로 시작하고 싶어요
    </Button>
  );
}
