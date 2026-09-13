import { Link } from 'react-router-dom';
import { CATALOG, PLACES, TRACKS } from '../data/catalog';
import { useVillage } from '../state/VillageProvider';
import { VillageArt } from '../components/Artwork';
import { Icon } from '../components/Icon';
import { DiscardDraft, Notice, PageHeading } from '../components/ui';
export function HomeScreen() {
  const { data } = useVillage();
  const actual = data.sessions.filter((s) => s.source === 'local');
  return (
    <>
      <PageHeading
        eyebrow="YOUR LITTLE VILLAGE"
        title={`${data.profile.name}야, 오늘은 어떤 생각을 키워볼까?`}
        description="정답보다 궁금한 건, 너만의 생각과 이유야."
      />
      {data.resume && (
        <Notice>
          <div className="row between wrap">
            <div>
              <strong>아직 끝나지 않은 {PLACES[data.resume.track].name} 모험이 있어요.</strong>
              <p>
                {data.resume.title} · {data.resume.step + 1}번째 단계부터 이어갈 수 있어요.
              </p>
            </div>
            <Link className="btn small" to={`/session/${data.resume.track}`}>
              이어서 하기 <Icon name="arrow" />
            </Link>
          </div>
          <DiscardDraft />
        </Notice>
      )}
      <section className="hero">
        <div className="hero-copy">
          <span className="tag">
            <Icon name="spark" />
            처음과 지금, 내 생각을 발견하는 첫 탐구
          </span>
          <h2>
            “빛을 높이면
            <br />
            그림자는 어떻게 될까?”
          </h2>
          <p>
            내 생각을 먼저 적고, 두 조건을 살펴봐요.
            <br />
            처음과 지금의 생각을 나란히 만나 보세요.
          </p>
          <Link className="btn" to="/adventures/lab/first-inquiry">
            첫 탐구 시작하기 <Icon name="arrow" />
          </Link>
          <div className="hero-source">5단계 탐구 · 체험용 질문·결과 · 사람 검수 미완료</div>
        </div>
        <div className="hero-art">
          <VillageArt />
          <span className="art-caption">오늘도 새로운 질문이 자라는 생각숲</span>
        </div>
      </section>
      {!data.consent.done && (
        <div className="setup-banner">
          <span className="row">
            <Icon name="leaf" />
            <span>
              <strong>우리 아이의 첫걸음을 준비해요.</strong>
              <small>별명과 관심사를 정하고 짧은 첫 질문을 만나 보세요.</small>
            </span>
          </span>
          <Link className="btn small light" to="/welcome">
            시작 안내 보기 <Icon name="arrow" />
          </Link>
        </div>
      )}
      <div className="section-title">
        <h2>생각이 자라는 세 가지 모험</h2>
        <small>{data.profile.grade} · 나에게 맞는 속도로</small>
      </div>
      <div className="cards">
        {TRACKS.map((track) => {
          const p = PLACES[track];
          return (
            <article className={`activity-card ${p.color}`} key={track}>
              <div className="tile-icon">
                <Icon name={p.icon} />
              </div>
              <span className="eyebrow">{p.area}</span>
              <h3>{p.name}</h3>
              <p>{p.line}</p>
              <div className="card-action">
                <span>
                  {CATALOG.filter((a) => a.track === track).length}가지 모험 ·{' '}
                  {track === 'theater' ? '보호자와 함께' : '내 생각 먼저'}
                </span>
                <Link to={`/adventures/${track}`} className="btn ghost small">
                  만나 보기 <Icon name="arrow" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      <div className="bottom-grid">
        <section className="panel">
          <div className="row between">
            <h3>
              나의 생각 발자국 <small className="muted">직접 완료 {actual.length}개</small>
            </h3>
            <Link to="/shelf" className="btn ghost small">
              전체 보기 <Icon name="arrow" />
            </Link>
          </div>
          {data.sessions.slice(0, 3).map((r) => (
            <Link to={`/shelf/${r.id}`} className={`record ${PLACES[r.track].color}`} key={r.id}>
              <span className="tile-icon">
                <Icon name={PLACES[r.track].icon} />
              </span>
              <span>
                <strong>{r.title}</strong>
                <small>
                  {r.date} · {r.source === 'mock' ? '예시 기록' : '내가 직접 남긴 기록'}
                </small>
              </span>
              <Icon name="arrow" />
            </Link>
          ))}
          {data.sessions.length === 0 && (
            <div className="empty-inline">
              <Icon name="leaf" />첫 모험을 마치면 이곳에 생각이 쌓여요.
            </div>
          )}
        </section>
        <section className="panel question-panel">
          <div className="eyebrow">QUESTION OF THE DAY</div>
          <blockquote>
            “친구의 생각이 나와 다를 때,
            <br />
            무엇부터 물어보면 좋을까?”
          </blockquote>
          <p>오늘의 질문을 가족과 함께 나눠 보세요.</p>
          <Link className="btn ghost" to="/adventures/theater">
            마음극장에서 생각해 보기 <Icon name="arrow" />
          </Link>
        </section>
      </div>
      <section className="weekly-strip">
        <div>
          <span className="eyebrow">MY OWN PACE</span>
          <h3>조금씩, 꾸준히 자라는 중이에요.</h3>
        </div>
        <p>
          직접 완료한 모험 <strong>{actual.length}개</strong>
          <br />
          <small>예시 기록은 나의 활동 수에 포함하지 않아요.</small>
        </p>
        <Link to="/report" className="btn light">
          성장 리포트 보기 <Icon name="chart" />
        </Link>
      </section>
    </>
  );
}
