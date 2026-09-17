import { initialData } from '../data/mock';
import { CATALOG } from '../data/catalog';
import { VARIABLE_ORDER, isSetup } from './shadow';
import type { Draft, Inquiry, SessionRecord, ThinkingInquiry, VillageData } from '../types';

export const STORAGE_KEY = 'jaram_village_react_v1';
const object = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');
const date = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));
function like(template: unknown, value: unknown): boolean {
  if (template === null) return value === null;
  if (Array.isArray(template)) return strings(value);
  if (object(template))
    return object(value) && Object.entries(template).every(([key, item]) => like(item, value[key]));
  return typeof template === typeof value && (typeof value !== 'number' || Number.isFinite(value));
}
const answers = (v: unknown) =>
  Array.isArray(v) &&
  v.every((a) => object(a) && typeof a.question === 'string' && typeof a.text === 'string');
function story(v: unknown) {
  return (
    object(v) &&
    typeof v.title === 'string' &&
    typeof v.keyword === 'string' &&
    strings(v.scenes) &&
    v.scenes.length === 4 &&
    strings(v.branches) &&
    v.branches.length === 2
  );
}
function lab(v: unknown) {
  return (
    object(v) &&
    ['shadow', 'balance', 'custom'].includes(String(v.mode)) &&
    like(
      { topic: '', value: 50, low: false, high: false, a: '', b: '', source: '', prediction: '' },
      v,
    ) &&
    Number(v.value) >= 10 &&
    Number(v.value) <= 90
  );
}
export function isInquiry(v: unknown): v is Inquiry {
  return (
    object(v) &&
    like(
      {
        initial: '',
        reason: '',
        question: '',
        meaning: '',
        confirmed: false,
        final: '',
        finalReason: '',
      },
      v,
    ) &&
    [null, 'low', 'high'].includes(v.selected as string | null) &&
    [null, 'keep', 'change', 'explore'].includes(v.judgment as string | null) &&
    strings(v.observed) &&
    v.observed.length <= 2 &&
    new Set(v.observed).size === v.observed.length &&
    v.observed.every((c) => c === 'low' || c === 'high')
  );
}
const effects = ['longer', 'shorter', 'same'];
export function isThinking(v: unknown): v is ThinkingInquiry {
  if (!object(v) || v.version !== 2) return false;
  const template = {
    reason: '',
    reasonSkipped: false,
    origin: '',
    restatement: '',
    restatementConfirmed: false,
    friendBeliefId: '',
    friendLine: '',
    checkPlan: '',
    convinced: false,
    final: '',
    finalReason: '',
  };
  const ch = v.challenge;
  return (
    like(template, v) &&
    ['example', 'adult'].includes(String(v.origin)) &&
    [null, ...effects, 'unknown'].includes(v.prediction as string | null) &&
    [null, 1, 2, 3].includes(v.confidenceBefore as number | null) &&
    [null, 1, 2, 3].includes(v.confidenceAfter as number | null) &&
    [null, 'keep', 'change', 'explore'].includes(v.judgment as string | null) &&
    ([null, ...VARIABLE_ORDER] as (string | null)[]).includes(v.friendVariable as string | null) &&
    [v.claims, v.finalClaims, v.skills].every(Array.isArray) &&
    Array.isArray(v.exchanges) &&
    v.exchanges.every(
      (x) =>
        object(x) &&
        like({ message: '', convinced: false, reply: '', source: '' }, x) &&
        strings(x.cardIds),
    ) &&
    Array.isArray(v.experiments) &&
    v.experiments.length <= 5 &&
    v.experiments.every(
      (e) =>
        object(e) &&
        like({ id: '', baseLength: 0, compareLength: 0, observed: false, surprise: '' }, e) &&
        isSetup(e.base) &&
        isSetup(e.compare) &&
        effects.includes(String(e.prediction)),
    ) &&
    (ch === null ||
      (object(ch) &&
        like(
          {
            id: '',
            line: '',
            baseLength: 0,
            compareLength: 0,
            confounded: false,
            friendCorrect: false,
            reason: '',
            observed: false,
          },
          ch,
        ) &&
        isSetup(ch.base) &&
        isSetup(ch.compare)))
  );
}
function firstInquiry(v: Record<string, unknown>) {
  return v.thinking === undefined
    ? isInquiry(v.inquiry)
    : isThinking(v.thinking) && v.inquiry === undefined;
}
export function isDraft(v: unknown): v is Draft {
  if (
    !object(v) ||
    !CATALOG.some((a) => a.id === v.activityId && a.track === v.track) ||
    !date(v.startedAt) ||
    !date(v.updatedAt) ||
    !answers(v.answers) ||
    !lab(v.lab) ||
    !object(v.theater)
  )
    return false;
  if (
    !like({ id: '', title: '', text: '', followup: '', hints: 0, step: 0, min: 15 }, v) ||
    ![8, 15, 25].includes(Number(v.min)) ||
    !Number.isInteger(v.step) ||
    Number(v.step) < 0 ||
    Number(v.step) > (v.track === 'lab' ? 5 : 4)
  )
    return false;
  const t = v.theater;
  return (
    (v.activityId === 'first-inquiry'
      ? firstInquiry(v) && Number(v.step) <= 4
      : v.inquiry === undefined && v.thinking === undefined) &&
    like({ keyword: '', scene: 0, emotion: '', approved: false }, t) &&
    [0, 1, 2, 3].includes(Number(t.scene)) &&
    [null, 0, 1].includes(t.choice as null | number) &&
    (t.story === null || story(t.story)) &&
    !(v.track === 'theater' && Number(v.step) > 0 && !story(t.story))
  );
}
export function isSession(v: unknown): v is SessionRecord {
  return (
    object(v) &&
    like({ id: '', title: '', text: '', durationMinutes: 0, favorite: false }, v) &&
    date(v.date) &&
    date(v.completedAt) &&
    ['mock', 'local'].includes(String(v.source)) &&
    CATALOG.some((a) => a.id === v.activityId && a.track === v.track) &&
    answers(v.answers) &&
    // Thinking-skill records have no score; every other record keeps its rubric.
    (v.thinking !== undefined
      ? v.rubric === undefined
      : object(v.rubric) &&
        ['observe', 'reason', 'express'].every(
          (k) =>
            typeof (v.rubric as Record<string, unknown>)[k] === 'number' &&
            Number((v.rubric as Record<string, unknown>)[k]) >= 0 &&
            Number((v.rubric as Record<string, unknown>)[k]) <= 100,
        )) &&
    (v.story === undefined || story(v.story)) &&
    (v.activityId === 'first-inquiry'
      ? firstInquiry(v)
      : v.inquiry === undefined && v.thinking === undefined) &&
    (v.emotion === undefined || typeof v.emotion === 'string') &&
    (v.choice === undefined || v.choice === 0 || v.choice === 1) &&
    (v.observations === undefined || lab(v.observations))
  );
}
export function prune(data: VillageData, now = Date.now()): VillageData {
  const cutoff = now - data.settings.retention * 86400000;
  const sessions = data.sessions.filter((s) => Date.parse(s.completedAt) >= cutoff);
  return {
    ...data,
    sessions,
    safety: data.safety.filter((s) => Date.parse(s.at) >= cutoff).slice(0, 20),
    resume: data.resume && Date.parse(data.resume.updatedAt) >= cutoff ? data.resume : null,
    diagnosis: data.diagnosis && Date.parse(data.diagnosis.at) < cutoff ? null : data.diagnosis,
    summary:
      data.summary &&
      Date.parse(data.summary.at) >= now - 7 * 86400000 &&
      data.summary.recordIds.every((id) => sessions.some((s) => s.id === id))
        ? data.summary
        : null,
  };
}
export function decode(raw: string): VillageData {
  const value: unknown = JSON.parse(raw),
    base = initialData(false);
  if (
    !object(value) ||
    value.version !== 1 ||
    !like(base.profile, value.profile) ||
    !like(base.settings, value.settings) ||
    !like(base.onboarding, value.onboarding) ||
    !object(value.consent) ||
    !like({ done: false, ageBand: '', guardian: '', thirdParty: false }, value.consent) ||
    !(value.consent.noticeAt === null || date(value.consent.noticeAt)) ||
    !like(base.diagnosticDraft, value.diagnosticDraft)
  )
    throw new Error('저장된 데이터 형식이 올바르지 않아요.');
  const data = value as unknown as VillageData;
  if (
    !['쉬움', '보통', '도전'].includes(data.settings.gate) ||
    !['auto', 'light', 'dark'].includes(data.settings.theme) ||
    ![30, 90, 180].includes(data.settings.retention) ||
    ![0, 1, 2, 3].includes(data.onboarding.step) ||
    ![0, 1, 2].includes(data.diagnosticDraft.index) ||
    data.diagnosticDraft.answers.length !== 3
  )
    throw new Error('저장된 설정을 읽지 못했어요.');
  data.sessions = Array.isArray(value.sessions) ? value.sessions.filter(isSession) : [];
  data.resume = isDraft(value.resume) ? value.resume : null;
  data.safety = Array.isArray(value.safety)
    ? value.safety.filter(
        (s): s is VillageData['safety'][number] =>
          object(s) &&
          like({ id: '', keyword: '', reason: '' }, s) &&
          date(s.at) &&
          ['mock', 'local'].includes(String(s.source)),
      )
    : [];
  data.diagnosis =
    object(value.diagnosis) &&
    ['쉬움', '보통', '도전'].includes(String(value.diagnosis.level)) &&
    typeof value.diagnosis.why === 'string' &&
    strings(value.diagnosis.answers) &&
    date(value.diagnosis.at)
      ? (value.diagnosis as unknown as VillageData['diagnosis'])
      : null;
  data.summary =
    object(value.summary) &&
    like({ text: '', next: '', recordIds: [], includesMock: false }, value.summary) &&
    date(value.summary.at) &&
    value.summary.source === 'rule'
      ? (value.summary as unknown as VillageData['summary'])
      : null;
  return prune(data);
}
export function loadData(): { data: VillageData; storageError: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { data: raw ? decode(raw) : initialData(), storageError: '' };
  } catch {
    return {
      data: initialData(),
      storageError:
        '저장된 기록을 읽지 못했어요. 현재 변경은 화면에서 유지되지만 브라우저를 닫기 전에 기록을 내려받아 주세요.',
    };
  }
}

// Keep an empty marker so a reload after deletion does not seed the example records again.
export function clearData(): VillageData {
  const next = initialData(false);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
