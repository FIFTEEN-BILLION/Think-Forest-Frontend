import type { Inquiry, InquiryCondition } from '../types';
import { CONDITIONS, JUDGMENTS } from '../lib/inquiry';

export function ShadowScene({ condition = null }: { condition?: InquiryCondition | null }) {
  const y = condition === 'low' ? 70 : condition === 'high' ? 20 : 45;
  const end = 240 + (170 * 80) / (120 - y);
  return (
    <svg
      className="shadow-scene"
      viewBox="0 0 560 245"
      role="img"
      aria-label={
        condition
          ? `${CONDITIONS[condition].label} 놓았을 때의 그림자 모형`
          : '빛과 막대기가 있는 탐구 모형'
      }
    >
      <path d="M25 201H540" stroke="var(--line-strong)" strokeWidth="2" />
      <path d={`M70 ${y} 240 120 ${end} 200Z`} fill="var(--gold)" opacity=".12" />
      <path
        d={`M70 ${y} 240 120 ${end} 200`}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="2"
        strokeDasharray="5 5"
      />
      <path
        d={`M240 201H${end}`}
        stroke="var(--teal)"
        opacity=".4"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <rect x="234" y="119" width="12" height="81" rx="4" fill="var(--ink-500)" />
      <circle cx="70" cy={y} r="17" fill="var(--gold)" />
      <text x="70" y={y + 37} textAnchor="middle">
        빛
      </text>
      <text x="224" y="225" textAnchor="end">
        막대기
      </text>
      <text x={(end + 240) / 2} y="225" textAnchor="middle">
        그림자
      </text>
    </svg>
  );
}
export function InquiryEvidence({ inquiry }: { inquiry: Inquiry }) {
  return (
    <div className="inquiry-evidence">
      {(['low', 'high'] as const).map((c) => (
        <section
          className={`evidence-card ${inquiry.observed.includes(c) ? 'observed' : ''}`}
          key={c}
        >
          <span className="tag teal">{CONDITIONS[c].label}</span>
          {inquiry.observed.includes(c) ? (
            <>
              <ShadowScene condition={c} />
              <strong>{CONDITIONS[c].result}</strong>
              <small>내가 살펴본 결과 · 체험용 모형</small>
            </>
          ) : (
            <p className="muted">이 조건도 골라서 살펴봐 줘.</p>
          )}
        </section>
      ))}
    </div>
  );
}
export function InquiryComparison({ inquiry: q }: { inquiry: Inquiry }) {
  return (
    <div className="inquiry-comparison">
      <div className="thought-pair">
        <section className="panel thought-before">
          <span className="tag">처음에는</span>
          <h2>내 첫 생각</h2>
          <blockquote>{q.initial}</blockquote>
          <strong>그렇게 생각한 이유</strong>
          <p>{q.reason}</p>
        </section>
        <section className="panel thought-after">
          <span className="tag teal">지금은</span>
          <h2>{q.judgment ? JUDGMENTS[q.judgment] : '지금 내 생각'}</h2>
          <blockquote>{q.final}</blockquote>
          <strong>
            {q.judgment === 'explore' ? '더 알아보고 싶은 이유' : '지금 이렇게 생각한 이유'}
          </strong>
          <p>{q.finalReason}</p>
        </section>
      </div>
      {q.meaning !== q.initial && (
        <div className="notice">
          <p>
            <strong>질문을 읽고 확인한 내 뜻</strong>
            <br />
            {q.meaning}
          </p>
        </div>
      )}
      <section className="space-top">
        <h2>내가 고른 조건과 살펴본 결과</h2>
        <InquiryEvidence inquiry={q} />
      </section>
      <p className="inquiry-footnote">
        생각이 같아도, 달라져도, 더 궁금해져도 괜찮아. 무엇을 보고 그렇게 생각했는지가 소중해.
      </p>
    </div>
  );
}
