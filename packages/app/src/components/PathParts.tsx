import { GRID, innerText, rowCol, stepText } from '../lib/path';
import type { Heading, InnerStep, PathMap, ProgramStep } from '../types/village';

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
