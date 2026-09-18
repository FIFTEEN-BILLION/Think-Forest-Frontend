import { useEffect, useState } from 'react';
import { ThinkingSkillsCard } from './ThinkingParts';
import {
  GRID,
  OUTCOME_TEXT,
  PATH_SKILL_LABEL,
  derivePathSkills,
  innerText,
  programText,
  rowCol,
  runProgram,
  stepText,
} from '../lib/path';
import type {
  Heading,
  InnerStep,
  PathInquiry,
  PathMap,
  PathRun,
  ProgramStep,
} from '../types/village';

const ARROW: Record<Heading, string> = { up: '↑', right: '→', down: '↓', left: '←' };
export type TikiEffect = 'splash' | 'bump' | 'arrive' | null;

function cellLabel(map: PathMap, cell: number, tiki: boolean) {
  const [r, c] = rowCol(cell);
  const what =
    cell === map.goal
      ? '우체국'
      : map.puddles.includes(cell)
        ? '물웅덩이'
        : tiki
          ? '티키가 있는 길'
          : '길';
  return `${r + 1}번째 줄 ${c + 1}번째 칸, ${what}`;
}

// A 5×5 board of real buttons so taps and keyboard both work.
export function GridWorld({
  map,
  tiki,
  effect = null,
  trail = [],
  highlight = null,
  marked = [],
  predicted = null,
  onCell,
  caption,
}: {
  map: PathMap;
  tiki: { cell: number; heading: Heading };
  effect?: TikiEffect;
  trail?: number[];
  highlight?: number | null;
  marked?: number[];
  predicted?: number | null;
  onCell?: (cell: number) => void;
  caption: string;
}) {
  return (
    <figure className="path-world">
      <div className="path-grid" role="group" aria-label={caption}>
        {Array.from({ length: GRID * GRID }, (_, cell) => {
          const here = tiki.cell === cell;
          const classes = [
            'path-cell',
            map.puddles.includes(cell) ? 'puddle' : 'road',
            cell === map.goal ? 'goal' : '',
            trail.includes(cell) ? 'trail' : '',
            highlight === cell ? 'highlight' : '',
            marked.includes(cell) ? 'marked' : '',
            predicted === cell ? 'predicted' : '',
          ].join(' ');
          return (
            <button
              type="button"
              key={cell}
              className={classes}
              aria-label={cellLabel(map, cell, here)}
              aria-pressed={onCell ? predicted === cell : undefined}
              disabled={!onCell}
              onClick={() => onCell?.(cell)}
            >
              {cell === map.goal && <span className="path-goal">📮</span>}
              {map.puddles.includes(cell) && <span className="path-puddle" aria-hidden="true" />}
              {predicted === cell && !here && <span className="path-guess">예상</span>}
              {here && (
                <span className={`path-tiki ${effect ?? ''}`} aria-hidden="true">
                  <span className="path-tiki-face">•ᴗ•</span>
                  <span className="path-tiki-arrow">{ARROW[tiki.heading]}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

const reduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

// Replays a stored run from the deterministic engine, one event at a time.
export function useRunReplay(run: PathRun | null, speed = 380) {
  const trace = run ? runProgram(run.map, run.program) : null;
  const total = trace ? trace.events.length : 0;
  const runId = run?.id ?? '';
  const [tick, setTick] = useState({ runId: '', index: 0 });
  useEffect(() => {
    if (!runId || reduceMotion()) return;
    let i = 0;
    const timer = window.setInterval(() => {
      i++;
      setTick({ runId, index: i });
      if (i >= total) window.clearInterval(timer);
    }, speed);
    return () => window.clearInterval(timer);
  }, [runId, total, speed]);
  const index = tick.runId === runId ? tick.index : reduceMotion() ? total : 0;
  const done = !trace || index >= total;
  const shown = trace ? trace.events.slice(0, index) : [];
  const last = shown[shown.length - 1];
  const effect: TikiEffect = !done
    ? null
    : trace?.outcome === 'splashed'
      ? 'splash'
      : trace?.outcome === 'bumped'
        ? 'bump'
        : trace?.outcome === 'arrived'
          ? 'arrive'
          : null;
  return {
    trace,
    done,
    effect,
    tiki: last
      ? { cell: last.cell, heading: last.heading }
      : run
        ? { cell: run.map.start, heading: run.map.heading }
        : null,
    trail: run
      ? [
          run.map.start,
          ...shown.filter((e) => e.kind === 'move' || e.kind === 'splash').map((e) => e.cell),
        ]
      : [],
    activeTop: !done && last ? last.top : null,
  };
}

const ICON: Record<ProgramStep['op'], string> = {
  move: '👣',
  turn: '↪️',
  stop: '✋',
  if: '🤔',
  repeat: '🔁',
};

function Inner({ step }: { step: InnerStep }) {
  if (step.op !== 'if') return <span>{stepText(step)}</span>;
  return (
    <span className="block-if">
      <strong>{stepText(step)}</strong>
      <span className="block-branch">
        → {step.then.map(stepText).join(', ') || '아무것도 안 하기'}
      </span>
      {step.else.length > 0 && (
        <span className="block-branch">아니면 → {step.else.map(stepText).join(', ')}</span>
      )}
    </span>
  );
}

// "티키 머릿속": what 티키 understood, as blocks. Read-only; the child changes it by talking.
export function ProgramView({
  program,
  activeTop = null,
}: {
  program: ProgramStep[];
  activeTop?: number | null;
}) {
  if (!program.length)
    return <p className="muted">아직 비어 있어. 티키에게 어떻게 갈지 말해 줘.</p>;
  return (
    <ol className="program-blocks" aria-label="티키가 알아들은 순서">
      {program.map((step, i) => (
        <li key={i} className={`program-block ${step.op} ${activeTop === i ? 'active' : ''}`}>
          <span className="block-icon" aria-hidden="true">
            {ICON[step.op]}
          </span>
          {step.op === 'repeat' ? (
            <span className="block-if">
              <strong>{stepText(step)}</strong>
              {step.body.map((s, j) => (
                <span className="block-branch" key={j}>
                  · {innerText(s)}
                </span>
              ))}
            </span>
          ) : (
            <Inner step={step as InnerStep} />
          )}
        </li>
      ))}
    </ol>
  );
}

// Built only from recorded talk and runs; no AI summary is generated.
export function PathRecordCard({ path: q }: { path: PathInquiry }) {
  const skills = q.skills.length ? q.skills : derivePathSkills(q);
  const said = q.turns.filter((t) => t.kind !== 'unmapped');
  const firstWin = q.runs.find((r) => r.outcome === 'arrived');
  const lastWin = [...q.runs].reverse().find((r) => r.outcome === 'arrived');
  const tries = q.runs.length;
  return (
    <div className="inquiry-comparison path-record">
      <div className="thought-pair">
        <section className="panel thought-before">
          <span className="tag">처음 한 말</span>
          <blockquote>{said[0]?.text ?? '아직 없음'}</blockquote>
          {q.runs[0] && <p>결과: {OUTCOME_TEXT[q.runs[0].outcome]}</p>}
        </section>
        <section className="panel thought-after">
          <span className="tag teal">도착한 말</span>
          {lastWin ? (
            <pre className="program-text">{programText(lastWin.program)}</pre>
          ) : (
            <p className="muted">아직 없음</p>
          )}
        </section>
      </div>
      <section className="panel space-top">
        <h2>티키와 한 배달</h2>
        <p>
          {tries}번 움직였고, 우체국에 {q.runs.filter((r) => r.outcome === 'arrived').length}번
          도착했어요.
          {firstWin && ` 첫 도착까지 ${q.runs.indexOf(firstWin) + 1}번 시도했어요.`}
        </p>
        <h2>고쳐서 다시 한 말</h2>
        {said.length > 1 ? (
          <ul className="said-list">
            {said.slice(1).map((t) => (
              <li key={t.id}>
                “{t.text}”{t.chosen ? ` → ${t.chosen}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">아직 없음</p>
        )}
        {q.noChallengeLeft && <p>티키가 “네 말은 이제 못 이기겠어!”라고 했어요.</p>}
      </section>
      <ThinkingSkillsCard
        skills={skills}
        labels={PATH_SKILL_LABEL}
        title="이번 배달에서 쓴 생각 기술"
      />
      <p className="inquiry-footnote">
        티키가 말을 알아듣고 반응하고 도전 지도를 고르는 건 AI예요. 티키가 실제로 어디로
        움직였는지는 정해진 규칙 엔진이 계산했어요.
      </p>
    </div>
  );
}
