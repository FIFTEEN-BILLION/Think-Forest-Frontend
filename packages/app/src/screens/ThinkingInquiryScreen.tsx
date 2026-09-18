import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInterpretThought, useTeachFriend, useThinkingChallenge } from '../hooks/useThinkingApi';
import type { ShadowMission } from '../api/index';
import { useShadowMission } from '../hooks/index';
import { Icon } from '../components/Icon';
import { ThinkingComparison } from '../components/ThinkingComparison';
import {
  ChoiceGroup,
  ExperimentPair,
  FriendBubble,
  ShadowFigure,
  VoicePlaceholder,
} from '../components/ThinkingParts';
import { Button, Steps } from '../components/ui';
import { JUDGMENTS } from '../lib/inquiry';
import {
  BASE_SETUP,
  EFFECT_LABEL,
  LEVEL_LABEL,
  LEVEL_ORDER,
  RESULT_SPOKEN,
  RESULT_TEXT,
  VARIABLE_NAME,
  VARIABLE_ORDER,
  changedVars,
  describeChanges,
  effectOf,
  lengthOf,
} from '../lib/shadow';
import {
  CHALLENGE_JUDGMENT_LABEL,
  CONFIDENCE_LABEL,
  MAX_EXPERIMENTS,
  MAX_TEACH_FAILURES,
  PREDICTIONS,
  PREDICTION_LABEL,
  THINKING_STEPS,
  challengeCorrect,
  fairObserved,
  finalReady,
  teachDone,
  thinkingGuard,
} from '../lib/thinking';
import { useVillage } from '../providers/VillageProvider';
import type {
  ChallengeJudgment,
  Confidence,
  Draft,
  Effect,
  InputOrigin,
  InquiryJudgment,
  ShadowSetup,
  ThinkingChallenge,
  ThinkingExperiment,
  ThinkingInquiry,
} from '../types/village';

const headings = [
  '빛을 높이면 그림자는 어떻게 될까?',
  '생각 친구는 다르게 생각한대.',
  '누구 생각이 맞는지 실험으로 확인하자.',
  '실험 증거로 생각 친구를 설득해 봐.',
  '처음과 지금, 내 생각 기술을 돌아보자.',
];
const descriptions = [
  '친구 이야기를 듣기 전에, 먼저 내 생각을 정해 줘.',
  '친구가 내 생각을 제대로 이해했는지 확인하고, 친구 생각도 들어 봐.',
  '무엇을 바꾸고 무엇을 그대로 둘지 직접 정해 봐.',
  '카드를 골라 보여 주고, 친구의 새 예측도 검사해 봐.',
  '무엇을 보고 그렇게 생각했는지가 가장 소중해.',
];
const buttons = [
  '내 생각을 정했어요',
  '친구 생각을 들었어요',
  '실험을 마쳤어요',
  '친구와 이야기를 마쳤어요',
  '내 탐구를 마쳤어요',
];
const EXAMPLE_REASONS = [
  '한낮에 해가 높이 있을 때 그림자가 작았어.',
  '빛이 위에서 비추면 그림자가 더 멀리 뻗을 것 같아.',
  '그림자는 막대기 거라서 빛이 달라져도 똑같을 것 같아.',
];
const CONFIDENCES: Confidence[] = [1, 2, 3];
const EFFECTS: Effect[] = ['longer', 'shorter', 'same'];

