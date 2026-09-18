import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Button, Steps } from '../components/ui';
import { InquiryComparison, InquiryEvidence, ShadowScene } from '../components/InquiryComparison';
import {
  CONDITIONS,
  INQUIRY_STEPS,
  JUDGMENTS,
  inquiryGuard,
  requestInquiryQuestion,
} from '../lib/inquiry';
import { count } from '../lib/learning';
import { useVillage } from '../providers/VillageProvider';
import type { Draft, Inquiry, InquiryJudgment, LearningEvent } from '../types/village';

function ThoughtFields({ draft, last = false }: { draft: Draft; last?: boolean }) {
  const { send } = useVillage();
  const q = draft.inquiry!;
  const thought = last ? q.final : q.initial,
    reason = last ? q.finalReason : q.reason;
  const patch = (field: 'initial' | 'reason' | 'final' | 'finalReason', value: string) =>
    send({ type: 'inquiry-field', field, value });
  return (
    <>
      <div className="field">
        <label htmlFor="inquiry-thought">
          {last
            ? q.judgment === 'explore'
              ? '무엇을 더 알아보고 싶어?'
              : '지금 내 생각은?'
            : '어떻게 될 것 같아?'}
        </label>
        <textarea
          id="inquiry-thought"
          value={thought}
          maxLength={1000}
          rows={3}
          onChange={(e) => patch(last ? 'final' : 'initial', e.target.value)}
          placeholder={last ? '지금 떠오르는 생각을 적어 줘.' : '빛을 위로 올리면 그림자는…'}
          aria-describedby="inquiry-writing-help"
        />
      </div>
      <div className="field">
        <label htmlFor="inquiry-reason">
          {last
            ? q.judgment === 'explore'
              ? '왜 더 알아보고 싶어?'
              : '무엇을 보고 그렇게 생각했어?'
            : '왜 그렇게 생각했어?'}
        </label>
        <textarea
          id="inquiry-reason"
          value={reason}
          maxLength={1000}
          rows={3}
          onChange={(e) => patch(last ? 'finalReason' : 'reason', e.target.value)}
          placeholder={
            last ? '살펴본 결과와 내 생각을 연결해 봐.' : '전에 보았거나 떠올린 것을 말해 줘.'
          }
          aria-describedby="inquiry-writing-help"
        />
      </div>
      <div className="inquiry-writing-help" id="inquiry-writing-help">
        <span>생각과 이유를 각각 3자 이상, 합쳐 {draft.min}자 이상 적어 줘.</span>
        <strong aria-live="polite">
          {count(thought + reason)} / {draft.min}자
        </strong>
      </div>
    </>
  );
}
function Question({
  draft,
  fail,
  send,
}: {
  draft: Draft;
  fail: boolean;
  send: (event: LearningEvent) => boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(false);
  const q = draft.inquiry!;
  useEffect(() => {
    if (q.question) return;
    const controller = new AbortController();
    void requestInquiryQuestion(q.initial, q.reason, {
      fail: fail && attempt === 0,
      signal: controller.signal,
    }).then(
      (question) => {
        if (!controller.signal.aborted) send({ type: 'inquiry-question', question });
      },
      () => {
        if (!controller.signal.aborted) setError(true);
      },
    );
    return () => controller.abort();
  }, [attempt, fail, q.initial, q.reason, q.question, send]);
  if (!q.question)
    return (
      <section className="panel inquiry-request" aria-busy={!error}>
        <Icon name={error ? 'chat' : 'leaf'} />
        <h2>{error ? '질문을 가져오지 못했어요.' : '네 생각을 읽고 질문을 준비하고 있어.'}</h2>
        <p role={error ? 'alert' : 'status'}>
          {error
            ? '적은 생각과 이유는 그대로 있어요. 다시 해 볼까요?'
            : '조금만 기다려 줘. 네 생각은 그대로 보관하고 있어.'}
        </p>
        {error && (
          <>
            <span className="tag gold">연결 오류 체험 · 실제 AI 호출 없음</span>
            <Button
              onClick={() => {
                setError(false);
                setAttempt((n) => n + 1);
              }}
            >
              다시 해 보기
            </Button>
          </>
        )}
      </section>
    );
  return (
    <section className="panel">
      <span className="tag teal">생각 친구의 질문 · 체험용</span>
      <h2 className="inquiry-question">{q.question}</h2>
      <div className="field">
        <label htmlFor="inquiry-meaning">내가 말하려던 뜻</label>
        <textarea
          id="inquiry-meaning"
          rows={3}
          maxLength={1000}
          value={q.meaning}
          onChange={(e) => send({ type: 'inquiry-field', field: 'meaning', value: e.target.value })}
        />
      </div>
      <p className="muted">맞으면 그대로 두어도 좋아. 다르게 말하고 싶으면 고쳐 줘.</p>
      <label className="check-row">
        <input
          type="checkbox"
          checked={q.confirmed}
          onChange={(e) => send({ type: 'inquiry-confirm', confirmed: e.target.checked })}
        />
        <span>이 문장이 내가 말하려던 뜻이야.</span>
      </label>
    </section>
  );
}
const headings = [
  '빛을 높이면 그림자는 어떻게 될까?',
  '네가 말한 뜻을 함께 살펴보자.',
  '빛의 높이를 바꾸어 보자.',
  '살펴보니, 지금은 어떻게 생각해?',
  '처음과 지금, 내 생각을 나란히.',
];
const descriptions = [
  '아직 움직이기 전에, 네 생각과 이유를 들려줘.',
  '생각 친구가 네 말을 제대로 이해했는지 확인해 줘.',
  '조건 하나를 고르고 결과를 봐. 다른 조건도 살펴보자.',
  '내 생각에 가까운 것을 고르고 이유를 남겨 줘.',
  '내 생각이 어떻게 이어졌는지 천천히 읽어 봐.',
];
const buttons = [
  '내 생각을 적었어요',
  '이 뜻이 맞아요',
  '결과를 살펴봤어요',
  '지금 생각을 남길래요',
  '내 탐구를 마쳤어요',
];
export function InquiryScreen({ draft: d }: { draft: Draft }) {
  const { send, finish, storageError } = useVillage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = d.inquiry as Inquiry;
  const error = inquiryGuard(d);
  const pendingQuestion = d.step === 1 && !q.question;
  return (
    <div className="inquiry" data-step={d.step}>
      <div className="row between wrap">
        <Link to="/" className="back">
          <Icon name="back" />
          나중에 이어서 하기
        </Link>
        <span className="muted">
          {storageError ? '기기 저장을 확인해 주세요' : '쓴 내용은 자동으로 보관해요'}
        </span>
      </div>
      <div className="inquiry-heading">
        <span className="tag teal">호기심 실험실 · 첫 탐구</span>
        <span className="inquiry-step-count">{d.step + 1} / 5</span>
        <h1>{headings[d.step]}</h1>
        <p>{descriptions[d.step]}</p>
      </div>
      <Steps labels={INQUIRY_STEPS} current={d.step} />
      {d.step === 0 && (
        <div className="inquiry-grid">
          <section className="panel inquiry-context">
            <span className="eyebrow">오늘의 궁금함</span>
            <ShadowScene />
            <h2>빛과 그림자를 만나 보자.</h2>
            <p>막대기는 같은 자리에 두고, 빛만 위나 아래로 움직일 거야.</p>
            <p className="inquiry-note">아직 잘 몰라도 괜찮아. 어떤 점이 궁금한지도 적어 줘.</p>
          </section>
          <section className="panel">
            <h2>먼저, 내 생각</h2>
            <ThoughtFields draft={d} />
          </section>
        </div>
      )}
      {d.step === 1 && (
        <div className="inquiry-grid">
          <section className="panel inquiry-context">
            <span className="tag">내가 남긴 처음 생각</span>
            <blockquote>{q.initial}</blockquote>
            <strong>그렇게 생각한 이유</strong>
            <p>{q.reason}</p>
            <Button className="ghost small" onClick={() => send({ type: 'inquiry-back' })}>
              처음 문장을 다시 쓸래요
            </Button>
          </section>
          <Question draft={d} fail={params.get('preview') === 'connection-error'} send={send} />
        </div>
      )}
      {d.step === 2 && (
        <>
          <div className="inquiry-reminder">
            <strong>내 예상</strong>
            <span>{q.meaning}</span>
          </div>
          <section className="panel inquiry-lab">
            <div className="row between wrap">
              <h2>어느 쪽부터 살펴볼까?</h2>
              <span className="tag">막대기의 높이와 자리는 같아요</span>
            </div>
            <div className="condition-choices" role="group" aria-label="빛의 높이 고르기">
              {(['low', 'high'] as const).map((c) => (
                <button
                  className={`condition-option ${q.selected === c ? 'selected' : ''}`}
                  aria-pressed={q.selected === c}
                  key={c}
                  onClick={() => send({ type: 'inquiry-select', condition: c })}
                >
                  <Icon name="sun" />
                  <strong>{CONDITIONS[c].label}</strong>
                  <small>{q.observed.includes(c) ? '✓ 살펴봤어요' : '이 조건 골라 보기'}</small>
                </button>
              ))}
            </div>
            <div className="inquiry-observe">
              <div>
                <strong>
                  {q.selected
                    ? `내가 고른 조건: ${CONDITIONS[q.selected].label}`
                    : '먼저 조건을 하나 골라 줘.'}
                </strong>
                <p>고른 뒤 아래 버튼을 누르면 그림자를 볼 수 있어.</p>
              </div>
              <Button
                className="light"
                disabled={!q.selected || q.observed.includes(q.selected)}
                onClick={() => send({ type: 'inquiry-observe' })}
              >
                {q.selected && q.observed.includes(q.selected)
                  ? '이 결과를 살펴봤어요'
                  : '이 조건으로 살펴보기'}
              </Button>
            </div>
            <div aria-live="polite">
              {q.selected && q.observed.includes(q.selected) && (
                <div className="observed-result">
                  <ShadowScene condition={q.selected} />
                  <strong>{CONDITIONS[q.selected].result}</strong>
                </div>
              )}
            </div>
          </section>
          <h2 className="space-top">
            내가 모은 두 가지 결과 <small>{q.observed.length} / 2</small>
          </h2>
          <InquiryEvidence inquiry={q} />
        </>
      )}
      {d.step === 3 && (
        <>
          <div className="inquiry-reminder">
            <strong>내 처음 생각</strong>
            <span>{q.initial}</span>
          </div>
          <InquiryEvidence inquiry={q} />
          <section className="panel space-top">
            <h2>지금 내 생각에 가까운 것은?</h2>
            <div className="judgment-choices" role="group" aria-label="지금 내 생각">
              {(Object.entries(JUDGMENTS) as [InquiryJudgment, string][]).map(([key, label]) => (
                <button
                  key={key}
                  className={`condition-option ${q.judgment === key ? 'selected' : ''}`}
                  aria-pressed={q.judgment === key}
                  onClick={() => send({ type: 'inquiry-judge', judgment: key })}
                >
                  <Icon name={key === 'keep' ? 'check' : key === 'change' ? 'leaf' : 'search'} />
                  <strong>{label}</strong>
                </button>
              ))}
            </div>
            {q.judgment ? (
              <ThoughtFields draft={d} last />
            ) : (
              <p className="inquiry-note">어느 쪽이든 괜찮아. 고른 뒤 네 생각과 이유를 적어 줘.</p>
            )}
          </section>
        </>
      )}
      {d.step === 4 && <InquiryComparison inquiry={q} />}
      {!pendingQuestion && (
        <div className="inquiry-next">
          <p id="inquiry-next-help">
            {error ??
              (d.step === 4 ? '마치면 책장에서 다시 볼 수 있어.' : '준비됐으면 다음으로 가 보자.')}
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
      <p className="inquiry-footnote">
        체험용 질문·결과 · 실제 AI 연결 없음 · 사람 검수 미완료
        <br />
        그림은 변화를 살펴보는 모형이며 실제 측정 결과가 아니에요.
      </p>
    </div>
  );
}
