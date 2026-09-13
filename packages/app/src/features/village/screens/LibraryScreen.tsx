import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PLACES, TRACKS } from '../data/catalog';
import { useVillage } from '../state/VillageProvider';
import { Icon } from '../components/Icon';
import { StageArt } from '../components/Simulation';
import { InquiryComparison } from '../components/InquiryComparison';
import { ThinkingComparison } from '../components/ThinkingComparison';
import {
  Button,
  EmptyState,
  Notice,
  PageHeading,
  Provenance,
  ReadAloud,
  RubricBars,
} from '../components/ui';
export function LibraryScreen() {
  const { data } = useVillage();
  const [params, setParams] = useSearchParams();
  const track = params.get('track') ?? 'all',
    source = params.get('source') ?? 'all',
    query = params.get('q') ?? '',
    favorites = params.get('favorites') === 'yes';
  const setFilter = (key: string, value: string) =>
    setParams(
      (p) => {
        p.set(key, value);
        return p;
      },
      { replace: true },
    );
  const records = data.sessions.filter(
    (r) =>
      (track === 'all' || r.track === track) &&
      (source === 'all' || r.source === source) &&
      (!favorites || r.favorite) &&
      `${r.title} ${r.text}`.includes(query),
  );
  return (
    <>
      <PageHeading
        eyebrow="MY GROWING LIBRARY"
        title="내 생각으로 채워지는 책장"
        description="작은 발견도, 달라진 생각도. 모두 소중한 나의 기록이에요."
      >
        <span className="tag teal">
          직접 완료 {data.sessions.filter((r) => r.source === 'local').length}개
        </span>
      </PageHeading>
      <div className="library-toolbar">
        <div className="filters" role="group" aria-label="학습 공간 필터">
          {[['all', '전체'], ...TRACKS.map((t) => [t, PLACES[t].name])].map(([key, label]) => (
            <button
              key={key}
              className={`chip ${track === key ? 'active' : ''}`}
              aria-pressed={track === key}
              onClick={() => setFilter('track', key!)}
            >
              {label}{' '}
              <small>{data.sessions.filter((r) => key === 'all' || r.track === key).length}</small>
            </button>
          ))}
        </div>
        <div className="row wrap">
          <label className="search-field">
            <Icon name="search" />
            <input
              aria-label="책장 검색"
              value={query}
              placeholder="제목이나 내 문장 찾기"
              onChange={(e) => setFilter('q', e.target.value)}
            />
          </label>
          <select
            className="compact-select"
            aria-label="기록 종류"
            value={source}
            onChange={(e) => setFilter('source', e.target.value)}
          >
            <option value="all">모든 기록</option>
            <option value="local">내가 남긴 기록</option>
            <option value="mock">예시 기록</option>
          </select>
          <button
            className={`chip ${favorites ? 'active' : ''}`}
            aria-pressed={favorites}
            onClick={() => setFilter('favorites', favorites ? 'no' : 'yes')}
          >
            <Icon name="heart" />
            아끼는 기록
          </button>
        </div>
      </div>
      <div className="section-title">
        <small>{records.length}개의 기록</small>
        <small>최근에 남긴 순서</small>
      </div>
      {records.length ? (
        <div className="cards books">
          {records.map((r) => (
            <article className="book" key={r.id}>
              <div className={`book-cover ${PLACES[r.track].color}`}>
                <span className="eyebrow">MY LITTLE DISCOVERY</span>
                <h3>{r.title}</h3>
                <Icon name={PLACES[r.track].icon} />
              </div>
              <div className="book-body">
                <div className="row between">
                  <span className={`tag ${PLACES[r.track].color}`}>{PLACES[r.track].name}</span>
                  <span className={`tag ${r.source === 'mock' ? 'gold' : 'teal'}`}>
                    {r.source === 'mock' ? '예시 기록' : '내가 쓴 문장'}
                  </span>
                </div>
                <p className="line-clamp">{r.text}</p>
                <small className="muted">
                  {r.date} · {r.durationMinutes}분의 모험 {r.favorite && '· ♥'}
                </small>
                <Link to={`/shelf/${r.id}`} className="btn light">
                  내 생각 펼쳐 보기
                  <Icon name="arrow" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            query || favorites || track !== 'all'
              ? '조건에 맞는 기록이 없어요.'
              : '아직 쓰이지 않은, 무궁무진한 이야기.'
          }
          description="검색 조건을 바꾸거나 새로운 모험에서 첫 문장을 남겨 보세요."
        />
      )}
      <Notice>
        ‘예시 기록’은 서비스를 둘러보기 위한 목데이터예요. 직접 작성한 기록과 구분되며, 아이의 자동
        예시 기록은 서비스를 둘러보기 위한 목데이터예요. 직접 만든 이야기와 구분해 보여요.
      </Notice>
    </>
  );
}
export function RecordDetailScreen() {
  const { id } = useParams();
  const { data, update, toast } = useVillage();
  const [scene, setScene] = useState(0);
  const [copied, setCopied] = useState(false);
  const record = data.sessions.find((r) => r.id === id);
  if (!record)
    return (
      <EmptyState
        title="기록을 찾지 못했어요."
        description="보관기간이 지났거나 삭제된 기록일 수 있어요."
        to="/shelf"
        action="책장으로 돌아가기"
      />
    );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${record.title}\n${record.date} · ${record.source === 'mock' ? '예시 기록' : '내가 직접 남긴 기록'}\n\n${record.answers.map((a) => `${a.question}\n${a.text}`).join('\n\n')}`,
      );
      setCopied(true);
      toast('기록을 클립보드에 복사했어요.');
    } catch {
      toast('복사 권한이 없어요. 아래 문장을 직접 선택해 복사할 수 있어요.');
    }
  };
  return (
    <>
      <Link to="/shelf" className="back">
        <Icon name="back" />
        나의 책장
      </Link>
      <PageHeading
        eyebrow="MY LITTLE DISCOVERY"
        title={record.title}
        description={`${record.date} · ${PLACES[record.track].name} · ${record.durationMinutes}분의 모험`}
      >
        <Button
          className="light small"
          aria-pressed={record.favorite}
          onClick={() =>
            update((p) => ({
              ...p,
              sessions: p.sessions.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r)),
            }))
          }
        >
          <Icon name="heart" />
          {record.favorite ? '아끼는 기록에 담았어요' : '아끼는 기록에 담기'}
        </Button>
      </PageHeading>
      {record.source === 'mock' && (
        <Notice>
          서비스 흐름을 살펴보기 위한 예시 목데이터예요. 실제 아이의 학습 결과가 아니에요.
        </Notice>
      )}
      {record.thinking ? (
        <>
          <ThinkingComparison thinking={record.thinking} />
          <div className="actions">
            <ReadAloud text={record.text} />
            <Button className="light" onClick={() => void copy()}>
              {copied ? '복사했어요' : '내 문장 복사하기'}
            </Button>
          </div>
          <Provenance mock={record.source === 'mock'} />
        </>
      ) : record.inquiry ? (
        <>
          <InquiryComparison inquiry={record.inquiry} />
          <div className="actions">
            <ReadAloud text={record.text} />
            <Button className="light" onClick={() => void copy()}>
              {copied ? '복사했어요' : '내 문장 복사하기'}
            </Button>
          </div>
          <Provenance mock={record.source === 'mock'} />
        </>
      ) : (
        <div className="learning-grid">
          <section className="panel">
            <span className={`tag ${PLACES[record.track].color}`}>내 생각이 이어진 과정</span>
            {record.answers.map((a, i) => (
              <section className="answer-block" key={i}>
                <div className="eyebrow">MY THOUGHT {i + 1}</div>
                <h3>{a.question}</h3>
                <div className="quote">{a.text}</div>
              </section>
            ))}
            {record.observations && (
              <details>
                <summary>직접 남긴 관찰과 출처</summary>
                <dl className="definition">
                  <dt>처음 예상</dt>
                  <dd>{record.observations.prediction}</dd>
                  <dt>관찰 조건</dt>
                  <dd>
                    {record.observations.mode === 'custom'
                      ? '자유 주제 관찰'
                      : '낮은 값과 높은 값 비교'}
                  </dd>
                  {record.observations.mode === 'custom' && (
                    <>
                      <dt>첫 관찰</dt>
                      <dd>{record.observations.a}</dd>
                      <dt>두 번째 관찰</dt>
                      <dd>{record.observations.b}</dd>
                    </>
                  )}
                  <dt>확인한 출처</dt>
                  <dd>{record.observations.source || '—'}</dd>
                </dl>
              </details>
            )}
            {record.emotion && <p className="muted">내가 느낀 마음 · {record.emotion}</p>}
            <div className="actions split">
              <ReadAloud text={record.text} />
              <Button className="light small" onClick={() => void copy()}>
                {copied ? '복사했어요' : '내 문장 복사하기'}
              </Button>
            </div>
          </section>
          <div className="stack">
            <section className="panel">
              <h3>이번 활동의 생각 발자국</h3>
              {record.rubric && <RubricBars rubric={record.rubric} />}
              <Provenance mock={record.source === 'mock'} />
            </section>
            {record.story && (
              <section className="story-card">
                <div className="stage">
                  <StageArt scene={scene} activityId={record.activityId} />
                  <span className="scene-label">이야기 다시 보기 · {scene + 1} / 4</span>
                </div>
                <div className="scene-caption" aria-live="polite">
                  {record.story.scenes[scene]}
                </div>
                <div className="stage-controls actions split">
                  <Button
                    className="light small"
                    disabled={scene === 0}
                    onClick={() => setScene(scene - 1)}
                  >
                    이전 장면
                  </Button>
                  <Button
                    className="light small"
                    disabled={scene === 3}
                    onClick={() => setScene(scene + 1)}
                  >
                    다음 장면
                  </Button>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}
export function CompleteScreen() {
  const { id } = useParams();
  const { data, storageError } = useVillage();
  const record = data.sessions.find((s) => s.id === id);
  if (!record)
    return (
      <EmptyState
        title="완료한 기록을 찾지 못했어요."
        description="책장에서 다른 기록을 찾아볼 수 있어요."
        to="/shelf"
        action="책장으로 가기"
      />
    );
  if (record.thinking)
    return (
      <div className="inquiry">
        <div className="success-head">
          <div className="success-mark">
            <Icon name="sprout" />
          </div>
          <span className="tag teal" role="status">
            {storageError ? '기기 저장 확인 필요' : '저장 완료'}
          </span>
          <h1>내 탐구를 책장에 담았어요.</h1>
          <p>
            {storageError
              ? '현재 화면에는 남아 있어요. 기기에는 저장하지 못했으니 기록 관리에서 내려받아 주세요.'
              : '처음 생각부터 친구를 설득한 증거까지, 언제든 다시 볼 수 있어요.'}
          </p>
        </div>
        <ThinkingComparison thinking={record.thinking} />
        <div className="actions split">
          <Link to="/" className="btn light">
            첫 화면으로
          </Link>
          <Link to={`/shelf/${record.id}`} className="btn">
            책장에서 다시 보기
            <Icon name="book" />
          </Link>
        </div>
        <p className="inquiry-footnote">
          생각 친구는 AI예요. 결과 계산과 설득 판정은 정해진 규칙이 해요. · 사고 기술은 점수가
          아니에요.
        </p>
      </div>
    );
  if (record.inquiry)
    return (
      <div className="inquiry">
        <div className="success-head">
          <div className="success-mark">
            <Icon name="sprout" />
          </div>
          <span className="tag teal" role="status">
            {storageError ? '기기 저장 확인 필요' : '저장 완료'}
          </span>
          <h1>내 탐구를 책장에 담았어요.</h1>
          <p>
            {storageError
              ? '현재 화면에는 남아 있어요. 기기에는 저장하지 못했으니 기록 관리에서 내려받아 주세요.'
              : '처음 생각부터 마지막 이유까지, 언제든 다시 볼 수 있어요.'}
          </p>
        </div>
        <InquiryComparison inquiry={record.inquiry} />
        <div className="actions split">
          <Link to="/" className="btn light">
            첫 화면으로
          </Link>
          <Link to={`/shelf/${record.id}`} className="btn">
            책장에서 다시 보기
            <Icon name="book" />
          </Link>
        </div>
        <p className="inquiry-footnote">체험용 질문·결과 · 실제 AI 연결 없음 · 사람 검수 미완료</p>
      </div>
    );
  return (
    <div className="center">
      <div className="success-head">
        <div className="success-mark">
          <Icon name="sprout" />
        </div>
        <div className="eyebrow">ONE MORE LITTLE DISCOVERY</div>
        <h1 className="space-top">나만의 생각이 한 뼘 자랐어요.</h1>
        <p>
          {data.profile.name}의 문장을{' '}
          {storageError
            ? '현재 화면에 담았어요. 기기 저장은 실패했어요.'
            : '책장에 소중히 담았어요.'}
        </p>
      </div>
      <section className="panel">
        <span className={`tag ${PLACES[record.track].color}`}>
          {PLACES[record.track].name} · 모험 완료
        </span>
        <h2 className="space-top">{record.title}</h2>
        <div className="quote">{record.answers.at(-1)?.text}</div>
        {record.rubric && <RubricBars rubric={record.rubric} />}
        <Provenance mock={record.source === 'mock'} />
        <div className="actions split">
          <Link to="/adventures" className="btn light">
            다른 모험 만나기
          </Link>
          <Link to={`/shelf/${record.id}`} className="btn">
            내 기록 펼쳐 보기
            <Icon name="book" />
          </Link>
        </div>
      </section>
    </div>
  );
}
