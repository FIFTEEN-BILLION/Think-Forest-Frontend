import type { ClaimEffect, Effect, ShadowSetup, ShadowVariable } from '../types';

// Pure helpers for the shadow mission. Lengths always come from the backend table.
export const VARIABLE_ORDER: ShadowVariable[] = [
  'lightHeight',
  'stickHeight',
  'distance',
  'brightness',
];
export const LEVEL_ORDER: { [K in ShadowVariable]: readonly ShadowSetup[K][] } = {
  lightHeight: ['low', 'mid', 'high'],
  stickHeight: ['short', 'tall'],
  distance: ['near', 'far'],
  brightness: ['dim', 'bright'],
};
export const VARIABLE_NAME: Record<ShadowVariable, string> = {
  lightHeight: '빛의 높이',
  stickHeight: '막대기 키',
  distance: '빛과 막대기 사이 거리',
  brightness: '빛의 밝기',
};
export const EFFECT_LABEL: Record<ClaimEffect, string> = {
  longer: '길어져',
  shorter: '짧아져',
  same: '그대로야',
  unknown: '모르겠어',
};
export const RESULT_TEXT: Record<Effect, string> = {
  longer: '그림자가 길어졌어요.',
  shorter: '그림자가 짧아졌어요.',
  same: '그림자 길이가 그대로예요.',
};
export const BASE_SETUP: ShadowSetup = {
  lightHeight: 'mid',
  stickHeight: 'short',
  distance: 'near',
  brightness: 'dim',
};

export const LEVEL_LABEL: Record<string, string> = {
  low: '낮게',
  mid: '가운데',
  high: '높게',
  short: '작게',
  tall: '크게',
  near: '가깝게',
  far: '멀게',
  dim: '보통',
  bright: '밝게',
};
export const RESULT_SPOKEN: Record<Effect, string> = {
  longer: '그림자가 길어졌어',
  shorter: '그림자가 짧아졌어',
  same: '그림자 길이가 똑같았어',
};
// Mirrors backend missions/shadow.py so saved records stay readable offline.
export const FACT_LINES: Record<ShadowVariable, string> = {
  lightHeight: '빛이 높을수록 그림자는 짧아졌어요.',
  stickHeight: '막대기가 클수록 그림자는 길어졌어요.',
  distance: '빛이 멀수록 그림자는 길어졌어요.',
  brightness: '빛의 밝기는 그림자 길이를 바꾸지 않았어요.',
};
export const MODEL_NOTE =
  '점 모양 빛과 곧게 선 막대기로 만든 모형이에요. 실제 햇빛이나 측정값과 다를 수 있어요.';
export const PARENT_QUESTION =
  '손전등으로 인형 그림자를 만들어 볼까? 무엇을 바꾸면 그림자가 길어질지 먼저 예상해 보자.';

export function describeChanges(e: { base: ShadowSetup; compare: ShadowSetup }) {
  return changedVars(e.base, e.compare)
    .map((k) => `${VARIABLE_NAME[k]} ${LEVEL_LABEL[e.base[k]]}→${LEVEL_LABEL[e.compare[k]]}`)
    .join(', ');
}

export function isSetup(v: unknown): v is ShadowSetup {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  return VARIABLE_ORDER.every((k) => (LEVEL_ORDER[k] as readonly unknown[]).includes(s[k]));
}
export function changedVars(a: ShadowSetup, b: ShadowSetup): ShadowVariable[] {
  return VARIABLE_ORDER.filter((k) => a[k] !== b[k]);
}
export function lengthOf(
  table: { setup: Record<string, string>; length: number }[],
  s: ShadowSetup,
) {
  return table.find((row) => VARIABLE_ORDER.every((k) => row.setup[k] === s[k]))?.length ?? null;
}
export function effectOf(baseLength: number, compareLength: number): Effect {
  if (Math.abs(compareLength - baseLength) < 1e-9) return 'same';
  return compareLength > baseLength ? 'longer' : 'shorter';
}
const invert: Record<Effect, Effect> = { longer: 'shorter', shorter: 'longer', same: 'same' };
// Effect when the single changed variable is increased; null for unfair comparisons.
export function normalizedEffect(e: {
  base: ShadowSetup;
  compare: ShadowSetup;
  baseLength: number;
  compareLength: number;
}): Effect | null {
  const changed = changedVars(e.base, e.compare);
  if (changed.length !== 1) return null;
  const k = changed[0]!;
  const order = LEVEL_ORDER[k] as readonly string[];
  const effect = effectOf(e.baseLength, e.compareLength);
  return order.indexOf(e.compare[k]) > order.indexOf(e.base[k]) ? effect : invert[effect];
}
