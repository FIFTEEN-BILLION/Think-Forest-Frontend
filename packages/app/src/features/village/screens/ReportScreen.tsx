import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PLACES, RUBRIC, TRACKS } from '../data/catalog';
import { useVillage } from '../state/VillageProvider';
import { average, gateSize } from '../lib/learning';
import { Button, EmptyState, Notice, PageHeading, Provenance } from '../components/ui';
import type { SessionRecord } from '../types';
function ProgressChart({ records }: { records: SessionRecord[] }) {
  const rows = records.slice(0, 7).reverse();
  const x = (i: number) => (rows.length === 1 ? 260 : 45 + (i * 430) / (rows.length - 1)),
    y = (value: number) => 190 - value * 1.5;
  return (
    <>
      <svg
        className="chart"
        viewBox="0 0 520 230"
        role="img"
        aria-label="최근 7개 활동의 관찰력, 이유 찾기, 표현력 추이. 아래 표에 모든 수치가 있어요."
      >
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <path d={`M40 ${y(v)}H490`} stroke="var(--line)" strokeDasharray="3 4" />
            <text x="8" y={y(v) + 4}>
              {v}
            </text>
          </g>
        ))}
        {RUBRIC.map(({ key, color }, j) => (
          <g key={key}>
            <polyline
              points={rows.map((r, i) => `${x(i)},${y(r.rubric[key])}`).join(' ')}
              stroke={`var(${color})`}
              strokeWidth="2.5"
              strokeDasharray={j === 1 ? '7 4' : j === 2 ? '2 4' : undefined}
              fill="none"
            />
            {rows.map((r, i) =>
              j === 0 ? (
                <circle key={r.id} cx={x(i)} cy={y(r.rubric[key])} r="4" fill={`var(${color})`} />
              ) : j === 1 ? (
                <rect
                  key={r.id}
                  x={x(i) - 4}
                  y={y(r.rubric[key]) - 4}
                  width="8"
                  height="8"
                  fill={`var(${color})`}
                />
              ) : (
                <path
                  key={r.id}
                  d={`m${x(i)} ${y(r.rubric[key]) - 5} 5 9h-10Z`}
                  fill={`var(${color})`}
                />
              ),
            )}
          </g>
        ))}
        {rows.map((r, i) => (
          <text key={r.id} x={x(i)} y="216" textAnchor="middle">
            {r.date.slice(5)} · {i + 1}
          </text>
        ))}
      </svg>
      <div className="legend">
        {RUBRIC.map(({ key, color, label, symbol }) => (
          <span key={key} style={{ color: `var(${color})` }}>
            {symbol} {label}
          </span>
        ))}
      </div>
    </>
  );
}
export function ReportScreen() {
  const { data, update } = useVillage();
  const [period, setPeriod] = useState(7);
  const [source, setSource] = useState('all');
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());
  const records = data.sessions.filter(
    (r) =>
      (source === 'all' || r.source === source) &&
      Date.parse(r.completedAt) >= now - period * 86400000,
  );
  const week = data.sessions.filter(
    (r) =>
      (source === 'all' || r.source === source) && Date.parse(r.completedAt) >= now - 7 * 86400000,
  );
  const includesMock = records.some((r) => r.source === 'mock');
  const summaryMatches =
    data.summary &&
    data.summary.recordIds.length === week.length &&
    data.summary.recordIds.every((id) => week.some((r) => r.id === id));
  const summarize = async () => {
    setBusy(true);
    try {
      // Local mock adapter: no network or AI request. All inputs are the selected records.
      const result = await Promise.resolve({
        text: `${data.profile.name}는 최근 7일 동안 ${[...new Set(week.map((r) => PLACES[r.track].name))].join(', ')}에서 ${week.length}개의 모험을 만났어요. 가장 최근 기록은 “${week[0]?.title ?? ''}”예요.`,
        next: '다음에는 “무엇을 보고 그렇게 생각했어?”라고 물어보고, 아이가 스스로 말할 시간을 기다려 주세요.',
      });
      update((p) => ({
        ...p,
        summary: {
          ...result,
          at: new Date().toISOString(),
          source: 'rule',
          recordIds: week.map((r) => r.id),
          includesMock: week.some((r) => r.source === 'mock'),
        },
      }));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="SMALL STEPS, REAL GROWTH"
        title="작은 생각들이 쌓이고 있어요."
        description="순위보다 중요한 것은, 아이가 스스로 남긴 생각의 과정이에요."
      />
      <div className="row between wrap">
        <div className="filters" role="group" aria-label="리포트 기간">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              className={`chip ${period === days ? 'active' : ''}`}
              aria-pressed={period === days}
              onClick={() => setPeriod(days)}
            >
              최근 {days}일
            </button>
          ))}
        </div>
        <select
          className="compact-select"
          aria-label="리포트 기록 종류"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="all">모든 기록 · 예시 포함</option>
          <option value="local">직접 완료한 기록만</option>
          <option value="mock">예시 기록만</option>
        </select>
      </div>
      {includesMock && (
        <Notice>
          예시 목데이터가 포함된 리포트예요. 실제 아이의 성장을 나타내지 않아요. ‘직접 완료한
          기록만’으로 바꾸면 내 활동만 볼 수 있어요.
        </Notice>
      )}
      <div className="cards stats">
        <section className="panel">
          <span className="stat-label">선택한 기간의 모험</span>
          <div className="metric">
            {records.length}
            <small>개 완료 {includesMock && '· 예시 포함'}</small>
          </div>
          <small className="muted">최근 {period}일 기록</small>
        </section>
        <section className="panel">
          <span className="stat-label">만나 본 배움의 공간</span>
          <div className="metric">
            {new Set(records.map((r) => r.track)).size}
            <small>/ 3곳</small>
          </div>
          <small className="muted">다양하게, 조금씩</small>
        </section>
        <section className="panel">
          <span className="stat-label">다음 모험의 글쓰기 문턱</span>
          <div className="metric">
            {gateSize(data)}
            <small>자부터 시작</small>
          </div>
          <small className="muted">직접 완료한 활동과 보호자 설정 기준</small>
        </section>
      </div>
      <div className="bottom-grid">
        <section className="panel">
          <div className="row between">
            <h3>생각 발자국의 변화</h3>
            <small className="muted">선택 기간 중 최근 7개</small>
          </div>
          {records.length ? (
            <ProgressChart records={records} />
          ) : (
            <EmptyState
              icon="chart"
              title="첫 기록이 자라면 그래프가 열려요."
              description="새 모험에서 나만의 문장을 남겨 보세요."
            />
          )}
        </section>
        <section className="panel">
          <span className="eyebrow">THIS WEEK'S LETTER</span>
          <h3 className="space-top">{data.profile.name}의 이번 주 이야기</h3>
          {summaryMatches && data.summary ? (
            <>
              <p className="space-top">{data.summary.text}</p>
              <div className="quote">{data.summary.next}</div>
              <small className="muted">
                {data.summary.at.slice(0, 10)} 생성 ·{' '}
                {data.summary.includesMock ? '예시 포함' : '직접 완료 기록'} · 규칙 기반 요약
              </small>
            </>
          ) : (
            <p className="muted space-top">
              최근 7일의 활동을 모아 부모님께 전할 작은 편지를 만들어요. 선택한 기록 종류를 기준으로
              요약해요.
            </p>
          )}
          <div className="actions">
            <Button
              className="light"
              disabled={week.length === 0 || busy}
              onClick={() => void summarize()}
            >
              {busy
                ? '기록 정리 중…'
                : summaryMatches
                  ? '최신 기록으로 다시 요약'
                  : '이번 주 요약 만들기'}
            </Button>
          </div>
          <Provenance mock={week.some((r) => r.source === 'mock')} />
        </section>
      </div>
      <section className="panel space-top">
        <h3>공간별 모험의 균형</h3>
        <div className="track-breakdown">
          {TRACKS.map((track) => {
            const count = records.filter((r) => r.track === track).length;
            return (
              <div key={track}>
                <span className={`tag ${PLACES[track].color}`}>{PLACES[track].name}</span>
                <div className="bar">
                  <span
                    style={{
                      width: `${records.length ? (count / records.length) * 100 : 0}%`,
                      background: `var(--${PLACES[track].color})`,
                    }}
                  />
                </div>
                <strong>{count}개</strong>
              </div>
            );
          })}
        </div>
      </section>
      {records.length > 0 && (
        <section className="panel space-top">
          <h3>활동별 생각 기록</h3>
          <div className="table-wrap">
            <table>
              <caption>
                단순 문장 규칙으로 계산한 참고값 · {includesMock ? '예시 포함' : '직접 완료 기록'}
              </caption>
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>모험</th>
                  <th>기록 종류</th>
                  {RUBRIC.map((r) => (
                    <th key={r.key}>
                      {r.symbol} {r.label}
                    </th>
                  ))}
                  <th>평균</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td>
                      <Link to={`/shelf/${r.id}`}>{r.title}</Link>
                    </td>
                    <td>{r.source === 'mock' ? '예시' : '직접 작성'}</td>
                    {RUBRIC.map((s) => (
                      <td key={s.key}>{r.rubric[s.key]}점</td>
                    ))}
                    <td>{average(r.rubric)}점</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <Notice>
        점수는 문장 길이와 표현을 살펴본 참고값이에요. 검증된 학습 성취·발달 평가가 아니에요. 색상과
        기호를 함께 사용해 구분해요.
      </Notice>
    </>
  );
}
