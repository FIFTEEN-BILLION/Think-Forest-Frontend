// 명세 18절. 성장 리포트.
// 진단이 아니라 "대화에서 관찰된 활동"이다. 서버가 주는 notice 를 지우지 않고 그대로 보여 준다.

import { Fragment, useEffect, useState } from 'react';
import {
  aiSourceLabel,
  createReportSummary,
  getProgressReport,
  getReportSummary,
} from '../../../../api/v1/endpoints';
import type { ProgressReport, ReportSummary } from '../../../../api/v1/types';
import { useAuth } from '../../../../providers/AuthProvider';
import { Icon } from '../../components/Icon';
import {
  ActionResult,
  errorText,
  GuardianAiStatus,
  GuardianGate,
  GuardianSection,
  useAction,
  useGuardian,
} from '../../components/GuardianParts';
import { Button, Notice } from '../../components/ui';

const PERIODS = [
  ['7d', '최근 7일'],
  ['30d', '최근 30일'],
  ['90d', '최근 90일'],
] as const;

const ACTIVITY_LABELS: [keyof ProgressReport['activity'], string][] = [
  ['activeDays', '이야기한 날'],
  ['completedStories', '마친 이야기'],
  ['continuedStories', '이어 가는 이야기'],
  ['newWords', '새로 담은 단어'],
];

const BEHAVIOR_LABELS: [keyof ProgressReport['observedBehaviors'], string][] = [
  ['fullSentenceResponses', '문장으로 답한 횟수'],
  ['reasonExplanations', '이유를 말한 횟수'],
  ['alternativeIdeas', '다른 생각을 떠올린 횟수'],
  ['revisedIdeas', '생각을 고쳐 말한 횟수'],
];

function Timeline({ report }: { report: ProgressReport }) {
  const max = Math.max(1, ...report.timeline.map((point) => point.responses));
  if (report.timeline.length === 0)
    return <p className="muted space-top">아직 이 기간에 기록이 없어요.</p>;
  return (
    <div className="rubric">
      {report.timeline.map((point) => (
        <div className="rubric-row" key={point.date}>
          <span>{point.date.slice(5)}</span>
          <div className="bar">
            <span
              style={{ width: `${(point.responses / max) * 100}%`, background: 'var(--teal)' }}
            />
          </div>
          <span>
            {point.responses}번 · 이야기 {point.completedStories}편
          </span>
        </div>
      ))}
    </div>
  );
}

