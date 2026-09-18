import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { VARIABLE_NAME, changedVars } from '../lib/shadow';
import { SKILL_LABEL, SKILL_LEVEL_LABEL } from '../lib/thinking';
import type { AiSource, ShadowSetup, SkillResult } from '../types/village';

// The same affine scale keeps light, stick top and shadow end on one straight ray.
const KX = 60,
  KY = 23,
  GROUND = 232,
  STICK_X = 270;
const LIGHT = { low: 4, mid: 6, high: 9 },
  STICK = { short: 1, tall: 2 },
  DISTANCE = { near: 2, far: 4 };

export function ShadowFigure({
  setup,
  length,
  caption,
}: {
  setup: ShadowSetup;
  length: number;
  caption: string;
}) {
  const lightX = STICK_X - DISTANCE[setup.distance] * KX,
    lightY = GROUND - LIGHT[setup.lightHeight] * KY,
    topY = GROUND - STICK[setup.stickHeight] * KY,
    end = STICK_X + length * KX,
    bright = setup.brightness === 'bright';
  return (
    <svg className="shadow-scene" viewBox="0 0 560 262" role="img" aria-label={caption}>
      <path d={`M20 ${GROUND + 1}H545`} stroke="var(--line-strong)" strokeWidth="2" />
      <path
        d={`M${lightX} ${lightY} ${STICK_X} ${topY} ${end} ${GROUND}Z`}
        fill="var(--gold)"
        opacity=".12"
      />
      <path
        d={`M${lightX} ${lightY} ${STICK_X} ${topY} ${end} ${GROUND}`}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="2"
        strokeDasharray="5 5"
      />
      <path
        d={`M${STICK_X} ${GROUND + 1}H${end}`}
        stroke="var(--teal)"
        opacity=".45"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <rect
        x={STICK_X - 6}
        y={topY}
        width="12"
        height={GROUND - topY}
        rx="4"
        fill="var(--ink-500)"
      />
      {bright && <circle cx={lightX} cy={lightY} r="27" fill="var(--gold)" opacity=".25" />}
      <circle cx={lightX} cy={lightY} r={bright ? 15 : 12} fill="var(--gold)" />
      <text x={lightX + 26} y={lightY + 6} textAnchor="start">
        빛
      </text>
      <text x={STICK_X - 12} y={GROUND + 24} textAnchor="end">
        막대기
      </text>
      <text x={Math.max(STICK_X + 30, (STICK_X + end) / 2)} y={GROUND + 24} textAnchor="middle">
        그림자
      </text>
    </svg>
  );
}

export function ExperimentPair({
  e,
}: {
  e: { base: ShadowSetup; compare: ShadowSetup; baseLength: number; compareLength: number };
}) {
  const changed = changedVars(e.base, e.compare).map((k) => VARIABLE_NAME[k]);
  return (
    <div className="experiment-pair">
      <figure>
        <ShadowFigure setup={e.base} length={e.baseLength} caption="A 처음 장면 모형" />
        <figcaption>A · 처음 장면</figcaption>
      </figure>
      <figure>
        <ShadowFigure
          setup={e.compare}
          length={e.compareLength}
          caption={`B ${changed.join(', ')}을 바꾼 장면 모형`}
        />
        <figcaption>B · {changed.join(', ')} 바꿈</figcaption>
      </figure>
    </div>
  );
}

export function FriendBubble({
  source,
  children,
}: {
  source: AiSource | null;
  children: ReactNode;
}) {
  return (
    <div className="friend-bubble">
      <span className="friend-avatar" aria-hidden="true">
        <Icon name="leaf" />
      </span>
      <div>
        <span className={`tag ${source === 'fallback' ? 'gold' : 'teal'}`}>
          {source === 'ai'
            ? '생각 친구 · AI'
            : source === 'fallback'
              ? '생각 친구 · 준비된 대사'
              : '생각 친구'}
        </span>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function ChoiceGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="field">
      <span className="choice-label">{label}</span>
      <div className="choice-chips" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            type="button"
            key={String(o.value)}
            className={`choice-chip ${value === o.value ? 'selected' : ''}`}
            aria-pressed={value === o.value}
            disabled={disabled}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function VoicePlaceholder() {
  return (
    <div className="voice-row">
      <button type="button" className="btn light small" disabled aria-describedby="voice-soon">
        <Icon name="chat" />
        말로 하기
      </button>
      <small id="voice-soon">음성 입력은 곧 열려요. 지금은 글이나 예시로 이어가요.</small>
    </div>
  );
}

export function ThinkingSkillsCard({ skills }: { skills: SkillResult[] }) {
  return (
    <section className="panel space-top">
      <h2>이번 탐구에서 쓴 생각 기술</h2>
      <p className="muted">점수가 아니라, 실제로 한 행동을 기준으로 적었어요.</p>
      <ul className="skill-list">
        {skills.map((s) => (
          <li key={s.skill} className={`skill-row ${s.level}`}>
            <strong>{SKILL_LABEL[s.skill].name}</strong>
            <span className={`tag ${s.level === 'notShown' ? '' : 'teal'}`}>
              {SKILL_LEVEL_LABEL[s.level]}
            </span>
            <small>{SKILL_LABEL[s.skill].describe}</small>
            {s.level !== 'notShown' && s.quote.trim() && <blockquote>{s.quote}</blockquote>}
          </li>
        ))}
      </ul>
    </section>
  );
}
