import { ExperimentPair, ThinkingSkillsCard } from './ThinkingParts';
import { JUDGMENTS } from '../lib/inquiry';
import {
  EFFECT_LABEL,
  FACT_LINES,
  MODEL_NOTE,
  PARENT_QUESTION,
  RESULT_TEXT,
  VARIABLE_ORDER,
  changedVars,
  describeChanges,
  effectOf,
} from '../lib/shadow';
import {
  CHALLENGE_JUDGMENT_LABEL,
  CONFIDENCE_LABEL,
  PREDICTION_LABEL,
  challengeCorrect,
  deriveSkills,
  fairObserved,
} from '../lib/thinking';
import type { ThinkingInquiry } from '../types';

// Built only from recorded facts and reviewed sentences; no AI summary is generated.
export function ThinkingComparison({ thinking: q }: { thinking: ThinkingInquiry }) {
  const skills = q.skills.length ? q.skills : deriveSkills(q);
  const taught = q.exchanges.find((x) => x.convinced) ?? q.exchanges[q.exchanges.length - 1];
  const tested = VARIABLE_ORDER.filter((k) => k === 'lightHeight' || fairObserved(q, k));
  return (
    <div className="inquiry-comparison">
      <div className="thought-pair">
        <section className="panel thought-before">
          <span className="tag">처음에는</span>
          <h2>{PREDICTION_LABEL[q.prediction ?? 'unknown']}</h2>
          <strong>그렇게 생각한 이유</strong>
          <p>{q.reasonSkipped ? '아직 설명하기 어려웠어요.' : q.reason}</p>
          {q.confidenceBefore && <small>확신: {CONFIDENCE_LABEL[q.confidenceBefore]}</small>}
        </section>
        <section className="panel thought-after">
          <span className="tag teal">지금은</span>
          <h2>{q.judgment ? JUDGMENTS[q.judgment] : '지금 내 생각'}</h2>
          <blockquote>{q.final}</blockquote>
          <strong>지금 이렇게 생각한 이유</strong>
          <p>{q.finalReason || '이유는 남기지 않았어요.'}</p>
          {q.confidenceAfter && <small>확신: {CONFIDENCE_LABEL[q.confidenceAfter]}</small>}
        </section>
      </div>
      <section className="panel space-top">
        <h2>생각 친구와 나눈 이야기</h2>
        <p>
          <strong>친구의 처음 생각</strong>
          <br />
          {q.friendLine}
        </p>
        <p>
          {q.convinced
            ? '실험 증거를 보여 주자 친구가 생각을 바꿨어요.'
            : '친구는 아직 헷갈려 했어요. 설명을 들으며 함께 살펴봤어요.'}
        </p>
        {taught?.message && <blockquote>{taught.message}</blockquote>}
      </section>
      <section className="space-top">
        <h2>내가 한 실험</h2>
        <div className="experiment-list">
          {q.experiments.map((e, i) => (
            <article className="evidence-card observed" key={e.id}>
              <span
                className={`tag ${changedVars(e.base, e.compare).length === 1 ? 'teal' : 'gold'}`}
              >
                실험 {i + 1} ·{' '}
                {changedVars(e.base, e.compare).length === 1
                  ? '공정한 실험'
                  : '여러 개를 같이 바꿈'}
              </span>
              <small>
                {describeChanges(e)} · 내 예상: 그림자가 {EFFECT_LABEL[e.prediction]}
              </small>
              <ExperimentPair e={e} />
              <strong>{RESULT_TEXT[effectOf(e.baseLength, e.compareLength)]}</strong>
              {e.surprise && <p>예상과 달랐던 이유: {e.surprise}</p>}
            </article>
          ))}
        </div>
      </section>
      {q.challenge && (
        <section className="panel space-top">
          <h2>친구의 새 예측 검사</h2>
          <blockquote>{q.challenge.line}</blockquote>
          <p>
            내 판단:{' '}
            {q.challenge.judgment
              ? CHALLENGE_JUDGMENT_LABEL[q.challenge.judgment]
              : '고르지 않았어요'}
            {q.challenge.reason && ` · ${q.challenge.reason}`}
          </p>
          <strong>
            {challengeCorrect(q.challenge)
              ? '실험 결과와 맞게 판단했어요.'
              : '실험 결과는 내 판단과 달랐어요.'}
          </strong>
        </section>
      )}
      <ThinkingSkillsCard skills={skills} />
      <div className="notice space-top">
        <p>
          <strong>실험으로 확인한 사실</strong>
        </p>
        <ul>
          {tested.map((k) => (
            <li key={k}>{FACT_LINES[k]}</li>
          ))}
        </ul>
        <small>{MODEL_NOTE}</small>
      </div>
      <p className="inquiry-footnote">부모님과 이어서 · {PARENT_QUESTION}</p>
    </div>
  );
}
