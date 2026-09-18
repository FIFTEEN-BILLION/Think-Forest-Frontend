import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getActivity, listActivities } from '../api/v1/endpoints';
import type { ActivityDetail } from '../api/v1/types';
import { useAuth } from '../providers/AuthProvider';
import { beginServerSession } from '../components/ActivitySessionBar';
import { filterCatalog, localEntry, serverEntry } from '../components/ActivityCatalog';
import type { CatalogEntry } from '../components/ActivityCatalog';
import { cancelSession, linkedSessionId, writeLink } from '../components/ActivitySync';
import { CATALOG, PLACES, TRACKS } from '../data/catalog';
import { useVillage } from '../providers/VillageProvider';
import {
  Button,
  DiscardDraft,
  EmptyState,
  Notice,
  PageHeading,
  Provenance,
  Steps,
} from '../components/ui';
import { Icon } from '../components/Icon';
import { ForestArt, VillageArt } from '../components/Artwork';
import { StageArt } from '../components/Simulation';
import type { Track } from '../types/village';
import { THINKING_STEPS, THINKING_STEP_HINTS } from '../lib/thinking';
import { PATH_STEPS, PATH_STEP_HINTS } from '../lib/path';
const stepDescriptions: Record<Track, string[]> = {
  forest: [
    '이야기를 읽고 눈에 보이는 단서를 살펴봐요.',
    '어떤 단서를 보고 무엇을 생각했는지 적어요.',
    '새 단서를 읽고 달라진 생각을 남겨요.',
    '아직 모르는 것과 더 알아볼 방법을 적어요.',
    '처음부터 이어진 내 문장을 책장에 모아요.',
  ],
  lab: [
    '궁금한 주제와 직접 바꿀 조건을 알아봐요.',
    '실험하기 전에 내 예상과 이유를 적어요.',
    '서로 다른 두 조건을 직접 관찰해요.',
    '관찰한 결과를 처음 예상과 비교해요.',
    '다른 조건에서 더 확인할 질문을 적어요.',
    '예상부터 발견까지 내 문장을 기록해요.',
  ],
  theater: [
    '보호자가 함께 나눌 마음 키워드를 골라요.',
    '보호자가 전체 대본과 두 가지 분기를 확인해요.',
    '이야기를 보고 내가 할 행동을 선택해요.',
    '느낀 마음과 친구에게 건넬 말을 적어요.',
    '내 선택과 문장을 함께 돌아보고 기록해요.',
  ],
};
export function AdventureScreen() {
  const { track, activityId } = useParams();
  const [params] = useSearchParams();
  const preview =
    activityId === 'first-inquiry' && params.get('preview') === 'connection-error'
      ? '?preview=connection-error'
      : '';
  const [search, setSearch] = useState('');
  const { data, start } = useVillage();
  const { client, status } = useAuth();
  const navigate = useNavigate();
  const [serverList, setServerList] = useState<CatalogEntry[] | null>(null);
  const [starting, setStarting] = useState(false);
  const [detail, setDetail] = useState<ActivityDetail | null>(null);
  const selectedTrack = TRACKS.includes(track as Track) ? (track as Track) : null;
  const activity = CATALOG.find((a) => a.id === activityId && a.track === track);

  // 목록은 서버가 원본이다. 로그인 전이거나 실패하면 이 기기 목록으로 그린다.
  useEffect(() => {
    if (status !== 'signedIn' || activityId) return;
    const controller = new AbortController();
    listActivities(client, { limit: 50 }, controller.signal).then(
      (page) => !controller.signal.aborted && setServerList(page.items.map(serverEntry)),
      () => !controller.signal.aborted && setServerList(null),
    );
    return () => controller.abort();
  }, [client, status, activityId]);

  // 활동 소개·단계는 서버 상세를 쓴다. 그림과 미션 화면은 이 기기 구성 그대로 둔다.
  useEffect(() => {
    if (status !== 'signedIn' || !activityId) return;
    const controller = new AbortController();
    getActivity(client, activityId, controller.signal).then(
      (response) => !controller.signal.aborted && setDetail(response.activity),
      () => !controller.signal.aborted && setDetail(null),
    );
    return () => controller.abort();
  }, [client, status, activityId]);

  const entries = useMemo(
    () => filterCatalog(serverList ?? CATALOG.map(localEntry), selectedTrack, search),
    [serverList, selectedTrack, search],
  );

  if ((activityId && !activity) || (track && !selectedTrack))
    return (
      <EmptyState title="이 모험을 찾지 못했어요." description="모험 목록에서 다시 골라 주세요." />
    );
  const begin = async () => {
    if (!activity) return;
    const next = `/adventures/${activity.track}/${activity.id}${preview}`;
    if (!data.consent.done) {
      navigate(`/first-talk?next=${encodeURIComponent(next)}`);
      return;
    }
    const draft = start(activity.track, activity.id);
    if (!draft) return;
    // 로그인했으면 서버 세션을 함께 연다. 실패해도 이 기기 초안으로 계속 진행한다.
    if (status === 'signedIn') {
      setStarting(true);
      await beginServerSession(client, draft);
      setStarting(false);
    }
    navigate(`/session/${draft.track}${preview}`);
  };
  /** 작성 중인 모험을 정리할 때 서버 세션도 함께 취소한다. */
  const discardServerSession = (draftId: string) => {
    const sessionId = linkedSessionId(draftId);
    writeLink(draftId, null);
    if (sessionId && status === 'signedIn')
      void cancelSession(client, sessionId).catch(() => undefined);
  };
  if (activity)
    return (
      <>
        <Link className="back" to={`/adventures/${activity.track}`}>
          <Icon name="back" />
          {PLACES[activity.track].name} 모험 목록
        </Link>
        <PageHeading
          eyebrow="BEFORE OUR ADVENTURE"
          title={detail?.title ?? activity.title}
          description={detail?.subtitle ?? activity.subtitle}
        />
        <div className="learning-grid">
          <article className="story-card">
            <div className={activity.track === 'theater' ? 'stage' : 'story-art'}>
              {activity.track === 'forest' ? (
                <ForestArt />
              ) : activity.track === 'theater' ? (
                <StageArt scene={0} activityId={activity.id} />
              ) : (
                <VillageArt />
              )}
            </div>
            <div className="story-body">
              <div className="row wrap">
                <span className={`tag ${PLACES[activity.track].color}`}>
                  {PLACES[activity.track].name}
                </span>
                <span className="tag">약 {detail?.estimatedMinutes ?? activity.duration}분</span>
              </div>
              <h2 className="space-top">{detail?.subtitle ?? activity.subtitle}</h2>
              <p>{detail?.description ?? activity.description}</p>
              <Provenance />
            </div>
          </article>
          <section className="coach">
            <span className="eyebrow">TODAY'S ADVENTURE</span>
            <h2>이번 모험은 이렇게 진행돼요.</h2>
            <ol className="journey-list">
              {(activity.id === 'first-inquiry'
                ? THINKING_STEPS
                : activity.id === 'path-teaching'
                  ? PATH_STEPS
                  : (detail?.steps ?? PLACES[activity.track].steps)
              ).map((s, i) => (
                <li key={s}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{s}</strong>
                    <small>
                      {activity.id === 'first-inquiry'
                        ? THINKING_STEP_HINTS[i]
                        : activity.id === 'path-teaching'
                          ? PATH_STEP_HINTS[i]
                          : stepDescriptions[activity.track][i]}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
            {preview && (
              <Notice>
                검토용 시연 · 뜻 확인 질문에서 연결 오류가 한 번 나타나요. 다시 시도하면 계속할 수
                있어요. 실제 AI 호출은 없어요.
              </Notice>
            )}
            <Notice>정해진 난이도는 없어요. 네 속도대로 자유롭게 오래 말해도 좋아요.</Notice>
            {data.resume ? (
              <>
                <Notice>
                  진행 중인 <strong>{data.resume.title}</strong> 모험이 있어요. 먼저 이어 하거나
                  작성 중인 모험을 정리해 주세요.
                </Notice>
                <Link to={`/session/${data.resume.track}`} className="btn">
                  진행 중인 모험 이어하기
                </Link>
                <DiscardDraft onDone={() => discardServerSession(data.resume!.id)} />
              </>
            ) : (
              <Button onClick={() => void begin()} disabled={starting}>
                {starting
                  ? '모험을 준비하는 중…'
                  : !data.consent.done
                    ? '시작 준비하고 모험 떠나기'
                    : activity.track === 'theater'
                      ? '보호자와 이야기 준비하기'
                      : '이 모험 시작하기'}
                <Icon name="arrow" />
              </Button>
            )}
          </section>
        </div>
      </>
    );
  return (
    <>
      <PageHeading
        eyebrow="CHOOSE YOUR ADVENTURE"
        title={selectedTrack ? PLACES[selectedTrack].name : '오늘은 어디로 떠나 볼까요?'}
        description={
          selectedTrack
            ? PLACES[selectedTrack].description
            : '궁금한 이야기와 실험을 골라, 나에게 맞는 속도로 시작해요.'
        }
      />
      <div className="row between wrap">
        <div className="filters">
          <Link to="/adventures" className={`chip ${!selectedTrack ? 'active' : ''}`}>
            모든 모험
          </Link>
          {TRACKS.map((t) => (
            <Link
              key={t}
              to={`/adventures/${t}`}
              className={`chip ${selectedTrack === t ? 'active' : ''}`}
            >
              {PLACES[t].name}
            </Link>
          ))}
        </div>
        <label className="search-field">
          <Icon name="search" />
          <input
            aria-label="모험 검색"
            placeholder="궁금한 제목이나 키워드"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="cards books">
        {entries.map((a) => (
          <article className="book" key={a.id}>
            <div className={`book-cover ${PLACES[a.track].color}`}>
              <span className="eyebrow">{PLACES[a.track].area}</span>
              <h3>{a.title}</h3>
              <Icon name={PLACES[a.track].icon} />
            </div>
            <div className="book-body">
              <div className="row wrap">
                {a.tags.map((tag) => (
                  <span className={`tag ${PLACES[a.track].color}`} key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="space-top">{a.subtitle}</h3>
              <p>{a.description}</p>
              <small className="muted">약 {Math.max(15, a.minutes)}분 · 자유롭게 이야기해요</small>
              <Link className="btn light" to={`/adventures/${a.track}/${a.id}`}>
                모험 자세히 보기
                <Icon name="arrow" />
              </Link>
            </div>
          </article>
        ))}
      </div>
      {!entries.length && (
        <EmptyState
          title="아직 준비되지 않은 모험이에요."
          description="다른 검색어를 입력하거나 전체 모험을 살펴보세요."
        />
      )}
      <Steps
        labels={['마음에 드는 모험 고르기', '내 생각 먼저 꺼내기', '책장에 발견 남기기']}
        current={0}
      />
    </>
  );
}
