import type {
  Draft,
  Heading,
  InnerStep,
  LearningEvent,
  LeafStep,
  PathInquiry,
  PathMap,
  PathOutcome,
  PathRun,
  PathSkillId,
  PathSkillResult,
  ProgramStep,
  Sensor,
  SensorState,
  SkillLevel,
} from '../types';
import { FIRST_MAP } from '../data/pathMaps';

// 티키 letter delivery. The child talks, 티키 (AI) turns the words into a literal program,
// and this deterministic engine runs it: 티키 splashes into puddles or bumps into walls
// exactly as told. AI never plans the path, and nothing here asks AI for a result.
export const GRID = 5;
export const MAX_PROGRAM = 8;
export const MAX_BODY = 4;
export const MAX_ACTIONS = 60;
export const MAX_RUNS = 60;
export const MAX_TURNS = 40;
export const MAX_HELP = 3;
export const CHALLENGES = 2;

export const PATH_STEPS = ['티키와 배달하기', '처음과 지금'];
export const PATH_STEP_HINTS = [
  '말로 티키에게 길을 알려 주고, 티키가 말 그대로 움직이는 걸 보며 고쳐요. 도착하면 티키가 도전 지도를 내요.',
  '처음 한 말과 고친 말, 내가 쓴 생각 기술을 돌아봐요.',
];
export const SENSOR_NAME: Record<Sensor, string> = { front: '앞', left: '왼쪽', right: '오른쪽' };
export const OUTCOME_TEXT: Record<PathOutcome, string> = {
  arrived: '우체국 도착',
  splashed: '웅덩이에 첨벙',
  bumped: '벽에 쿵',
  ended: '말한 걸 다 했는데 우체국이 아니야',
  loop: '같은 곳을 빙글빙글',
  tooLong: '너무 오래 걸었어',
};
export const PATH_SKILL_LABEL: Record<PathSkillId, { name: string; describe: string }> = {
  predict: { name: '먼저 예상하기', describe: '티키가 움직이기 전에 어디까지 갈지 예상했어요.' },
  precise: {
    name: '말을 분명하게 하기',
    describe: '티키가 헷갈리거나 말 그대로 움직인 걸 보고, 더 분명하게 다시 말했어요.',
  },
  revise: { name: '결과 보고 고치기', describe: '티키가 멈춘 결과를 보고 말을 고쳐 도착시켰어요.' },
  challenge: {
    name: '티키의 도전 이기기',
    describe: '티키가 낸 새 지도에서도 티키를 도착시켰어요.',
  },
  generalize: {
    name: '어떤 지도에도 통하는 말',
    describe: '티키가 네 말이 막히는 지도를 더 찾지 못했어요.',
  },
};

const HEADINGS: Heading[] = ['up', 'right', 'down', 'left'];
const DELTA: Record<Heading, [number, number]> = {
  up: [-1, 0],
  right: [0, 1],
  down: [1, 0],
  left: [0, -1],
};
const rotate = (h: Heading, turn: number) => HEADINGS[(HEADINGS.indexOf(h) + turn + 4) % 4]!;
export const rowCol = (cell: number): [number, number] => [Math.floor(cell / GRID), cell % GRID];
const isCell = (n: unknown): n is number =>
  Number.isInteger(n) && Number(n) >= 0 && Number(n) < GRID * GRID;

export function neighbor(cell: number, heading: Heading): number | null {
  const [r, c] = rowCol(cell);
  const [dr, dc] = DELTA[heading];
  const nr = r + dr,
    nc = c + dc;
  return nr < 0 || nc < 0 || nr >= GRID || nc >= GRID ? null : nr * GRID + nc;
}
const open = (map: PathMap, cell: number | null) => cell !== null && !map.puddles.includes(cell);
export function sense(map: PathMap, cell: number, heading: Heading): Record<Sensor, SensorState> {
  const state = (h: Heading): SensorState => (open(map, neighbor(cell, h)) ? 'open' : 'blocked');
  return {
    front: state(heading),
    left: state(rotate(heading, -1)),
    right: state(rotate(heading, 1)),
  };
}