function StepPredict({ draft: d, mission: m }: { draft: Draft; mission: ShadowMission }) {
  const { send } = useVillage();
  const q = d.thinking!;
  return (
    <div className="inquiry-grid">
      <section className="panel inquiry-context">
        <span className="eyebrow">오늘의 궁금함</span>
        <ShadowFigure
          setup={BASE_SETUP}
          length={lengthOf(m.table, BASE_SETUP) ?? 0}
          caption="빛과 막대기가 있는 처음 장면 모형"
        />
        <h2>빛만 위로 올리면?</h2>
        <p>막대기 키와 거리, 빛의 밝기는 그대로 두고 빛의 높이만 올릴 거야.</p>
        <p className="inquiry-note">아직 잘 몰라도 괜찮아. 지금 떠오르는 생각이면 충분해.</p>
      </section>
      <section className="panel">
        <h2>먼저, 내 생각</h2>
        <ChoiceGroup
          label="그림자는 어떻게 될 것 같아?"
          options={PREDICTIONS.map((p) => ({ value: p, label: PREDICTION_LABEL[p] }))}
          value={q.prediction}
          onChange={(prediction) => send({ type: 'think-predict', prediction })}
        />
        <div className="field">
          <label htmlFor="think-reason">왜 그렇게 생각했어?</label>
          <textarea
            id="think-reason"
            rows={3}
            maxLength={500}
            value={q.reason}
            disabled={q.reasonSkipped}
            placeholder="전에 보았거나 떠올린 것을 말해 줘."
            onChange={(e) => send({ type: 'think-reason', value: e.target.value, origin: 'adult' })}
          />
        </div>
        <VoicePlaceholder />
        <div className="example-chips" role="group" aria-label="예시 이유 고르기">
          {EXAMPLE_REASONS.map((text) => (
            <button
              type="button"
              key={text}
              className="example-chip"
              disabled={q.reasonSkipped}
              onClick={() => send({ type: 'think-reason', value: text, origin: 'example' })}
            >
              예시 · {text}
            </button>
          ))}
        </div>
        <label className="check-row">
          <input
            type="checkbox"
            checked={q.reasonSkipped}
            onChange={(e) => send({ type: 'think-skip-reason', skipped: e.target.checked })}
          />
          <span>이유는 아직 설명하기 어려워요</span>
        </label>
        <ChoiceGroup
          label="얼마나 확신해?"
          options={CONFIDENCES.map((c) => ({ value: c, label: CONFIDENCE_LABEL[c] }))}
          value={q.confidenceBefore}
          onChange={(value) => send({ type: 'think-confidence', when: 'before', value })}
        />
      </section>
    </div>
  );
}

function StepFriend({ draft: d, mission: m }: { draft: Draft; mission: ShadowMission }) {
  const { send } = useVillage();
  const q = d.thinking!;
  const [attempt, setAttempt] = useState(0);
  const interpretation = useInterpretThought(m.friendBeliefs);
  const { mutate, reset } = interpretation;
  const failed = interpretation.isError;
  const { prediction, reason, reasonSkipped, origin, friendLine } = q;
  useEffect(() => {
    if (friendLine) return;
    const controller = new AbortController();
    mutate(
      {
        body: {
          prediction: prediction ?? 'unknown',
          reason: reasonSkipped ? '' : reason,
          reasonSkipped,
          inputOrigin: origin,
        },
        signal: controller.signal,
      },
      {
        onSuccess: ({ response: r, belief }) => {
          if (controller.signal.aborted) return;
          send({
            type: 'think-interpret',
            claims: r.claims,
            restatement: r.restatement,
            friendBeliefId: r.friendBeliefId,
            friendLine: r.friendLine,
            friendVariable: belief.variable,
            source: r.source,
          });
        },
      },
    );
    return () => controller.abort();
  }, [
    attempt,
    friendLine,
    m.friendBeliefs,
    origin,
    prediction,
    reason,
    reasonSkipped,
    mutate,
    send,
  ]);

  if (!q.friendLine)
    return (
      <section className="panel inquiry-request" aria-busy={!failed}>
        <Icon name={failed ? 'chat' : 'leaf'} />
        <h2>{failed ? '생각 친구와 연결하지 못했어요.' : '생각 친구가 네 생각을 읽고 있어.'}</h2>
        <p role={failed ? 'alert' : 'status'}>
          {failed
            ? '내가 정한 생각은 그대로 있어요. 다시 해 볼까요?'
            : '조금만 기다려 줘. 네 생각은 그대로 보관하고 있어.'}
        </p>
        {failed && (
          <Button
            onClick={() => {
              reset();
              setAttempt((n) => n + 1);
            }}
          >
            다시 해 보기
          </Button>
        )}
      </section>
    );
  return (
    <div className="inquiry-grid">
      <section className="panel inquiry-context">
        <span className="tag">내가 정한 생각</span>
        <blockquote>{PREDICTION_LABEL[q.prediction ?? 'unknown']}</blockquote>
        <strong>그렇게 생각한 이유</strong>
        <p>{q.reasonSkipped ? '아직 설명하기 어려워요.' : q.reason}</p>
        <Button className="ghost small" onClick={() => send({ type: 'think-back' })}>
          내 생각을 다시 정할래요
        </Button>
      </section>
      <section className="panel">
        <span className="eyebrow">생각 친구가 이해한 내 생각</span>
        <h2 className="inquiry-question">{q.restatement}</h2>
        <label className="check-row">
          <input
            type="checkbox"
            checked={q.restatementConfirmed}
            onChange={(e) => send({ type: 'think-restatement', confirmed: e.target.checked })}
          />
          <span>맞아, 이게 내 생각이야.</span>
        </label>
        <p className="muted">다르게 이해했다면 “내 생각을 다시 정할래요”를 눌러 줘.</p>
        <FriendBubble source={q.interpretSource}>{q.friendLine}</FriendBubble>
        <div className="field">
          <label htmlFor="think-plan">누구 생각이 맞는지 어떻게 확인하면 좋을까? (선택)</label>
          <textarea
            id="think-plan"
            rows={2}
            maxLength={300}
            value={q.checkPlan}
            onChange={(e) => send({ type: 'think-plan', value: e.target.value })}
          />
        </div>
      </section>
    </div>
  );
}

