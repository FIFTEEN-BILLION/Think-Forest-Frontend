import type { Model } from '../schema';
import { ApiError } from '../client';
import { activities, id, now } from './seed';
import { makeStory } from '../../lib/learning';
import { FIRST_MAP } from '../../data/pathMaps';
import { runProgram } from '../../lib/path';
import type { Heading, PathMap, ProgramStep } from '../../types/village';

type Session = Model<'ActivitySessionOut'>;
type Path = {
  map: PathMap;
  program: ProgramStep[];
  runs: number;
  wins: number;
  turns: { text: string; reply: string }[];
  lastRun?: { cells: number[]; cell: number; heading: Heading; outcome: string };
};
function reject(message: string): never {
  throw new ApiError(422, JSON.stringify({ error: { message } }));
}
const letters = (value: unknown) => String(value ?? '').replace(/\s/g, '').length;

function refresh(s: Session) {
  const a = activities.find((a) => a.id === s.activityId)!;
  const labels = s.activityId === 'path-teaching' ? ['티키와 배달하기', '처음과 지금'] : a.steps;
  const step = s.step.index;
  s.step = {
    index: step,
    total: labels.length,
    label: labels[step]!,
    writing:
      !['path-teaching', 'first-inquiry'].includes(s.activityId) &&
      (s.track === 'forest'
        ? step >= 1 && step <= 3
        : s.track === 'lab'
          ? [1, 3, 4].includes(step)
          : step === 3),
  };
  const missing: string[] = [];
  if (s.step.writing && letters(s.draft.text) < s.minCharacters)
    missing.push(`내 생각을 ${s.minCharacters}자 이상 저장해 주세요.`);
  const inquiry = s.draft.inquiry;
  if (inquiry) {
    if (step === 0 && (!letters(inquiry.initial) || !letters(inquiry.reason)))
      missing.push('처음 생각과 이유를 저장해 주세요.');
    if (step === 1 && !inquiry.confirmed) missing.push('내 뜻이 맞는지 확인해 주세요.');
    if (step === 2 && (inquiry.observed as string[]).length < 2)
      missing.push('두 가지 조건을 관찰해 주세요.');
    if (
      step === 3 &&
      (!inquiry.judgment || !letters(inquiry.final) || !letters(inquiry.finalReason))
    )
      missing.push('지금 생각과 이유를 저장해 주세요.');
  }
  if (s.activityId === 'path-teaching' && step === 0 && !(s.draft.path as unknown as Path).wins)
    missing.push('티키를 우체국에 도착시켜 보세요.');
  if (s.track === 'lab' && !inquiry && s.activityId !== 'path-teaching' && step === 2) {
    const lab = s.draft.lab!;
    if (lab.mode === 'custom' ? !letters(lab.a) || !letters(lab.b) : !lab.low || !lab.high)
      missing.push('다른 두 조건을 관찰해 주세요.');
  }
  const theater = s.draft.theater;
  if (s.track === 'theater' && theater) {
    if (step === 0 && !letters(theater.keyword)) missing.push('마음 키워드를 저장해 주세요.');
    if (step === 1 && !theater.approved) missing.push('보호자가 대본을 확인해 주세요.');
    if (step === 2 && Number(theater.scene) < 3) missing.push('이야기 장면을 모두 살펴보세요.');
    if (step === 3 && !theater.emotion) missing.push('느낀 마음을 골라 주세요.');
  }
  s.missing = missing.map((message, i) => ({ code: `DEMO_${i}`, message }));
  s.readyToComplete = step === labels.length - 1 && !missing.length;
}
export function createActivity(a: Model<'ActivityDetail'>): Session {
  const session: Session = {
    sessionId: id('activity'),
    activityId: a.id,
    track: a.track,
    title: a.title,
    status: 'ACTIVE',
    revision: 1,
    step: { index: 0, label: '', total: 0, writing: false },
    minCharacters: 8,
    draft: {
      text: '',
      answers: [],
      lab: {
        mode: a.id === 'balance' ? 'balance' : a.id === 'custom' ? 'custom' : 'shadow',
        value: 50,
        low: false,
        high: false,
      },
      theater: { keyword: '', scene: 0, approved: false, choice: null, emotion: '' },
      ...(a.id === 'first-inquiry'
        ? { inquiry: { initial: '', reason: '', confirmed: false, observed: [] } }
        : {}),
      ...(a.id === 'path-teaching'
        ? { path: { map: structuredClone(FIRST_MAP), program: [], runs: 0, wins: 0, turns: [] } }
        : {}),
    },
    missing: [],
    readyToComplete: false,
    storyId: null,
    startedAt: now(),
    updatedAt: now(),
  };
  refresh(session);
  return session;
}
export function updateActivity(
  s: Session,
  action: string,
  method: string,
  body: Record<string, unknown>,
) {
  if (s.status !== 'ACTIVE') reject('이미 마친 모험이에요.');
  if (body.clientRevision !== undefined && body.clientRevision !== s.revision)
    reject('다른 변경이 있어요. 새로고침 후 다시 시도해 주세요.');
  if (method === 'DELETE') s.status = 'CANCELLED';
  else if (action === 'complete') {
    if (!s.readyToComplete) reject('모험 단계를 모두 마쳐 주세요.');
    s.status = 'COMPLETED';
  } else if (action === 'advance') {
    if (s.missing.length) reject(s.missing[0]!.message);
    if (s.step.writing) s.draft.answers!.push({ question: s.step.label, text: s.draft.text! });
    s.step.index = Math.min(s.step.total - 1, s.step.index + 1);
    s.draft.text = '';
  } else if (action.startsWith('path/')) {
    const path = s.draft.path as unknown as Path;
    if (action === 'path/teach') {
      const text = String(body.text);
      const program: ProgramStep[] = [];
      const numbers: Record<string, number> = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5 };
      for (const phrase of text
        .split(/[,，.\n]/)
        .map((v) => v.trim())
        .filter(Boolean)) {
        if (/오른|왼/.test(phrase))
          program.push({
            op: 'turn',
            dir: /오른/.test(phrase) ? 'right' : 'left',
            count: null,
            until: null,
            body: [],
            then: [],
            else: [],
            sensor: null,
            state: null,
          });
        else if (/앞|전진/.test(phrase)) {
          const number = phrase.match(/([1-5]|한|두|세|네|다섯)\s*칸/)?.[1] ?? '1';
          program.push({
            op: 'move',
            count: numbers[number] ?? Number(number),
            dir: null,
            until: null,
            body: [],
            then: [],
            else: [],
            sensor: null,
            state: null,
          });
        } else
          reject(
            '예시에서는 “앞으로 두 칸, 오른쪽으로 돌아, 앞으로 두 칸”처럼 쉼표로 나누어 말해 주세요.',
          );
      }
      if (!program.length) reject('이동할 말을 입력해 주세요.');
      path.program = program;
      path.turns.push({ text, reply: '알려 준 순서대로 움직여 볼게. 출발 버튼을 눌러 줘!' });
    } else if (action === 'path/run') {
      const trace = runProgram(path.map, path.program);
      path.runs++;
      if (trace.outcome === 'arrived') path.wins++;
      path.lastRun = {
        cells: trace.cells,
        cell: trace.stopCell,
        heading: trace.events.at(-1)?.heading ?? path.map.heading,
        outcome: trace.outcome,
      };
    }
  } else if (method === 'PATCH') {
    const event = body.event as Model<'ActivityEvent'>;
    const lab = s.draft.lab!,
      theater = s.draft.theater!;
    switch (event.type) {
      case 'TEXT':
        s.draft.text = String(event.value);
        break;
      case 'TOPIC':
        lab.topic = event.value;
        break;
      case 'KEYWORD':
        theater.keyword = event.value;
        theater.story = makeStory(s.activityId, String(event.value));
        break;
      case 'LAB_VALUE':
        lab.value = event.value;
        if (Number(event.value) <= 30) lab.low = true;
        if (Number(event.value) >= 70) lab.high = true;
        break;
      case 'OBSERVATION':
        lab[event.field === 'A' ? 'a' : 'b'] = event.value;
        break;
      case 'APPROVE':
        theater.approved = true;
        break;
      case 'SCENE':
        theater.scene = Math.min(3, Number(theater.scene) + 1);
        break;
      case 'CHOICE':
        theater.choice = event.value;
        theater.scene = 2;
        break;
      case 'EMOTION':
        theater.emotion = event.value;
        break;
      case 'HINT':
        s.draft.followup = '보이는 사실과 내 생각을 나누어 살펴보세요.';
        break;
      case 'INQUIRY': {
        const q = s.draft.inquiry!;
        if (event.field === 'OBSERVED')
          q.observed = [...new Set([...(q.observed as string[]), String(event.value)])];
        else
          q[event.field === 'FINAL_REASON' ? 'finalReason' : event.field!.toLowerCase()] =
            event.value;
        break;
      }
    }
  }
  s.revision++;
  s.updatedAt = now();
  refresh(s);
}