export function hasPath(map: PathMap): boolean {
  if (!open(map, map.start) || !open(map, map.goal)) return false;
  const seen = new Set([map.start]);
  const queue = [map.start];
  while (queue.length) {
    const cell = queue.shift()!;
    if (cell === map.goal) return true;
    for (const h of HEADINGS) {
      const n = neighbor(cell, h);
      if (n !== null && open(map, n) && !seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return false;
}

// ---- program text -----------------------------------------------------------

export function stepText(step: LeafStep | InnerStep | ProgramStep): string {
  switch (step.op) {
    case 'move':
      return step.until === 'blocked'
        ? '막히기 전까지 쭉 앞으로'
        : `앞으로 ${Math.max(1, step.count ?? 1)}칸`;
    case 'turn':
      return step.dir === 'left' ? '왼쪽으로 돌기' : '오른쪽으로 돌기';
    case 'stop':
      return '멈추기';
    case 'if':
      return `만약 ${SENSOR_NAME[step.sensor ?? 'front']}이 ${step.state === 'open' ? '길이면' : '막혀 있으면'}`;
    case 'repeat':
      return '우체국에 갈 때까지 반복';
  }
}
export function innerText(s: InnerStep): string {
  if (s.op !== 'if') return stepText(s);
  const then = s.then.map(stepText).join(', ') || '아무것도 안 하기';
  return `${stepText(s)} ${then}${s.else.length ? `, 아니면 ${s.else.map(stepText).join(', ')}` : ''}`;
}
export function programText(program: ProgramStep[]): string {
  return program
    .map(
      (s, i) =>
        `${i + 1}. ${s.op === 'repeat' ? `${stepText(s)}: ${s.body.map(innerText).join(' / ')}` : innerText(s as InnerStep)}`,
    )
    .join('\n');
}

// ---- engine -----------------------------------------------------------------

export type PathEventKind = 'move' | 'turn' | 'bump' | 'splash' | 'arrive' | 'end';
export interface PathEvent {
  cell: number;
  heading: Heading;
  kind: PathEventKind;
  // Index of the top-level step that caused it, so the screen can light that block.
  top: number;
}
export interface PathTrace {
  events: PathEvent[];
  cells: number[];
  outcome: PathOutcome;
  stopCell: number;
  stopLabel: string | null;
}

class Halt {
  constructor(public outcome: PathOutcome) {}
}

export function runProgram(map: PathMap, program: ProgramStep[]): PathTrace {
  let cell = map.start,
    heading = map.heading,
    actions = 0,
    top = 0,
    lastStep: LeafStep | InnerStep | ProgramStep | null = null;
  const events: PathEvent[] = [];
  const push = (kind: PathEventKind) => events.push({ cell, heading, kind, top });
  const tick = () => {
    if (++actions > MAX_ACTIONS) throw new Halt('tooLong');
  };

  const leaf = (step: LeafStep) => {
    lastStep = step;
    if (step.op === 'stop') throw new Halt('ended');
    if (step.op === 'turn') {
      tick();
      heading = rotate(heading, step.dir === 'left' ? -1 : 1);
      push('turn');
      return;
    }
    const steps =
      step.until === 'blocked' ? GRID * GRID : Math.min(5, Math.max(1, step.count ?? 1));
    for (let i = 0; i < steps; i++) {
      const next = neighbor(cell, heading);
      if (step.until === 'blocked' && !open(map, next)) return;
      tick();
      if (next === null) {
        push('bump');
        throw new Halt('bumped');
      }
      cell = next;
      if (map.puddles.includes(cell)) {
        push('splash');
        throw new Halt('splashed');
      }
      push('move');
      if (cell === map.goal) {
        push('arrive');
        throw new Halt('arrived');
      }
    }
  };
  const inner = (step: InnerStep) => {
    if (step.op !== 'if') return leaf(step as LeafStep);
    lastStep = step;
    tick();
    const fits = sense(map, cell, heading)[step.sensor ?? 'front'] === (step.state ?? 'blocked');
    (fits ? step.then : step.else).forEach(leaf);
  };

  let outcome: PathOutcome = 'ended';
  try {
    program.forEach((step, i) => {
      top = i;
      if (step.op !== 'repeat') return inner(step as InnerStep);
      lastStep = step;
      if (!step.body.length) return;
      const seen = new Set<string>();
      for (;;) {
        const state = `${cell}:${heading}`;
        if (seen.has(state)) throw new Halt('loop');
        seen.add(state);
        tick();
        step.body.forEach(inner);
      }
    });
    push('end');
  } catch (e) {
    if (!(e instanceof Halt)) throw e;
    outcome = e.outcome;
  }
  const finalStep = lastStep as LeafStep | InnerStep | ProgramStep | null;
  return {
    events,
    cells: [
      map.start,
      ...events.filter((e) => e.kind === 'move' || e.kind === 'splash').map((e) => e.cell),
    ],
    outcome,
    stopCell: cell,
    stopLabel:
      outcome === 'arrived' || !finalStep || !program.length
        ? null
        : `${top + 1}번째 말: ${stepText(finalStep)}`,
  };
}

// ---- validation -------------------------------------------------------------

const record = (s: unknown): s is Record<string, unknown> => Boolean(s) && typeof s === 'object';
const leafOk = (s: unknown): s is LeafStep => {
  if (!record(s) || !['move', 'turn', 'stop'].includes(String(s.op))) return false;
  const count = s.count ?? null;
  return (
    (count === null || (Number.isInteger(count) && Number(count) >= 1 && Number(count) <= 5)) &&
    [null, undefined, 'blocked'].includes(s.until as string) &&
    [null, undefined, 'left', 'right'].includes(s.dir as string) &&
    (s.op !== 'turn' || s.dir === 'left' || s.dir === 'right')
  );
};
const innerOk = (s: unknown): s is InnerStep => {
  if (!record(s)) return false;
  if (s.op !== 'if') return leafOk(s);
  const then = s.then ?? [],
    otherwise = s.else ?? [];
  return (
    ['front', 'left', 'right'].includes(String(s.sensor)) &&
    ['open', 'blocked'].includes(String(s.state)) &&
    Array.isArray(then) &&
    Array.isArray(otherwise) &&
    then.length <= MAX_BODY &&
    otherwise.length <= MAX_BODY &&
    then.every(leafOk) &&
    otherwise.every(leafOk)
  );
};
export function isProgram(v: unknown): v is ProgramStep[] {
  return (
    Array.isArray(v) &&
    v.length <= MAX_PROGRAM &&
    v.every((s) => {
      if (!record(s)) return false;
      if (s.op !== 'repeat') return innerOk(s);
      const body = s.body ?? [];
      return Array.isArray(body) && body.length <= MAX_BODY && body.every(innerOk);
    })
  );
}
// Fills fields the API may omit so stored programs always have one shape.
export function normalizeProgram(program: ProgramStep[]): ProgramStep[] {
  const leaf = (s: LeafStep): LeafStep => ({
    op: s.op,
    count: s.op === 'move' ? (s.count ?? null) : null,
    until: s.op === 'move' ? (s.until ?? null) : null,
    dir: s.op === 'turn' ? (s.dir ?? null) : null,
  });
  const inner = (s: InnerStep): InnerStep => ({
    ...leaf(s as LeafStep),
    op: s.op,
    sensor: s.op === 'if' ? (s.sensor ?? null) : null,
    state: s.op === 'if' ? (s.state ?? null) : null,
    then: s.op === 'if' ? (s.then ?? []).map(leaf) : [],
    else: s.op === 'if' ? (s.else ?? []).map(leaf) : [],
  });
  return program.slice(0, MAX_PROGRAM).map((s) => ({
    ...inner(s as InnerStep),
    op: s.op,
    body: s.op === 'repeat' ? (s.body ?? []).slice(0, MAX_BODY).map(inner) : [],
  }));
}
export function isMap(v: unknown): v is PathMap {
  if (!record(v)) return false;
  return (
    typeof v.id === 'string' &&
    isCell(v.start) &&
    isCell(v.goal) &&
    HEADINGS.includes(v.heading as Heading) &&
    Array.isArray(v.puddles) &&
    v.puddles.every(isCell)
  );
}
const usesLogic = (program: ProgramStep[]) =>
  program.some((s) => s.op === 'repeat' || s.op === 'if');

// ---- 티키's challenge maps ----------------------------------------------------

export interface ChallengeCandidate {
  id: string;
  map: PathMap;
  summary: string;
  outcome: PathOutcome;
}
const place = (cell: number) => {
  const [r, c] = rowCol(cell);
  return `${r + 1}번째 줄 ${c + 1}번째 칸`;
};
// Deterministic: small changes to the map just won, kept only when a road exists and the
// child's current words no longer get 티키 there. AI only picks among these and taunts.
export function challengeCandidates(
  base: PathMap,
  program: ProgramStep[],
  used: PathMap[],
): ChallengeCandidate[] {
  const won = runProgram(base, program);
  const path = won.cells.filter((c) => c !== base.start && c !== base.goal);
  const keyOf = (puddles: number[]) => [...puddles].sort((a, b) => a - b).join(',');
  const usedKeys = new Set(used.map((m) => keyOf(m.puddles)));
  const options: { puddles: number[]; summary: string }[] = [
    ...path.map((cell) => ({
      puddles: [...base.puddles, cell],
      summary: `${place(cell)}에 웅덩이가 새로 생긴 지도`,
    })),
    ...base.puddles.map((cell) => ({
      puddles: base.puddles.filter((c) => c !== cell),
      summary: `${place(cell)} 웅덩이가 말라서 없어진 지도`,
    })),
    ...path.flatMap((add) =>
      base.puddles.map((remove) => ({
        puddles: [...base.puddles.filter((c) => c !== remove), add],
        summary: `${place(remove)} 웅덩이는 마르고 ${place(add)}에 새로 생긴 지도`,
      })),
    ),
  ];
  const seen = new Set<string>();
  const found: ChallengeCandidate[] = [];
  for (const option of options) {
    const key = keyOf(option.puddles);
    if (seen.has(key) || usedKeys.has(key)) continue;
    seen.add(key);
    const map: PathMap = {
      ...base,
      id: `challenge-${used.length}-${key || 'dry'}`,
      puddles: option.puddles,
    };
    if (!hasPath(map)) continue;
    const t = runProgram(map, program);
    if (t.outcome === 'arrived') continue;
    found.push({
      id: map.id,
      map,
      outcome: t.outcome,
      summary: `${option.summary}. 지금 말대로면 ${OUTCOME_TEXT[t.outcome]}`.slice(0, 60),
    });
    if (found.length >= 4) break;
  }
  return found;
}

// ---- deterministic lines ------------------------------------------------------

export function fallbackReaction(run: Pick<PathRun, 'outcome' | 'stopLabel'>, attempt: number) {
  const where = run.stopLabel ? ` (${run.stopLabel})` : '';
  const lines: Record<PathOutcome, string[]> = {
    arrived: ['도착! 편지 배달 성공이야. 네 말대로 했더니 됐어!', '우체국이다! 이번엔 딱 맞았어.'],
    splashed: [`첨벙! 네 말대로 갔더니 웅덩이에 빠졌어${where}.`, `으악, 발이 다 젖었어${where}.`],
    bumped: [`쿵! 말한 대로 갔더니 벽에 부딪혔어${where}.`, `아야, 벽이야${where}.`],
    ended: ['말해 준 걸 다 했는데, 여긴 우체국이 아니야.', '다 했는데… 우체국이 어디 있지?'],
    loop: ['어지러워, 같은 곳을 빙글빙글 돌았어.', '어? 아까 왔던 곳이잖아.'],
    tooLong: ['너무 오래 걸어서 다리가 아파. 잠깐 쉴게.', '한참 걸었는데 아직이야.'],
  };
  return lines[run.outcome][attempt % 2]!;
}
export function helpText(level: number, run: PathRun | null) {
  if (!run || level <= 0) return '';
  if (level === 1) return '티키가 멈춘 칸을 반짝이게 해 두었어. 그 칸 앞에 무엇이 있는지 봐.';
  if (level === 2)
    return run.stopLabel
      ? `티키는 “${run.stopLabel}”을 하다가 멈췄어. 그 말을 할 때 티키 앞이 어땠는지 떠올려 봐.`
      : '티키 머릿속에서 마지막으로 한 말을 찾아봐.';
  return '티키는 말한 것만 해. 웅덩이나 벽이 나오면 어떻게 할지 말해 주지 않으면 그냥 가 버려.';
}

// ---- state ------------------------------------------------------------------

export function emptyPath(): PathInquiry {
  return {
    version: 1,
    program: [],
    turns: [],
    runs: [],
    maps: [FIRST_MAP],
    wins: 0,
    awaitingChallenge: false,
    noChallengeLeft: false,
    prediction: null,
    help: 0,
    skills: [],
  };
}
export const currentMap = (q: PathInquiry) => q.maps[q.maps.length - 1] ?? FIRST_MAP;
export const lastRun = (q: PathInquiry): PathRun | null => q.runs[q.runs.length - 1] ?? null;
export const finished = (q: PathInquiry) => q.wins > CHALLENGES || q.noChallengeLeft;
const same = (a: ProgramStep[], b: ProgramStep[]) => JSON.stringify(a) === JSON.stringify(b);

function stepError(q: PathInquiry, step: number): string | null {
  if (step !== 0) return null;
  if (q.awaitingChallenge) return '티키가 도전 지도를 고르고 있어.';
  if (finished(q) || q.wins >= 1 || q.runs.length >= 5) return null;
  return '티키를 우체국까지 한 번 보내 보자.';
}
export function pathGuard(d: Draft): string | null {
  return d.path ? stepError(d.path, d.step) : '편지 배달 미션을 다시 열어 줘.';
}
export function pathComplete(d: Draft) {
  return Boolean(d.path && d.step === 1 && !stepError(d.path, 0));
}

// Levels come only from recorded events: runs, program changes and help the child asked for.
export function derivePathSkills(q: PathInquiry): PathSkillResult[] {
  const ladder = (help: number): SkillLevel =>
    help <= 0 ? 'independent' : help === 1 ? 'afterProbe' : 'afterExplanation';
  // A fix: a failed run followed, on the same map, by an arrival with different words.
  const fix = q.runs.find(
    (r, i) =>
      r.outcome === 'arrived' &&
      q.runs
        .slice(0, i)
        .some(
          (p) => p.map.id === r.map.id && p.outcome !== 'arrived' && !same(p.program, r.program),
        ),
  );
  const clarified = q.turns.find((t) => t.kind === 'clarify' && t.chosen);
  const literalFix = q.runs.find((r, i) => {
    const prev = q.runs[i - 1];
    return (
      prev &&
      ['splashed', 'bumped', 'ended'].includes(prev.outcome) &&
      prev.map.id === r.map.id &&
      !same(prev.program, r.program)
    );
  });
  const challengeWin = q.runs.find((r) => r.outcome === 'arrived' && r.map.id !== FIRST_MAP.id);
  const lastWin = [...q.runs].reverse().find((r) => r.outcome === 'arrived');
  return [
    {
      skill: 'predict',
      level: q.runs.some((r) => r.predicted !== null) ? 'independent' : 'notShown',
      quote: '',
    },
    {
      skill: 'precise',
      level: clarified || literalFix ? ladder(literalFix?.help ?? 0) : 'notShown',
      quote: clarified ? `${clarified.clarify?.question ?? ''} → ${clarified.chosen}` : '',
    },
    {
      skill: 'revise',
      level: fix ? ladder(fix.help) : 'notShown',
      quote: fix ? programText(fix.program) : '',
    },
    {
      skill: 'challenge',
      level: challengeWin ? ladder(challengeWin.help) : 'notShown',
      quote: challengeWin ? programText(challengeWin.program) : '',
    },
    {
      skill: 'generalize',
      level:
        q.noChallengeLeft && lastWin && usesLogic(lastWin.program) ? 'independent' : 'notShown',
      quote: q.noChallengeLeft && lastWin ? programText(lastWin.program) : '',
    },
  ];
}

export function pathTransition(
  draft: Draft,
  event: LearningEvent,
): { draft: Draft; error?: string } {
  const d = structuredClone(draft),
    q = d.path;
  if (!q) return { draft, error: '편지 배달 미션을 다시 열어 줘.' };
  const fail = (error: string) => ({ draft, error });
  const playing = d.step === 0 && !finished(q);

  switch (event.type) {
    case 'path-teach': {
      if (d.step !== 0) break;
      if (q.turns.length >= MAX_TURNS)
        return fail('오늘은 티키랑 이야기를 많이 했어. 마무리해 볼까?');
      if (event.program && !isProgram(event.program))
        return fail('티키가 말을 정리하지 못했어. 다시 말해 줄래?');
      q.turns.push({ ...event.turn, text: event.turn.text.slice(0, 200), chosen: null });
      if (event.program && event.turn.kind === 'program')
        q.program = normalizeProgram(event.program);
      break;
    }
    case 'path-clarify': {
      const turn = q.turns.find((t) => t.id === event.turnId);
      if (d.step !== 0 || !turn || turn.kind !== 'clarify' || turn.chosen) break;
      if (!isProgram(event.program)) return fail('다시 골라 줘.');
      turn.chosen = event.label.slice(0, 60);
      q.program = normalizeProgram(event.program);
      break;
    }
    case 'path-reset':
      if (d.step === 0) q.program = [];
      break;
    case 'path-predict':
      if (d.step === 0)
        q.prediction = event.cell === null || isCell(event.cell) ? event.cell : null;
      break;
    case 'path-run': {
      if (!playing) break;
      if (q.awaitingChallenge) return fail('티키가 도전 지도를 고르고 있어. 잠깐만!');
      if (!q.program.length) return fail('먼저 티키에게 어떻게 갈지 말해 줘.');
      if (q.runs.length >= MAX_RUNS) return fail('오늘은 충분히 많이 움직였어. 마무리해 볼까?');
      const map = currentMap(q);
      const t = runProgram(map, q.program);
      q.runs.push({
        id: `run-${q.runs.length}`,
        afterTurn: q.turns.length,
        map: structuredClone(map),
        program: structuredClone(q.program),
        cells: t.cells,
        outcome: t.outcome,
        stopLabel: t.stopLabel,
        predicted: q.prediction,
        help: q.help,
        reaction: null,
      });
      q.prediction = null;
      if (t.outcome === 'arrived') {
        q.wins++;
        q.help = 0;
        q.awaitingChallenge = q.wins <= CHALLENGES;
      }
      break;
    }
    case 'path-help': {
      const last = lastRun(q);
      if (playing && last && last.outcome !== 'arrived') q.help = Math.min(MAX_HELP, q.help + 1);
      break;
    }
    case 'path-react': {
      const run = q.runs.find((r) => r.id === event.runId);
      if (!run || run.reaction) break;
      run.reaction = {
        tikiLine: event.tikiLine.slice(0, 120),
        question: event.question?.slice(0, 80) ?? null,
        source: event.source,
        challengeLine: event.challenge?.line.slice(0, 120) ?? null,
      };
      if (run.outcome === 'arrived' && q.awaitingChallenge && run.id === lastRun(q)?.id) {
        q.awaitingChallenge = false;
        if (event.challenge && isMap(event.challenge.map) && hasPath(event.challenge.map))
          q.maps.push(structuredClone(event.challenge.map));
        else q.noChallengeLeft = true;
      }
      break;
    }
    case 'advance': {
      const error = stepError(q, d.step);
      if (error) return fail(error);
      if (d.step >= 1) return { draft };
      q.skills = derivePathSkills(q);
      d.step++;
      break;
    }
    default:
      return { draft };
  }
  d.updatedAt = new Date().toISOString();
  return { draft: d };
}