function ExperimentCard({
  e,
  index,
  mission: m,
}: {
  e: ThinkingExperiment;
  index: number;
  mission: ShadowMission;
}) {
  const { send } = useVillage();
  const fair = changedVars(e.base, e.compare).length === 1;
  const effect = effectOf(e.baseLength, e.compareLength);
  return (
    <article className={`evidence-card ${e.observed ? 'observed' : ''}`}>
      <div className="row between wrap">
        <span className="tag teal">실험 {index + 1}</span>
        <span className={`tag ${fair ? 'teal' : 'gold'}`}>
          {fair ? '공정한 실험' : '여러 개를 같이 바꿨어요'}
        </span>
      </div>
      <small>
        {describeChanges(e)} · 내 예상: 그림자가 {EFFECT_LABEL[e.prediction]}
      </small>
      {e.observed ? (
        <>
          <ExperimentPair e={e} />
          <strong aria-live="polite">{RESULT_TEXT[effect]}</strong>
          {e.feedback && <p className="inquiry-note">{m.designFeedback[e.feedback]}</p>}
          {e.prediction !== effect && (
            <div className="field">
              <label htmlFor={`surprise-${e.id}`}>예상과 달랐네. 왜 그랬을까?</label>
              <textarea
                id={`surprise-${e.id}`}
                rows={2}
                maxLength={300}
                value={e.surprise}
                onChange={(ev) =>
                  send({ type: 'think-surprise', id: e.id, value: ev.target.value })
                }
              />
            </div>
          )}
        </>
      ) : (
        <Button className="light" onClick={() => send({ type: 'think-observe', id: e.id })}>
          결과 보기
        </Button>
      )}
    </article>
  );
}

