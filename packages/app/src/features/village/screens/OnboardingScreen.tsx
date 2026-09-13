import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DIAGNOSTIC, GRADES, INTERESTS } from '../data/catalog';
import { VillageArt } from '../components/Artwork';
import { Button, Notice, PageHeading, Provenance, Steps, WritingGate } from '../components/ui';
import { Icon } from '../components/Icon';
import { useVillage } from '../state/VillageProvider';
import { count } from '../lib/learning';
import { safeNext } from '../lib/navigation';
import type { Level } from '../types';
import { useStepFocus } from '../lib/useStepFocus';
export function WelcomeScreen() {
  return (
    <div className="welcome">
      <PageHeading
        eyebrow="WELCOME TO THINKING FOREST"
        title="생각이 자라는 작은 마을에 오신 걸 환영해요."
        description="읽고, 질문하고, 나만의 이유를 발견하는 시간."
      />
      <section className="hero">
        <div className="hero-copy">
          <span className="tag">
            <Icon name="sprout" />내 생각이 먼저인 배움
          </span>
          <h2>
            작은 질문 하나,
            <br />
            커다란 나의 발견.
          </h2>
          <p>
            정답을 서두르지 않아요.
            <br />
            아이의 첫 문장에서 새로운 모험이 시작돼요.
          </p>
          <Link className="btn" to="/onboarding">
            우리 아이와 시작하기 <Icon name="arrow" />
          </Link>
          <Link className="btn ghost" to="/">
            먼저 마을 둘러보기
          </Link>
        </div>
        <div className="hero-art">
          <VillageArt />
        </div>
      </section>
      <div className="cards">
        {[
          ['01', '먼저 생각해요', '내 문장을 쓰기 전에는 다음 질문이 열리지 않아요.'],
          ['02', '천천히 자라요', '정해진 글자 수 없이 자유롭게 말하고 써요.'],
          ['03', '정직하게 알려요', '목데이터, 직접 남긴 기록, AI 연결 상태를 구분해요.'],
        ].map(([n, title, text]) => (
          <section className="panel" key={n}>
            <div className="number">{n}</div>
            <h3 className="space-top">{title}</h3>
            <p className="muted">{text}</p>
          </section>
        ))}
      </div>
      <p className="intro-note">
        회원가입 없는 서비스 체험 · 아이의 문장을 외부 AI로 보내지 않아요.
      </p>
    </div>
  );
}
export function OnboardingScreen() {
  const { data, update, toast } = useVillage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const onb = data.onboarding;
  useStepFocus(onb.step);
  const patch = (change: Partial<typeof onb>) =>
    update((p) => ({ ...p, onboarding: { ...p.onboarding, ...change } }));
  const advance = () => {
    if (onb.step === 0 && (!data.profile.name.trim() || !onb.ageBand)) {
      toast('아이의 별명과 나이대를 알려 주세요.');
      return;
    }
    if (onb.step === 1 && (!onb.guardian || !data.profile.interests.length)) {
      toast('함께하는 방법과 관심사를 하나 이상 골라 주세요.');
      return;
    }
    if (onb.step === 2 && !onb.acknowledged) {
      toast('체험 안내를 확인해 주세요.');
      return;
    }
    if (onb.step === 3) {
      if (!onb.childPolicy) {
        toast('보호자와 함께 우리의 약속을 확인해 주세요.');
        return;
      }
      update((p) => ({
        ...p,
        consent: {
          done: true,
          ageBand: onb.ageBand,
          guardian: onb.guardian,
          noticeAt: new Date().toISOString(),
          thirdParty: false,
        },
        diagnosticDraft: { index: 0, answers: ['', '', ''] },
      }));
      navigate(`/diagnosis?next=${encodeURIComponent(next)}`);
      return;
    }
    patch({ step: onb.step + 1 });
  };
  return (
    <div className="center">
      <PageHeading
        eyebrow="A LITTLE START"
        title="우리 아이의 마을 준비하기"
        description="아이에게 맞는 속도를 찾기 위해 몇 가지를 함께 알려 주세요."
      />
      <Steps
        labels={['아이 소개', '관심사와 보호자', '이용 안내', '우리의 약속']}
        current={onb.step}
      />
      <section className="panel">
        {onb.step === 0 && (
          <>
            <span className="tag gold">01 · 아이 소개</span>
            <h2 className="space-top">어떤 이름으로 불러 줄까요?</h2>
            <p className="muted">실명 대신 별명을 사용해도 좋아요.</p>
            <div className="field">
              <label htmlFor="child-name">아이 별명</label>
              <input
                id="child-name"
                value={data.profile.name}
                maxLength={20}
                onChange={(e) =>
                  update((p) => ({ ...p, profile: { ...p.profile, name: e.target.value } }))
                }
                autoComplete="off"
              />
            </div>
            <div className="form-two">
              <div className="field">
                <label htmlFor="child-age">나이대</label>
                <select
                  id="child-age"
                  value={onb.ageBand}
                  onChange={(e) => patch({ ageBand: e.target.value })}
                >
                  <option value="">선택해 주세요</option>
                  <option>6–7세</option>
                  <option>8–9세</option>
                  <option>10–12세</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="child-grade">학년</label>
                <select
                  id="child-grade"
                  value={data.profile.grade}
                  onChange={(e) =>
                    update((p) => ({ ...p, profile: { ...p.profile, grade: e.target.value } }))
                  }
                >
                  {GRADES.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}
        {onb.step === 1 && (
          <>
            <span className="tag gold">02 · 관심사와 보호자</span>
            <h2 className="space-top">무엇을 좋아하고, 누구와 함께하나요?</h2>
            <p className="muted">관심사는 프로필에 저장해요. 한 가지 이상 골라 주세요.</p>
            <div className="filters">
              {INTERESTS.map((i) => (
                <button
                  className={`chip ${data.profile.interests.includes(i) ? 'active' : ''}`}
                  key={i}
                  aria-pressed={data.profile.interests.includes(i)}
                  onClick={() =>
                    update((p) => ({
                      ...p,
                      profile: {
                        ...p.profile,
                        interests: p.profile.interests.includes(i)
                          ? p.profile.interests.filter((x) => x !== i)
                          : [...p.profile.interests, i],
                      },
                    }))
                  }
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="options" role="group" aria-label="함께하는 방법">
              {['보호자와 함께', '보호자가 살펴보고 아이 혼자'].map((x) => (
                <button
                  key={x}
                  className={`option ${onb.guardian === x ? 'selected' : ''}`}
                  aria-pressed={onb.guardian === x}
                  onClick={() => patch({ guardian: x })}
                >
                  <Icon name="user" /> {x}
                </button>
              ))}
            </div>
            <Notice>
              실제 보호자 인증은 연결되지 않았어요. 지금은 서비스 이용 흐름을 살펴보는 체험이에요.
            </Notice>
          </>
        )}
        {onb.step === 2 && (
          <>
            <span className="tag gold">03 · 이용 안내</span>
            <h2 className="space-top">배움과 기록에 대해 알려 드려요.</h2>
            <div className="journey-list">
              <div>
                <strong>① 아이의 문장이 먼저예요.</strong>
                <p>모든 글쓰기 단계에서 최소 글자 수를 확인한 후에 다음 질문으로 넘어가요.</p>
              </div>
              <div>
                <strong>② 실제 AI는 연결되어 있지 않아요.</strong>
                <p>
                  준비된 규칙과 목데이터로 구성한 체험이며 콘텐츠의 사람 검수는 완료되지 않았어요.
                </p>
              </div>
              <div>
                <strong>③ 기록은 이 브라우저에 남아요.</strong>
                <p>
                  기본 {data.settings.retention}일 동안 보관하고 다음 접속 때 지난 기록을 정리해요.
                  보호자 화면에서 열람·다운로드·삭제할 수 있어요.
                </p>
              </div>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={onb.acknowledged}
                onChange={(e) => patch({ acknowledged: e.target.checked })}
              />
              <span>
                체험 방식과 기록 보관 안내를 읽었어요.
                <small>실제 이용약관 체결이나 외부 AI 이용 동의가 아니에요.</small>
              </span>
            </label>
            <Notice>외부 AI 전송은 사용하지 않으며 외부 서비스 동의를 받지 않아요.</Notice>
          </>
        )}
        {onb.step === 3 && (
          <>
            <span className="tag gold">04 · 우리의 약속</span>
            <h2 className="space-top">아이와 함께 읽어 주세요.</h2>
            <div className="quote">
              모르는 건 모른다고 말해도 괜찮아.
              <br />
              다른 생각에도 귀를 기울여 보자.
              <br />
              이름, 전화번호, 주소 같은 개인정보는 쓰지 말자.
              <br />
              불편한 이야기를 만나면 믿을 수 있는 어른에게 알려 줘.
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={onb.childPolicy}
                onChange={(e) => patch({ childPolicy: e.target.checked })}
              />
              <span>보호자와 아이가 함께 우리의 약속을 읽었어요.</span>
            </label>
            <Notice>
              다음에는 짧은 질문 세 개로 첫 글쓰기 단계를 정해요. 정답을 맞히는 시험은 아니에요.
            </Notice>
          </>
        )}
        <div className="actions split">
          {onb.step ? (
            <Button className="light" onClick={() => patch({ step: onb.step - 1 })}>
              이전 단계
            </Button>
          ) : (
            <Link to="/" className="btn light">
              마을 둘러보기
            </Link>
          )}
          <Button onClick={advance}>
            {onb.step === 3 ? '첫 질문 만나기' : '다음 단계'}
            <Icon name="arrow" />
          </Button>
        </div>
        <p className="autosave">입력한 준비 내용은 이 기기에 자동으로 저장돼요.</p>
      </section>
    </div>
  );
}
export function DiagnosisScreen() {
  const { data, update, toast } = useVillage();
  const navigate = useNavigate();
  const { mode } = useParams();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const draft = data.diagnosticDraft;
  useStepFocus(draft.index);
  if (!data.consent.done)
    return <Navigate to={`/onboarding?next=${encodeURIComponent(next)}`} replace />;
  if (mode === 'result' && data.diagnosis)
    return (
      <div className="center">
        <PageHeading
          eyebrow="MY STARTING PACE"
          title="나에게 맞는 첫걸음을 찾았어요."
          description="내 생각을 꺼낼 수 있는 편안한 분량부터 시작해요."
        />
        <section className="panel">
          <span className="tag teal">시작 단계 · {data.diagnosis.level}</span>
          <h2 className="space-top">조금씩, 내 생각을 길게 펼쳐 봐요.</h2>
          <p className="muted space-top">{data.diagnosis.why}</p>
          <details>
            <summary>내가 남긴 세 문장 보기</summary>
            {data.diagnosis.answers.map((answer, i) => (
              <div className="quote" key={i}>
                <small>{DIAGNOSTIC[i]?.title}</small>
                <br />
                {answer}
              </div>
            ))}
          </details>
          <Notice>
            문장 길이로 정한 체험용 시작점이에요. 언어 능력·발달 수준에 대한 진단은 아니며 보호자가
            언제든 바꿀 수 있어요.
          </Notice>
          <Link to={next} className="btn">
            {next === '/' ? '마을로 들어가기' : '선택한 모험으로 돌아가기'}
            <Icon name="arrow" />
          </Link>
        </section>
      </div>
    );
  const question = DIAGNOSTIC[draft.index]!;
  const advance = () => {
    if (count(draft.answers[draft.index] ?? '') < 5) {
      toast('공백을 빼고 5자 이상, 내 생각을 적어 주세요.');
      return;
    }
    if (draft.index < 2) {
      update((p) => ({
        ...p,
        diagnosticDraft: { ...p.diagnosticDraft, index: p.diagnosticDraft.index + 1 },
      }));
      return;
    }
    const length = Math.round(draft.answers.reduce((sum, a) => sum + count(a), 0) / 3);
    const level: Level = length < 15 ? '쉬움' : length < 35 ? '보통' : '도전';
    update((p) => ({
      ...p,
      settings: { ...p.settings, gate: level },
      diagnosis: {
        level,
        why: `세 문장의 평균 길이는 공백 제외 ${length}자예요. 첫 모험은 ${level} 단계에서 시작해 볼게요.`,
        answers: draft.answers,
        at: new Date().toISOString(),
      },
    }));
    navigate(`/diagnosis/result?next=${encodeURIComponent(next)}`);
  };
  return (
    <div className="center">
      <PageHeading
        eyebrow="MY FIRST QUESTION"
        title={`${data.profile.name}의 생각처럼, 자유롭게.`}
        description="짧아도 괜찮아요. 지금 떠오르는 생각을 들려주세요."
      />
      <Steps labels={DIAGNOSTIC.map((q) => q.title)} current={draft.index} />
      <section className="coach">
        <span className="tag teal">첫 질문 {draft.index + 1} / 3</span>
        <h2>{question.question}</h2>
        <p>{question.hint}</p>
        <WritingGate
          value={draft.answers[draft.index] ?? ''}
          onChange={(text) =>
            update((p) => ({
              ...p,
              diagnosticDraft: {
                ...p.diagnosticDraft,
                answers: p.diagnosticDraft.answers.map((a, i) =>
                  i === p.diagnosticDraft.index ? text : a,
                ),
              },
            }))
          }
          min={5}
          label="지금 떠오르는 내 생각"
        />
        <div className="actions split">
          <Button
            className="light"
            disabled={draft.index === 0}
            onClick={() =>
              update((p) => ({
                ...p,
                diagnosticDraft: {
                  ...p.diagnosticDraft,
                  index: Math.max(0, p.diagnosticDraft.index - 1),
                },
              }))
            }
          >
            이전 질문
          </Button>
          <Button disabled={count(draft.answers[draft.index] ?? '') < 5} onClick={advance}>
            {draft.index === 2 ? '시작 단계 확인하기' : '다음 질문'}
            <Icon name="arrow" />
          </Button>
        </div>
        <Provenance />
      </section>
    </div>
  );
}
