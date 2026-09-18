import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { CATALOG, EMOTIONS, FORESTS, PLACES } from '../data/catalog';
import { ForestArt, VillageArt } from '../components/Artwork';
import { Icon } from '../components/Icon';
import { Simulation, StageArt } from '../components/Simulation';
import {
  Button,
  EmptyState,
  Notice,
  PageHeading,
  Provenance,
  ReadAloud,
  RubricBars,
  Steps,
  WritingGate,
} from '../components/ui';
import { guard, hasObservations, scoreAnswers } from '../lib/learning';
import { useVillage } from '../providers/VillageProvider';
import type { Draft } from '../types/village';
import {
  ActivitySessionNotice,
  useActivityFlow,
  usesServerSession,
} from '../components/ActivitySessionBar';
import type { ActivityFlow } from '../components/ActivitySessionBar';
import { useStepFocus } from '../hooks/useStepFocus';
import { InquiryScreen } from './InquiryScreen';
import { PathTeachingScreen } from './PathTeachingScreen';
import { ThinkingInquiryScreen } from './ThinkingInquiryScreen';

export function SessionScreen() {
  const { data, storageError } = useVillage();
  const { track } = useParams();
  const d = data.resume;
  // 로그인했으면 서버 세션이 단계 조건과 완료 판정을 맡는다. 아니면 지금까지처럼 이 기기에서만 진행한다.
  const flow = useActivityFlow(d && usesServerSession(d) ? d : null);
  useStepFocus(d?.step);
  if (!data.consent.done) return <Navigate to="/first-talk" replace />;
  if (!d)
    return (
      <EmptyState
        title="새로운 모험을 시작해 볼까요?"
        description="진행 중인 모험이 없어요. 궁금한 활동을 골라 주세요."
      />
    );
  if (track !== d.track) return <Navigate to={`/session/${d.track}`} replace />;
  if (d.activityId === 'path-teaching' && d.path)
    return <PathTeachingScreen key={d.id} draft={d} />;
  if (d.activityId === 'first-inquiry' && d.thinking)
    return <ThinkingInquiryScreen key={d.id} draft={d} />;
  // Legacy v1 drafts saved before the thinking engine keep their original flow.
  if (d.activityId === 'first-inquiry' && d.inquiry) return <InquiryScreen key={d.id} draft={d} />;
  return (
    <>
      <div className="row between wrap">
        <Link to="/" className="back">
          <Icon name="back" />
          모험 저장하고 나가기
        </Link>
        <span className="autosave">
          <Icon name="check" />
          {storageError
            ? '기기 저장 상태를 확인해 주세요'
            : flow.linked
              ? '서버와 이 기기에 자동 저장'
              : '작성 내용 자동 저장'}
        </span>
      </div>
      <PageHeading
        eyebrow="MY LITTLE ADVENTURE"
        title={d.title}
        description={`${PLACES[d.track].name} · 내 생각을 먼저 꺼내는 시간`}
      />
      <Steps labels={PLACES[d.track].steps} current={d.step} />
      {d.track === 'forest' ? (
        <ForestFlow draft={d} flow={flow} />
      ) : d.track === 'lab' ? (
        <LabFlow draft={d} flow={flow} />
      ) : (
        <TheaterFlow key={d.id} draft={d} flow={flow} />
      )}
    </>
  );
}
// 화면의 비활성화는 도움말일 뿐이다. 실제 단계 이동은 서버가 조건을 다시 검사한 뒤에 일어난다.
function NextButton({
  draft,
  flow,
  children,
}: {
  draft: Draft;
  flow: ActivityFlow;
  children: string;
}) {
  const error = guard(draft);
  return (
    <div className="advance-area">
      <Button disabled={Boolean(error) || flow.busy} onClick={flow.advance}>
        {flow.busy ? '확인하는 중…' : children}
        <Icon name="arrow" />
      </Button>
      {error && <small className="muted">{error}</small>}
      <ActivitySessionNotice flow={flow} />
    </div>
  );
}
function WritingPanel({
  draft,
  flow,
  question,
  followup = false,
}: {
  draft: Draft;
  flow: ActivityFlow;
  question: string;
  followup?: boolean;
}) {
  const send = flow.send;
  return (
    <section className="coach">
      <div className="coach-head">
        <span className="avatar">
          <Icon name="sprout" />
        </span>
        생각 길잡이 <span className="tag">규칙 기반</span>
      </div>
      {followup && draft.followup && <div className="quote">{draft.followup}</div>}
      <h2>{question}</h2>
      <p>정답을 맞히기보다, 무엇을 보고 그렇게 생각했는지 궁금해요.</p>
      <WritingGate
        value={draft.text}
        min={draft.min}
        onChange={(text) => send({ type: 'text', text })}
      />
      {draft.hints > 0 && (
        <Notice>
          “나는 ___를 봤어요. 그래서 ___라고 생각해요. 더 확인하고 싶은 것은 ___예요.” 빈칸은 내
          생각으로 채워 봐요.
        </Notice>
      )}
      <div className="actions split">
        <Button className="ghost" onClick={() => send({ type: 'hint' })}>
          쓰기 도움
        </Button>
        <NextButton draft={draft} flow={flow}>
          내 문장 남기고 다음 단계
        </NextButton>
      </div>
      <Provenance />
    </section>
  );
}
function Review({ draft, flow }: { draft: Draft; flow: ActivityFlow }) {
  const navigate = useNavigate();
  return (
    <div className="center panel">
      <span className={`tag ${PLACES[draft.track].color}`}>마지막 단계 · 모험 돌아보기</span>
      <h2 className="space-top">내 생각이 이렇게 이어졌어요.</h2>
      <p className="muted">처음의 문장부터 마지막 발견까지, 나만의 작은 이야기예요.</p>
      {draft.answers.map((a, i) => (
        <section className="answer-block" key={i}>
          <div className="eyebrow">MY THOUGHT {i + 1}</div>
          <h3>{a.question}</h3>
          <div className="quote">{a.text}</div>
        </section>
      ))}
      {draft.track === 'theater' && (
        <p className="muted">내가 느낀 마음 · {draft.theater.emotion}</p>
      )}
      <RubricBars rubric={scoreAnswers(draft.answers)} />
      <Provenance />
      <div className="actions">
        <Button
          disabled={flow.busy}
          // 서버가 책장 기록을 만든 뒤에 이 기기 기록도 남기고 완료 화면으로 간다.
          onClick={() => flow.complete((id) => navigate(`/complete/${id}`, { replace: true }))}
        >
          {flow.busy ? '책장에 남기는 중…' : '내 모험을 책장에 남기기'}
          <Icon name="book" />
        </Button>
        <ActivitySessionNotice flow={flow} />
      </div>
    </div>
  );
}
function ForestFlow({ draft: d, flow }: { draft: Draft; flow: ActivityFlow }) {
  const f = FORESTS[d.activityId];
  if (!f)
    return (
      <EmptyState title="이야기를 찾지 못했어요." description="모험 목록에서 다시 골라 주세요." />
    );
  if (d.step === 4) return <Review draft={d} flow={flow} />;
  return (
    <div className="learning-grid">
      <article className="story-card">
        <div className="story-art">
          <ForestArt />
        </div>
        <div className="story-body">
          <span className="tag violet">
            창작 이야기 · {d.step >= 2 ? '새로운 단서' : '첫 번째 장면'}
          </span>
          <h2 className="space-top">{f.title}</h2>
          <p>{d.step >= 2 ? f.clue : f.intro}</p>
          <ReadAloud text={d.step >= 2 ? f.clue : f.intro} />
          <small className="muted block">
            그림은 분위기를 위한 삽화예요. 추리는 위 글의 단서로 해요.
          </small>
          {d.step >= 2 && (
            <details>
              <summary>처음 장면과 내 생각 다시 보기</summary>
              <p>{f.intro}</p>
              <div className="quote">{d.answers[0]?.text}</div>
            </details>
          )}
        </div>
      </article>
      {d.step === 0 ? (
        <section className="coach">
          <div className="coach-head">
            <span className="avatar">
              <Icon name="sprout" />
            </span>
            우리 아이 생각친구, 티키에 오신 걸 환영해요
          </div>
          <h2>눈에 보이는 것부터, 하나씩.</h2>
          <p>한 번에 답을 찾지 않아도 괜찮아요. 먼저 이야기 속 장면을 천천히 읽어 봐요.</p>
          <div className="options">
            {f.evidence.map((clue, i) => (
              <div className="option" key={clue}>
                <span className="number">단서 {i + 1}</span>
                <p>{clue}</p>
              </div>
            ))}
          </div>
          <Notice>
            내가 직접 확인한 것과 추측을 나누어 생각해요. 다음 화면에서 첫 문장을 남겨요.
          </Notice>
          <NextButton draft={d} flow={flow}>
            장면을 읽었어요, 내 생각 꺼내기
          </NextButton>
          <Provenance />
        </section>
      ) : (
        <WritingPanel
          draft={d}
          flow={flow}
          question={f.questions[d.step - 1] ?? ''}
          followup={d.step > 1}
        />
      )}
    </div>
  );
}
function LabFlow({ draft: d, flow }: { draft: Draft; flow: ActivityFlow }) {
  const { update } = useVillage();
  const send = flow.send;
  const lab = d.lab;
  if (d.step === 5) return <Review draft={d} flow={flow} />;
  if (d.step === 0)
    return (
      <div className="learning-grid">
        <section className="story-card">
          <div className="story-art">
            <VillageArt />
          </div>
          <div className="story-body">
            <span className="tag teal">호기심 실험실</span>
            <h2 className="space-top">작은 예상이 발견의 시작이에요.</h2>
            <p>
              먼저 어떻게 될지 생각하고, 한 가지 조건을 바꾸어 보세요. 관찰한 결과와 처음 예상을
              나란히 살펴봐요.
            </p>
          </div>
        </section>
        <section className="coach">
          <span className="eyebrow">01 · GET READY</span>
          <h2>오늘의 활동을 준비해요.</h2>
          {lab.mode === 'custom' ? (
            <div className="field">
              <label htmlFor="lab-topic">나의 궁금한 주제</label>
              <input
                id="lab-topic"
                maxLength={100}
                value={lab.topic}
                onChange={(e) =>
                  update((p) =>
                    p.resume
                      ? {
                          ...p,
                          resume: { ...p.resume, lab: { ...p.resume.lab, topic: e.target.value } },
                        }
                      : p,
                  )
                }
                placeholder="예: 그림자, 저울, 옛날 사람들의 집"
              />
              <small>그림자·저울은 모형으로, 다른 주제는 관찰 활동지로 준비해요.</small>
            </div>
          ) : (
            <div className="quote">
              <strong>{d.title}</strong>
              <br />
              {lab.mode === 'shadow'
                ? '바꾸는 것: 빛의 높이 / 살펴볼 것: 그림자의 길이'
                : '바꾸는 것: 왼쪽 추의 무게 / 살펴볼 것: 저울의 기울기'}
            </div>
          )}
          <ul className="checklist">
            <li>내가 바꿀 조건을 먼저 알아봐요.</li>
            <li>바꾸기 전에 내 예상을 적어요.</li>
            <li>두 조건을 관찰하고 차이를 찾아요.</li>
            <li>결과가 예상과 달라도 괜찮아요.</li>
          </ul>
          <Notice>
            {lab.mode === 'custom'
              ? '활동지는 사실을 만들어 주지 않아요. 확인하지 못한 출처와 사실은 빈칸으로 남겨요.'
              : '관찰 원리를 표현한 단순 모형이에요. 화면의 숫자는 실제 측정 결과가 아니에요.'}
          </Notice>
          <NextButton draft={d} flow={flow}>
            활동 준비하고 예상해 보기
          </NextButton>
          <Provenance />
        </section>
      </div>
    );
  if (d.step === 1)
    return (
      <div className="learning-grid">
        <section className="panel">
          <span className="tag teal">관찰하기 전의 생각</span>
          <h2 className="space-top">아직 움직이기 전에, 내 예상은?</h2>
          <p className="muted space-top">
            {lab.mode === 'custom'
              ? `“${lab.topic}”에 대해 무엇을 알아보고 싶나요? 어떤 결과를 예상하나요?`
              : lab.mode === 'shadow'
                ? '빛이 낮을 때와 높을 때, 그림자의 길이는 어떻게 달라질까요?'
                : '왼쪽 추를 가볍게, 무겁게 바꾸면 저울은 어떻게 될까요?'}
          </p>
          <div className="simulation">
            <div className="sim-art">
              {lab.mode === 'custom' ? <Icon name="flask" /> : <Simulation lab={lab} />}
            </div>
          </div>
          <Notice>
            예상은 맞히는 문제가 아니에요. 나중에 관찰한 결과와 비교하기 위한 첫 문장이에요.
          </Notice>
        </section>
        <WritingPanel
          draft={d}
          flow={flow}
          question="어떻게 될 것 같나요? 그 이유도 적어 보세요."
        />
      </div>
    );
  if (d.step === 2)
    return (
      <div className="learning-grid">
        <section className="panel">
          <span className="tag teal">내가 먼저 남긴 예상</span>
          <div className="quote">{lab.prediction}</div>
          <h3>이제 직접 확인해 볼까요?</h3>
          <p className="muted space-top">
            {lab.mode === 'custom'
              ? '주변 사물이나 보호자와 함께 찾은 자료를 살펴보고 서로 다른 두 가지 관찰을 적어요.'
              : '슬라이더를 30 이하와 70 이상으로 움직여 두 조건의 차이를 살펴봐요.'}
          </p>
          <Notice>
            직접 본 것과 아직 추측인 것을 나누어 생각해요. 안전한 모형이나 보호자와 함께 고른 자료로
            관찰해 주세요.
          </Notice>
        </section>
        <section className="coach">
          <h2>바꾸고, 살펴보고, 비교해요.</h2>
          {lab.mode === 'custom' ? (
            <>
              {(['a', 'b', 'source'] as const).map((field, i) => (
                <div className="field" key={field}>
                  <label htmlFor={`observation-${field}`}>
                    {['첫 번째 관찰', '두 번째 관찰', '확인한 자료 / 출처 (선택)'][i]}
                  </label>
                  <input
                    id={`observation-${field}`}
                    value={lab[field]}
                    maxLength={400}
                    placeholder={
                      field === 'source'
                        ? '확인하지 못했다면 빈칸으로 두어요.'
                        : '직접 확인한 것을 적어 보세요.'
                    }
                    onChange={(e) => send({ type: 'observation', field, value: e.target.value })}
                  />
                </div>
              ))}
              <Notice>
                이 화면은 주제에 관한 사실을 생성하지 않아요. 출처 입력은 자료의 정확성 검증을
                뜻하지 않아요.
              </Notice>
            </>
          ) : (
            <div className="simulation">
              <div className="sim-art">
                <Simulation lab={lab} />
              </div>
              <label htmlFor="lab-range">
                {lab.mode === 'shadow' ? '빛의 높이' : '왼쪽 추의 무게'}{' '}
                <strong>
                  {lab.value}
                  {lab.mode === 'balance' ? 'g' : ''}
                </strong>
              </label>
              <input
                id="lab-range"
                type="range"
                min={10}
                max={90}
                value={lab.value}
                onChange={(e) => send({ type: 'lab-value', value: Number(e.target.value) })}
              />
              <div className="row between muted">
                <small>낮은 값 · 10</small>
                <small>높은 값 · 90</small>
              </div>
              <div className="observe-tags" aria-live="polite">
                <span className={lab.low ? 'done' : ''}>{lab.low ? '✓' : '○'} 낮은 값 관찰</span>
                <span className={lab.high ? 'done' : ''}>{lab.high ? '✓' : '○'} 높은 값 관찰</span>
              </div>
              <small className="muted">
                {lab.mode === 'balance'
                  ? '오른쪽 추는 50g으로 고정한 모형이에요.'
                  : '막대기의 높이는 고정한 단순 모형이에요.'}
              </small>
            </div>
          )}
          <NextButton draft={d} flow={flow}>
            {hasObservations(d)
              ? '두 조건을 관찰했어요, 발견 설명하기'
              : '두 조건 관찰하고 다음 단계'}
          </NextButton>
          <Provenance />
        </section>
      </div>
    );
  return (
    <div className="learning-grid">
      <section className="panel">
        <span className="tag teal">
          {d.step === 3 ? '처음 예상과 관찰의 만남' : '내 생각을 한 번 더 펼쳐요'}
        </span>
        <h2 className="space-top">
          {d.step === 3 ? '예상과 같은 점, 다른 점은?' : '다른 조건에서도 같을까요?'}
        </h2>
        <div className="quote">{d.step === 3 ? lab.prediction : d.answers[1]?.text}</div>
        {lab.mode === 'custom' ? (
          <>
            <p>
              <strong>첫 관찰</strong> · {lab.a}
            </p>
            <p>
              <strong>두 번째 관찰</strong> · {lab.b}
            </p>
            <p className="muted">자료 / 출처 · {lab.source || '—'}</p>
          </>
        ) : (
          <div className="simulation">
            <div className="sim-art">
              <Simulation lab={lab} />
            </div>
            <small className="muted">마지막으로 관찰한 모형 · {lab.value}</small>
          </div>
        )}
        <p className="muted">
          결과가 달라도 괜찮아요. 무엇을 바꾸었고 무엇을 확인했는지가 중요해요.
        </p>
      </section>
      <WritingPanel
        draft={d}
        flow={flow}
        question={
          d.step === 3
            ? '바꾸기 전과 후, 무엇이 달라졌나요? 왜 그랬을까요?'
            : '더 확인하고 싶은 것을 내 문장으로 적어 보세요.'
        }
        followup={d.step === 4}
      />
    </div>
  );
}
function TheaterFlow({ draft: d, flow }: { draft: Draft; flow: ActivityFlow }) {
  const { data, update } = useVillage();
  const send = flow.send;
  const advance = flow.advance;
  const [playing, setPlaying] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [previewRead, setPreviewRead] = useState(false);
  const t = d.theater;
  useEffect(() => {
    if (!playing || d.step !== 2 || (t.scene === 1 && t.choice === null) || t.scene === 3) return;
    const timer = window.setTimeout(() => {
      send({ type: 'scene', direction: 1 });
    }, 6500);
    return () => clearTimeout(timer);
  }, [playing, d.step, t.scene, t.choice, send]);
  useEffect(() => {
    if (!preparing) return;
    const timer = window.setTimeout(() => {
      advance();
      setPreparing(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [preparing, advance]);
  useEffect(() => {
    const stop = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', stop);
    return () => {
      document.removeEventListener('visibilitychange', stop);
      window.speechSynthesis?.cancel();
    };
  }, []);
  if (d.step === 4) return <Review draft={d} flow={flow} />;
  if (d.step === 0)
    return (
      <div className="learning-grid">
        <div className="story-card">
          <div className="stage">
            <StageArt scene={0} activityId={d.activityId} />
          </div>
          <div className="story-body">
            <span className="tag coral">보호자와 함께 준비해요</span>
            <h2 className="space-top">오늘은 어떤 마음을 나눌까요?</h2>
            <p>키워드를 이야기 틀에 적용하고, 아이와 함께 볼 대본을 먼저 확인해요.</p>
          </div>
        </div>
        <section className="coach">
          <div className="coach-head">
            <Icon name="shield" />
            보호자 이야기 설정
          </div>
          <div className="field">
            <label htmlFor="story-keyword">이야기 키워드</label>
            <input
              id="story-keyword"
              maxLength={100}
              value={t.keyword}
              disabled={preparing}
              placeholder="예: 배려, 용기, 친구, 기다림"
              onChange={(e) =>
                update((p) =>
                  p.resume
                    ? {
                        ...p,
                        resume: {
                          ...p.resume,
                          theater: { ...p.resume.theater, keyword: e.target.value },
                        },
                      }
                    : p,
                )
              }
            />
          </div>
          <div className="filters">
            {[...(CATALOG.find((a) => a.id === d.activityId)?.tags ?? []), '서로의 마음'].map(
              (k) => (
                <button
                  key={k}
                  className="chip"
                  disabled={preparing}
                  onClick={() =>
                    update((p) =>
                      p.resume
                        ? {
                            ...p,
                            resume: { ...p.resume, theater: { ...p.resume.theater, keyword: k } },
                          }
                        : p,
                    )
                  }
                >
                  {k}
                </button>
              ),
            )}
          </div>
          <Notice>
            준비된 이야기 틀에 키워드를 적용하는 규칙 기반 체험이에요. 실제 AI로 대본이나 영상을
            생성하지 않아요.
          </Notice>
          <Button disabled={Boolean(guard(d)) || preparing} onClick={() => setPreparing(true)}>
            {preparing ? '이야기 준비 중…' : '대본 준비하고 미리보기'}
            <Icon name="arrow" />
          </Button>
          <Provenance />
        </section>
      </div>
    );
  if (d.step === 1 && t.story)
    return (
      <div className="center panel">
        <span className="tag coral">보호자 대본 미리보기</span>
        <h2 className="space-top">{t.story.title}</h2>
        <p className="muted">장면과 선택에 따라 달라지는 모든 대사를 확인해 주세요.</p>
        <details open={data.settings.parentPreview || undefined}>
          <summary>전체 대본과 두 가지 분기 살펴보기</summary>
          {t.story.scenes.map((scene, i) => (
            <div className="quote" key={i}>
              <strong>장면 {i + 1}</strong>
              <br />
              {scene}
              {i === 2 && (
                <div className="branch-preview">
                  {t.story!.branches.map((branch, j) => (
                    <p key={branch}>
                      <strong>선택 {j + 1}</strong> · {branch}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </details>
        <label className="check">
          <input
            type="checkbox"
            checked={previewRead}
            onChange={(e) => setPreviewRead(e.target.checked)}
          />
          <span>보호자가 전체 장면과 두 가지 선택을 확인했어요.</span>
        </label>
        <Notice>
          다음 화면부터는 아이가 이야기 속 행동을 선택해요. 보호자 설정 화면은 다시 잠가요.
        </Notice>
        <Button
          disabled={!previewRead}
          onClick={() => {
            if (send({ type: 'approve' })) advance();
          }}
        >
          확인했어요, 아이와 보기
          <Icon name="play" />
        </Button>
        <Provenance />
      </div>
    );
  if (!t.story)
    return (
      <EmptyState
        title="대본을 다시 준비해 주세요."
        description="진행 정보가 올바르지 않아요. 홈에서 작성 중인 모험을 정리하고 다시 시작할 수 있어요."
        to="/"
        action="홈으로 돌아가기"
      />
    );
  if (d.step === 3)
    return (
      <div className="learning-grid">
        <div className="story-card">
          <div className="stage">
            <StageArt scene={3} activityId={d.activityId} />
          </div>
          <div className="story-body">
            <span className="tag coral">내가 선택한 행동</span>
            <h2 className="space-top">
              {t.choice === 0 ? '친구의 말을 먼저 들을래요.' : '내 생각을 먼저 설명할래요.'}
            </h2>
            <p>{t.story.scenes[3]}</p>
          </div>
        </div>
        <section className="coach">
          <h2>내 마음은 어땠나요?</h2>
          <p>느낀 마음을 고르고, 친구에게 건넬 말을 적어 주세요.</p>
          <div className="filters" role="group" aria-label="이야기를 보고 느낀 마음">
            {EMOTIONS.map((emotion) => (
              <button
                className={`chip ${t.emotion === emotion ? 'active' : ''}`}
                key={emotion}
                aria-pressed={t.emotion === emotion}
                onClick={() => send({ type: 'emotion', emotion })}
              >
                {emotion}
              </button>
            ))}
          </div>
          <WritingGate
            value={d.text}
            min={d.min}
            onChange={(text) => send({ type: 'text', text })}
            placeholder="친구에게 어떤 말을 하고 싶은지, 그 이유도 적어 보세요."
          />
          <NextButton draft={d} flow={flow}>
            내 마음 모아 보기
          </NextButton>
          <Provenance />
        </section>
      </div>
    );
  const waiting = t.scene === 1 && t.choice === null;
  return (
    <div className="learning-grid">
      <div className="story-card">
        <div className={`stage ${playing && !waiting && t.scene < 3 ? 'playing' : ''}`}>
          <span className="scene-label">장면 {t.scene + 1} / 4 · 창작 이야기</span>
          <StageArt scene={t.scene} activityId={d.activityId} />
        </div>
        <div className="scene-caption" aria-live="polite">
          {t.story.scenes[t.scene]}
        </div>
        <div className="stage-controls">
          <div className="row between wrap">
            <div className="scene-dots" aria-label={`${t.scene + 1}번째 장면`}>
              {t.story.scenes.map((_, i) => (
                <span key={i} className={i === t.scene ? 'active' : ''} />
              ))}
            </div>
            <div className="row">
              <Button
                className="small light"
                disabled={waiting || t.scene === 3}
                onClick={() => setPlaying(!playing)}
              >
                <Icon name={playing ? 'pause' : 'play'} />
                {playing ? '자동 재생 멈추기' : '자동 재생'}
              </Button>
              <ReadAloud text={t.story.scenes[t.scene] ?? ''} />
            </div>
          </div>
          <div className="actions split">
            <Button
              className="ghost"
              disabled={t.scene === 0}
              onClick={() => {
                setPlaying(false);
                send({ type: 'scene', direction: -1 });
              }}
            >
              이전 장면
            </Button>
            <Button
              className="ghost"
              disabled={waiting || t.scene === 3}
              onClick={() => {
                setPlaying(false);
                send({ type: 'scene', direction: 1 });
              }}
            >
              다음 장면
              <Icon name="arrow" />
            </Button>
          </div>
        </div>
      </div>
      <section className="coach">
        <div className="coach-head">
          <span className="avatar">
            <Icon name="chat" />
          </span>
          마음 길잡이
        </div>
        <h2>
          {waiting
            ? '나라면 어떻게 할까요?'
            : t.scene === 3
              ? '이야기를 내 마음과 연결해요.'
              : '친구의 마음을 살펴봐요.'}
        </h2>
        {t.scene === 1 ? (
          <>
            <p>어느 쪽이든 괜찮아요. 선택한 이유가 더 궁금해요.</p>
            <div className="options">
              {['친구의 말을 먼저 들을래요.', '내 생각을 먼저 설명할래요.'].map((label, choice) => (
                <button
                  key={label}
                  className="option"
                  onClick={() => {
                    setPlaying(false);
                    send({ type: 'choice', choice });
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p>
              {t.scene === 3
                ? '친구에게 해 주고 싶은 말이 떠올랐나요? 다음 단계에서 내가 느낀 마음과 문장을 남겨요.'
                : '인물의 표정과 말을 살펴보세요. 같은 일을 겪어도 서로 다른 마음이 들 수 있어요.'}
            </p>
            <div className="quote">서로 다른 생각에도 귀를 기울여 봐요.</div>
            {t.scene === 3 && (
              <NextButton draft={d} flow={flow}>
                내 마음 표현하러 가기
              </NextButton>
            )}
          </>
        )}
        <Provenance />
      </section>
    </div>
  );
}