function StepExperiment({ draft: d, mission: m }: { draft: Draft; mission: ShadowMission }) {
  const { send } = useVillage();
  const q = d.thinking!;
  const [compare, setCompare] = useState<ShadowSetup>(BASE_SETUP);
  const [prediction, setPrediction] = useState<Effect | null>(null);
  const changed = changedVars(BASE_SETUP, compare);
  const pending = q.experiments.some((e) => !e.observed);
  const full = q.experiments.length >= MAX_EXPERIMENTS;
  const locked = pending || full;
  const checks = [
    ...(q.friendVariable && q.friendVariable !== 'lightHeight'
      ? [
          {
            label: `친구 생각 확인 · ${VARIABLE_NAME[q.friendVariable]}만 바꾼 실험`,
            done: fairObserved(q, q.friendVariable),
          },
        ]
      : []),
    { label: '빛의 높이만 바꾼 실험', done: fairObserved(q, 'lightHeight') },
  ];
  const run = () => {
    const baseLength = lengthOf(m.table, BASE_SETUP),
      compareLength = lengthOf(m.table, compare);
    if (baseLength === null || compareLength === null || !prediction) return;
    const ok = send({
      type: 'think-experiment',
      id: crypto.randomUUID(),
      compare,
      prediction,
      baseLength,
      compareLength,
    });
    if (ok) {
      setCompare(BASE_SETUP);
      setPrediction(null);
    }
  };
  return (
    <>
      <div className="inquiry-reminder">
        <strong>친구 생각</strong>
        <span>{q.friendLine}</span>
      </div>
      <div className="inquiry-reminder">
        <strong>내 생각</strong>
        <span>{q.restatement}</span>
      </div>
      <section className="panel inquiry-lab">
        <div className="row between wrap">
          <h2>실험 설계하기</h2>
          <span className="tag">
            실험 {q.experiments.length} / {MAX_EXPERIMENTS}
          </span>
        </div>
        <p className="muted">
          A는 처음 장면이야. B에서 바꿀 것을 골라 줘. 고르지 않은 것은 A와 같아.
        </p>
        <div className="designer">
          {VARIABLE_ORDER.map((k) => (
            <div className="designer-row" key={k}>
              <strong>
                {VARIABLE_NAME[k]}{' '}
                {compare[k] !== BASE_SETUP[k] && <span className="tag teal">바꿈</span>}
              </strong>
              <div className="choice-chips" role="group" aria-label={`${VARIABLE_NAME[k]} 고르기`}>
                {(LEVEL_ORDER[k] as readonly string[]).map((level) => (
                  <button
                    type="button"
                    key={level}
                    className={`choice-chip ${compare[k] === level ? 'selected' : ''}`}
                    aria-pressed={compare[k] === level}
                    disabled={locked}
                    onClick={() => setCompare((c) => ({ ...c, [k]: level }) as ShadowSetup)}
                  >
                    {LEVEL_LABEL[level]}
                    {level === BASE_SETUP[k] ? ' (A와 같음)' : ''}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="design-status" aria-live="polite">
          {changed.length
            ? `바꾼 것 ${changed.length}개 · ${changed.map((k) => VARIABLE_NAME[k]).join(', ')}`
            : m.designFeedback.none}
        </p>
        <ChoiceGroup
          label="B의 그림자는 A와 비교해서 어떻게 될까?"
          options={EFFECTS.map((v) => ({ value: v, label: EFFECT_LABEL[v] }))}
          value={prediction}
          onChange={setPrediction}
          disabled={locked}
        />
        <div className="inquiry-observe">
          <strong>
            {pending
              ? '만든 실험의 결과를 먼저 살펴봐 줘.'
              : full
                ? '실험을 모두 했어.'
                : '바꿀 것과 예상을 정했으면 실험해 보자.'}
          </strong>
          <Button
            className="light"
            disabled={locked || !changed.length || !prediction}
            onClick={run}
          >
            이 실험 하기
          </Button>
        </div>
      </section>
      <ul className="checklist" aria-label="확인해야 할 실험">
        {checks.map((c) => (
          <li key={c.label} className={c.done ? 'done' : ''}>
            {c.done ? '✓' : '○'} {c.label}
          </li>
        ))}
      </ul>
      <h2 className="space-top">내 실험 카드</h2>
      <div className="experiment-list">
        {q.experiments.map((e, i) => (
          <ExperimentCard key={e.id} e={e} index={i} mission={m} />
        ))}
        {!q.experiments.length && <p className="muted">아직 실험이 없어요.</p>}
      </div>
    </>
  );
}

function spokenEvidence(e: ThinkingExperiment) {
  const changed = changedVars(e.base, e.compare);
  if (changed.length !== 1) return '';
  const k = changed[0]!;
  return `${VARIABLE_NAME[k]}만 ${LEVEL_LABEL[e.compare[k]]} 바꿨는데 ${RESULT_SPOKEN[effectOf(e.baseLength, e.compareLength)]}! 실험 카드를 봐.`;
}

function ChallengeCard({ ch }: { ch: ThinkingChallenge }) {
  const { send } = useVillage();
  const effect = effectOf(ch.baseLength, ch.compareLength);
  return (
    <div className="challenge-card">
      <FriendBubble source={ch.source}>{ch.line}</FriendBubble>
      <p className="muted">친구가 말한 장면 · {describeChanges(ch)}</p>
      <ChoiceGroup
        label="친구 말, 맞을까?"
        options={(['agree', 'disagree', 'unsure'] as ChallengeJudgment[]).map((v) => ({
          value: v,
          label: CHALLENGE_JUDGMENT_LABEL[v],
        }))}
        value={ch.judgment}
        disabled={ch.observed}
        onChange={(judgment) => send({ type: 'think-challenge-judge', judgment })}
      />
      <div className="field">
        <label htmlFor="challenge-reason">왜 그렇게 생각해? (선택)</label>
        <textarea
          id="challenge-reason"
          rows={2}
          maxLength={300}
          value={ch.reason}
          disabled={ch.observed}
          onChange={(e) => send({ type: 'think-challenge-reason', value: e.target.value })}
        />
      </div>
      {ch.observed ? (
        <div className="observed-result">
          <ExperimentPair e={ch} />
          <strong>{RESULT_TEXT[effect]}</strong>
          <p>
            {ch.confounded
              ? '두 가지를 같이 바꿔서, 이 실험만으로는 무엇 때문인지 알 수 없어.'
              : ch.friendCorrect
                ? '친구 예측이 결과와 같았어.'
                : '친구 예측과 결과가 달랐어.'}
          </p>
          <p className="inquiry-note">
            {challengeCorrect(ch)
              ? '실험 결과와 맞게 판단했어!'
              : '괜찮아. 내 실험 카드를 떠올리며 한 번 더 생각해 보자.'}
          </p>
        </div>
      ) : (
        <Button
          className="light"
          disabled={!ch.judgment}
          onClick={() => send({ type: 'think-challenge-observe' })}
        >
          실험으로 확인하기
        </Button>
      )}
    </div>
  );
}

function StepTeach({ draft: d }: { draft: Draft }) {
  const { send } = useVillage();
  const q: ThinkingInquiry = d.thinking!;
  const [cards, setCards] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [origin, setOrigin] = useState<InputOrigin>('adult');
  const teaching = useTeachFriend();
  const challenge = useThinkingChallenge();
  const busy = teaching.isPending ? 'teach' : challenge.isPending ? 'challenge' : null;
  const netError = teaching.error
    ? '생각 친구에게 말을 전하지 못했어요. 쓴 내용은 그대로 있어요. 다시 해 볼까요?'
    : challenge.error
      ? '새 예측을 받아 오지 못했어요. 쓴 생각은 그대로 있어요. 다시 해 볼까요?'
      : '';
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const observed = q.experiments.filter((e) => e.observed);
  const selected = observed.filter((e) => cards.includes(e.id));
  const example = selected.map(spokenEvidence).find(Boolean) ?? '';
  const done = teachDone(q);
  const begin = () => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    teaching.reset();
    challenge.reset();
    return c;
  };
  const teach = (c = begin()) => {
    const sentMessage = message.trim(),
      sentCards = selected;
    teaching.mutate(
      {
        body: {
          beliefId: q.friendBeliefId,
          message: sentMessage,
          cards: sentCards.map((e) => ({ base: e.base, compare: e.compare })),
          attempt: q.exchanges.length + 1,
          inputOrigin: origin,
        },
        signal: c.signal,
      },
      {
        onSuccess: (r) => {
          if (c.signal.aborted) return;
          const ok = send({
            type: 'think-teach',
            exchange: {
              message: sentMessage,
              cardIds: sentCards.map((e) => e.id),
              convinced: r.convinced,
              helpLevel: r.helpLevel,
              reply: r.friendReply,
              source: r.source,
            },
          });
          if (ok) setMessage('');
        },
      },
    );
  };
  const askChallenge = (c = begin()) => {
    challenge.mutate(
      {
        body: {
          beliefId: q.friendBeliefId,
          convinced: q.convinced,
          experiments: observed.map((e) => ({ base: e.base, compare: e.compare })),
          finalText: q.final,
          finalReason: q.finalReason,
          inputOrigin: q.origin,
        },
        signal: c.signal,
      },
      {
        onSuccess: (r) => {
          if (c.signal.aborted) return;
          const ch = r.challenge;
          send({
            type: 'think-challenge',
            challenge: { ...ch, source: r.source },
            finalClaims: r.finalClaims,
          });
        },
      },
    );
  };

  return (
    <>
      <section className="panel">
        <h2>1. 생각 친구 설득하기</h2>
        <FriendBubble source={q.interpretSource}>{q.friendLine}</FriendBubble>
        {q.exchanges.map((x, i) => (
          <div className="teach-exchange" key={i}>
            <p className="child-line">
              <strong>나</strong> {x.message || '(실험 카드만 보여 줬어요)'}
            </p>
            <FriendBubble source={x.source}>{x.reply}</FriendBubble>
          </div>
        ))}
        {q.convinced ? (
          <p className="success-line" role="status">
            친구가 네 실험 증거를 보고 생각을 바꿨어!
          </p>
        ) : (
          <>
            <fieldset className="card-picker">
              <legend>친구에게 보여 줄 실험 카드</legend>
              {observed.map((e) => (
                <label key={e.id} className={`pick-card ${cards.includes(e.id) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={cards.includes(e.id)}
                    onChange={(ev) =>
                      setCards((list) =>
                        ev.target.checked ? [...list, e.id] : list.filter((id) => id !== e.id),
                      )
                    }
                  />
                  <span>
                    실험 {q.experiments.indexOf(e) + 1} · {describeChanges(e)} →{' '}
                    {RESULT_TEXT[effectOf(e.baseLength, e.compareLength)]}
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="field">
              <label htmlFor="teach-message">친구에게 뭐라고 말할까?</label>
              <textarea
                id="teach-message"
                rows={3}
                maxLength={500}
                value={message}
                placeholder="실험에서 본 것을 그대로 말해 줘."
                onChange={(e) => {
                  setMessage(e.target.value);
                  setOrigin('adult');
                }}
              />
            </div>
            {example && (
              <div className="example-chips">
                <button
                  type="button"
                  className="example-chip"
                  onClick={() => {
                    setMessage(example);
                    setOrigin('example');
                  }}
                >
                  예시 · {example}
                </button>
              </div>
            )}
            <VoicePlaceholder />
            <div className="inquiry-observe">
              <strong>
                {done
                  ? '설명을 들었으니 다음으로 가도 돼. 더 설득해 봐도 좋아.'
                  : `설득 시도 ${q.exchanges.length} / ${MAX_TEACH_FAILURES}`}
              </strong>
              <Button
                className="light"
                disabled={busy !== null || (!message.trim() && !selected.length)}
                onClick={() => teach()}
              >
                {busy === 'teach' ? '친구가 생각하는 중…' : '친구에게 말하기'}
              </Button>
            </div>
          </>
        )}
      </section>
      {done && (
        <section className="panel space-top">
          <h2>2. 지금 내 생각</h2>
          <div className="judgment-choices" role="group" aria-label="지금 내 생각">
            {(Object.entries(JUDGMENTS) as [InquiryJudgment, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`condition-option ${q.judgment === key ? 'selected' : ''}`}
                aria-pressed={q.judgment === key}
                disabled={Boolean(q.challenge)}
                onClick={() => send({ type: 'think-judge', judgment: key })}
              >
                <Icon name={key === 'keep' ? 'check' : key === 'change' ? 'leaf' : 'search'} />
                <strong>{label}</strong>
              </button>
            ))}
          </div>
          {q.judgment && (
            <>
              <div className="field">
                <label htmlFor="think-final">지금 내 생각은?</label>
                <textarea
                  id="think-final"
                  rows={2}
                  maxLength={500}
                  value={q.final}
                  disabled={Boolean(q.challenge)}
                  onChange={(e) =>
                    send({ type: 'think-final', field: 'final', value: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="think-final-reason">어떤 실험을 보고 그렇게 생각했어?</label>
                <textarea
                  id="think-final-reason"
                  rows={2}
                  maxLength={500}
                  value={q.finalReason}
                  disabled={Boolean(q.challenge)}
                  onChange={(e) =>
                    send({ type: 'think-final', field: 'finalReason', value: e.target.value })
                  }
                />
              </div>
              <ChoiceGroup
                label="지금은 얼마나 확신해?"
                options={CONFIDENCES.map((c) => ({ value: c, label: CONFIDENCE_LABEL[c] }))}
                value={q.confidenceAfter}
                disabled={Boolean(q.challenge)}
                onChange={(value) => send({ type: 'think-confidence', when: 'after', value })}
              />
            </>
          )}
        </section>
      )}
      {done && finalReady(q) && (
        <section className="panel space-top">
          <h2>3. 친구의 새 예측 검사하기</h2>
          {q.challenge ? (
            <ChallengeCard ch={q.challenge} />
          ) : (
            <>
              <p className="muted">
                친구가 배운 것을 새 장면에 써 보려고 해. 맞는지 네가 검사해 줘.
              </p>
              <Button disabled={busy !== null} onClick={() => askChallenge()}>
                {busy === 'challenge' ? '친구가 새 예측을 떠올리는 중…' : '친구의 새 예측 듣기'}
              </Button>
            </>
          )}
        </section>
      )}
      {netError && busy === null && (
        <p className="field-error" role="alert">
          {netError}
        </p>
      )}
    </>
  );
}

export function ThinkingInquiryScreen({ draft: d }: { draft: Draft }) {
  const { send, finish, storageError } = useVillage();
  const navigate = useNavigate();
  const mission = useShadowMission();
  const q = d.thinking!;
  const m = mission.data;
  const error = thinkingGuard(d);
  const pending = d.step === 1 && !q.friendLine;
  return (
    <div className="inquiry" data-step={d.step}>
      <div className="row between wrap">
        <Link to="/" className="back">
          <Icon name="back" />
          나중에 이어서 하기
        </Link>
        <span className="muted">
          {storageError ? '기기 저장을 확인해 주세요' : '쓴 내용은 이 기기에 자동으로 보관해요'}
        </span>
      </div>
      <div className="inquiry-heading">
        <span className="tag teal">호기심 실험실 · 첫 탐구</span>
        <span className="inquiry-step-count">{d.step + 1} / 5</span>
        <h1>{headings[d.step]}</h1>
        <p>{descriptions[d.step]}</p>
      </div>
      <Steps labels={THINKING_STEPS} current={d.step} />
      {m && (
        <p className="inquiry-note demo-note">
          {m.childDataMode === 'demo'
            ? '체험 모드예요. 예시를 고르거나 어른이 입력해 주세요. 생각 친구는 AI예요.'
            : '생각 친구는 AI예요. 결과 계산과 설득 판정은 정해진 규칙이 해요.'}
        </p>
      )}
      {!m ? (
        <section className="panel inquiry-request" aria-busy={mission.isPending}>
          <Icon name={mission.isError ? 'chat' : 'leaf'} />
          <h2>{mission.isError ? '탐구 준비물을 불러오지 못했어요.' : '탐구를 준비하고 있어.'}</h2>
          <p role={mission.isError ? 'alert' : 'status'}>
            {mission.isError
              ? '연결을 확인한 뒤 다시 시도해 주세요. 쓴 내용은 그대로 있어요.'
              : '조금만 기다려 줘.'}
          </p>
          {mission.isError && <Button onClick={() => void mission.refetch()}>다시 해 보기</Button>}
        </section>
      ) : (
        <>
          {d.step === 0 && <StepPredict draft={d} mission={m} />}
          {d.step === 1 && <StepFriend draft={d} mission={m} />}
          {d.step === 2 && <StepExperiment draft={d} mission={m} />}
          {d.step === 3 && <StepTeach draft={d} />}
          {d.step === 4 && <ThinkingComparison thinking={q} />}
          {!pending && (
            <div className="inquiry-next">
              <p id="inquiry-next-help">
                {error ??
                  (d.step === 4
                    ? '마치면 책장에서 다시 볼 수 있어.'
                    : '준비됐으면 다음으로 가 보자.')}
              </p>
              <Button
                disabled={Boolean(error)}
                aria-describedby="inquiry-next-help"
                onClick={() => {
                  if (d.step < 4) send({ type: 'advance' });
                  else {
                    const id = finish();
                    if (id) navigate(`/complete/${id}`);
                  }
                }}
              >
                {buttons[d.step]}
                <Icon name={d.step === 4 ? 'book' : 'arrow'} />
              </Button>
            </div>
          )}
        </>
      )}
      <p className="inquiry-footnote">
        생각 친구는 AI예요. 그림자 길이 계산과 설득 판정은 정해진 규칙이 해요.
        <br />
        그림은 변화를 살펴보는 모형이며 실제 측정 결과가 아니에요.
      </p>
    </div>
  );
}