function ProgressBody() {
  const { client } = useAuth();
  const { profileId, profile, mode } = useGuardian();
  const { busy, message, failed, runQuiet } = useAction();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profileId) return;
    const abort = new AbortController();
    getProgressReport(client, { profileId, period }, abort.signal)
      .then((found) => {
        if (!abort.signal.aborted) {
          setReport(found);
          setError('');
        }
      })
      .catch((reason) => {
        if (!abort.signal.aborted) setError(errorText(reason, '리포트를 불러오지 못했어요.'));
      });
    return () => abort.abort();
  }, [client, profileId, period]);

  const makeSummary = () =>
    runQuiet(async () => {
      const result = await createReportSummary(client, {
        profileId: profileId ?? undefined,
        from: report?.period.from,
        to: report?.period.to,
      });
      setSummary(result.summary);
      return result.reused
        ? '같은 기간에 이미 만든 요약이 있어 그대로 보여 드려요.'
        : '요약을 만들었어요.';
    });

  const refreshSummary = () =>
    runQuiet(async () => {
      if (!summary) return;
      setSummary(await getReportSummary(client, summary.id, profileId ?? undefined));
      return '요약을 다시 불러왔어요.';
    });

  return (
    <>
      <GuardianAiStatus compact />
      {error && (
        <div role="alert">
          <Notice variant="error">{error}</Notice>
        </div>
      )}
      <div className="filters space-top">
        {PERIODS.map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={`chip ${period === value ? 'active' : ''}`}
            aria-pressed={period === value}
            onClick={() => setPeriod(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {report && (
        <>
          <Notice>
            {report.notice ?? '대화에서 관찰된 활동 기록이며 능력이나 발달에 대한 진단이 아닙니다.'}
          </Notice>
          <p className="muted space-top">
            {report.period.from} ~ {report.period.to} · {profile?.nickname ?? '아이'}
          </p>
          <div className="cards stats">
            {ACTIVITY_LABELS.map(([key, label]) => (
              <section className="panel" key={key}>
                <span className="stat-label">{label}</span>
                <div className="metric">{report.activity[key]}</div>
              </section>
            ))}
          </div>
          <div className="bottom-grid">
            <section className="panel">
              <h3>대화에서 본 모습</h3>
              <dl className="definition">
                {BEHAVIOR_LABELS.map(([key, label]) => (
                  <Fragment key={key}>
                    <dt>{label}</dt>
                    <dd>{report.observedBehaviors[key]}번</dd>
                  </Fragment>
                ))}
              </dl>
              <small className="muted">
                점수가 아니라 횟수예요. 적다고 못하는 게 아니고, 많다고 잘하는 것도 아니에요.
              </small>
            </section>
            <section className="panel">
              <h3>날짜별 기록</h3>
              <Timeline report={report} />
              <h4 className="section-title">어떤 이야기였나요</h4>
              {report.categoryBreakdown.length === 0 ? (
                <p className="muted">아직 마친 이야기가 없어요.</p>
              ) : (
                <ul className="checklist">
                  {report.categoryBreakdown.map((row) => (
                    <li key={row.category}>
                      {row.category} · {row.completedStories}편
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      <section className="panel space-top">
        <div className="row between wrap">
          <h3>이 기간을 글로 정리해 볼까요</h3>
          {summary && (
            <span className={`tag ${summary.source === 'ai' ? 'teal' : 'gold'}`}>
              {aiSourceLabel(summary.source)}
            </span>
          )}
        </div>
        <p className="muted space-top">
          같은 기간·같은 기록으로 이미 만든 요약이 있으면 그대로 다시 보여 드려요. 원본 기록이
          바뀌면 요약은 <strong>STALE</strong>(지난 내용)로 표시돼요.
        </p>
        <div className="actions split">
          <Button disabled={busy || !report} onClick={makeSummary}>
            <Icon name="spark" />
            {busy ? '만드는 중…' : '요약 만들기'}
          </Button>
          {summary && (
            <Button className="light" disabled={busy} onClick={refreshSummary}>
              다시 불러오기
            </Button>
          )}
        </div>
        <ActionResult message={message} failed={failed} />
        {summary && (
          <>
            {summary.status === 'STALE' && (
              <Notice variant="error">
                이 요약을 만든 뒤 기록이 바뀌었어요. 지금 상태와 다를 수 있으니 새로 만들어 주세요.
              </Notice>
            )}
            <dl className="definition">
              <dt>기간</dt>
              <dd>
                {summary.period.from} ~ {summary.period.to}
              </dd>
              <dt>만든 방식</dt>
              <dd>
                {aiSourceLabel(summary.source)}
                {summary.source === 'fallback' &&
                  (mode === 'ai'
                    ? ' · AI 대화 동의는 있지만 AI가 답하지 못해 준비된 문장으로 만들었어요'
                    : ' · AI 대화 동의가 없어 준비된 문장으로 만들었어요')}
              </dd>
              <dt>만든 시각</dt>
              <dd>{new Date(summary.createdAt).toLocaleString('ko-KR')}</dd>
            </dl>
            {(
              [
                ['이런 모습이 보였어요', summary.summary.highlights],
                ['함께 해 보면 좋을 것', summary.summary.suggestions],
                ['이렇게 물어봐 주세요', summary.summary.conversationTips],
              ] as const
            ).map(([title, lines]) =>
              lines.length === 0 ? null : (
                <div key={title}>
                  <h4 className="section-title">{title}</h4>
                  <ul className="checklist">
                    {lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ),
            )}
            {summary.notice && <Notice>{summary.notice}</Notice>}
          </>
        )}
      </section>
    </>
  );
}

export function GuardianProgressScreen() {
  return (
    <GuardianSection
      title="무엇을 했는지, 있는 그대로."
      description="능력을 매기지 않아요. 아이가 실제로 말하고 쓴 횟수와 이야기한 날을 보여 드려요."
    >
      <GuardianGate>
        <ProgressBody />
      </GuardianGate>
    </GuardianSection>
  );
}
