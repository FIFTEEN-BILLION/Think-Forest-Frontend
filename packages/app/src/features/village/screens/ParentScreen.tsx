import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { INTERESTS, PLACES } from '../data/catalog';
import { useVillage } from '../state/VillageProvider';
import { Icon } from '../components/Icon';
import { Button, Notice, PageHeading, Provenance } from '../components/ui';
import { gateSize, localDate } from '../lib/learning';
import type { VillageData } from '../types';

export function ProtectedParentScreen() {
  return <Outlet />;
}
export function ProfileScreen() {
  const { data, update, toast } = useVillage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(data.profile);
  const save = () => {
    if (!profile.name.trim()) {
      toast('아이 별명을 적어 주세요.');
      return;
    }
    if (update((p) => ({ ...p, profile: { ...profile, name: profile.name.trim() } })))
      toast('아이 프로필을 저장했어요.');
  };
  const settings = (patch: Partial<VillageData['settings']>) => {
    if (update((p) => ({ ...p, settings: { ...p.settings, ...patch } })))
      toast('설정을 저장했어요. 진행 중인 모험의 문턱은 유지돼요.');
  };
  return (
    <>
      <PageHeading
        eyebrow="MY LITTLE GARDENER"
        title="아이의 속도로, 아이답게."
        description="아이의 관심사와 배움의 속도를 보호자와 함께 정해요."
      >
        <Button className="light small" onClick={() => navigate('/')}>
          <Icon name="back" />
          아이 화면으로 돌아가기
        </Button>
      </PageHeading>
      <div className="learning-grid">
        <section className="panel">
          <div className="profile-identity">
            <span className="avatar large">{profile.name.slice(0, 1) || '새싹'}</span>
            <div>
              <h2>{profile.name || '우리 아이'}의 작은 마을</h2>
              <p className="muted">
                직접 작성한 활동 {data.sessions.filter((s) => s.source === 'local').length}개 · 무료
                체험
              </p>
            </div>
          </div>
          <div className="field">
            <label htmlFor="profile-name">아이 별명</label>
            <input
              id="profile-name"
              value={profile.name}
              maxLength={20}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-grade">소속과 학년</label>
            <input
              id="profile-grade"
              value={profile.grade}
              placeholder="예: 새봄초등학교 2학년"
              onChange={(e) => setProfile((p) => ({ ...p, grade: e.target.value }))}
            />
            <small>티키와의 첫 대화에서 학교와 학년을 자연스럽게 물어보고 자동으로 채워요.</small>
          </div>
          <fieldset className="interest-fieldset">
            <legend>좋아하는 것</legend>
            <div className="filters">
              {INTERESTS.map((i) => (
                <button
                  className={`chip ${profile.interests.includes(i) ? 'active' : ''}`}
                  key={i}
                  aria-pressed={profile.interests.includes(i)}
                  onClick={() =>
                    setProfile((p) => ({
                      ...p,
                      interests: p.interests.includes(i)
                        ? p.interests.filter((x) => x !== i)
                        : [...p.interests, i],
                    }))
                  }
                >
                  {i}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="profile-goal">함께 키우고 싶은 힘</label>
            <select
              id="profile-goal"
              value={profile.goal}
              onChange={(e) => setProfile((p) => ({ ...p, goal: e.target.value }))}
            >
              {[
                '내 생각의 이유를 말하는 힘',
                '새로운 것을 관찰하는 힘',
                '친구의 마음을 이해하는 힘',
                '궁금한 것을 질문하는 힘',
              ].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
            <small>관심사와 목표는 프로필에 저장해요. 맞춤 추천은 아직 연결되지 않았어요.</small>
          </div>
          <Button onClick={save}>아이 프로필 저장</Button>
        </section>
        <section className="panel">
          <h3>나에게 맞는 학습 설정</h3>
          <label className="setting-row">
            <span>
              <strong>이야기 읽어 주기</strong>
              <p>기기에 설치된 한국어 음성을 사용해요.</p>
            </span>
            <input
              type="checkbox"
              checked={data.settings.tts}
              onChange={(e) => settings({ tts: e.target.checked })}
            />
          </label>
          <label className="setting-row">
            <span>
              <strong>보호자 대본 미리보기 펼치기</strong>
              <p>전체 대본을 펼쳐 보여 줘요. 확인 단계는 항상 유지돼요.</p>
            </span>
            <input
              type="checkbox"
              checked={data.settings.parentPreview}
              onChange={(e) => settings({ parentPreview: e.target.checked })}
            />
          </label>
          <div className="setting-row">
            <div>
              <strong>기록 보관기간</strong>
              <p>기간이 지난 기록은 다음 접속 때 정리해요.</p>
            </div>
            <select
              aria-label="기록 보관기간"
              value={data.settings.retention}
              onChange={(e) => settings({ retention: Number(e.target.value) as 30 | 90 | 180 })}
            >
              {[30, 90, 180].map((n) => (
                <option key={n} value={n}>
                  {n}일
                </option>
              ))}
            </select>
          </div>
          <Notice>
            정해진 난이도나 글자 수 제한 없이, 아이가 원하는 만큼 자유롭게 말하고 쓸 수 있어요.
          </Notice>
          <div className="actions split">
            <Link className="btn light" to="/first-talk">
              티키와 다시 인사하기
            </Link>
            <Link className="btn ghost" to="/data">
              기록 열람·삭제
              <Icon name="arrow" />
            </Link>
          </div>
        </section>
      </div>
      <section className="panel space-top">
        <h3>보호자와 체험 안내</h3>
        <dl className="definition">
          <dt>함께하는 방법</dt>
          <dd>{data.consent.guardian || '아직 시작 준비를 하지 않았어요.'}</dd>
          <dt>체험 안내 확인</dt>
          <dd>{data.consent.noticeAt?.slice(0, 10) ?? '—'}</dd>
          <dt>실제 계정 인증</dt>
          <dd>미연결</dd>
          <dt>외부 AI 전송</dt>
          <dd>사용하지 않음</dd>
        </dl>
        <Link className="btn light small" to="/first-talk">
          아이 프로필 다시 이야기하기
        </Link>
      </section>
    </>
  );
}
export function TechScreen() {
  const { data } = useVillage();
  return (
    <>
      <PageHeading
        eyebrow="TRUST, BY DESIGN"
        title="어떻게 작동하는지, 투명하게."
        description="연결된 기능과 체험용 목데이터의 범위를 구분해 알려 드려요."
      />
      <details className="panel inquiry-review-tools">
        <summary>첫 탐구 검토용 상태 보기</summary>
        <p>
          새 첫 탐구의 뜻 확인 질문에서 연결 오류를 한 번 재현해요. ‘다시 해 보기’를 누르면 준비된
          질문으로 이어져요. 실제 AI 요청은 없어요. 진행 중인 활동이 있다면 먼저 마치거나 정리해
          주세요.
        </p>
        <Link className="btn light" to="/adventures/lab/first-inquiry?preview=connection-error">
          연결 오류와 재시도 살펴보기
        </Link>
      </details>
      <div className="cards stats">
        {[
          ['AI 연결 상태', '미연결', '외부 AI 호출 0회'],
          ['콘텐츠 구성 방식', '규칙 기반', '프롬프트·모델 사용 없음'],
          ['사람 검수 상태', '미완료', '검수자 · 검수일: —'],
        ].map(([label, value, help]) => (
          <section className="panel" key={label}>
            <span className="stat-label">{label}</span>
            <div className="metric status-metric">{value}</div>
            <small className="muted">{help}</small>
          </section>
        ))}
      </div>
      <div className="bottom-grid">
        <section className="panel">
          <h3>아이의 생각이 먼저인 구조</h3>
          <ol className="journey-list">
            <li>
              <span>01</span>
              <div>
                <strong>내 문장 입력</strong>
                <small>공백을 뺀 글자 수로 문턱을 확인해요.</small>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>진행 조건 확인</strong>
                <small>실험 관찰과 이야기 선택도 함께 확인해요.</small>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>다음 질문 열기</strong>
                <small>아이의 앞 문장을 인용해 다시 물어요.</small>
              </div>
            </li>
          </ol>
          <dl className="definition">
            <dt>현재 문턱</dt>
            <dd>{gateSize(data)}자 · 공백 제외</dd>
            <dt>자동 조절</dt>
            <dd>
              직접 완료한 마지막 활동 평균
              <br />
              40점 미만 → 쉬움 8자
              <br />
              75점 이상 → 도전 25자
              <br />그 사이 → 보통 15자
            </dd>
            <dt>목데이터</dt>
            <dd>
              예시 기록 {data.sessions.filter((s) => s.source === 'mock').length}개 · 자동 조절 제외
            </dd>
            <dt>실제 AI 모델</dt>
            <dd>—</dd>
            <dt>안전성 검증</dt>
            <dd>— · 검증되지 않은 체험용 키워드 필터</dd>
          </dl>
          <Provenance />
        </section>
        <section className="panel">
          <h3>저장과 개인정보</h3>
          <dl className="definition">
            <dt>저장 위치</dt>
            <dd>현재 기기 · 현재 브라우저</dd>
            <dt>저장 항목</dt>
            <dd>프로필, 설정, 체험 안내 확인, 진단 문장, 학습 기록, 진행 중인 문장, 차단 로그</dd>
            <dt>보관기간</dt>
            <dd>{data.settings.retention}일 · 다음 접속 때 정리</dd>
            <dt>외부 전송</dt>
            <dd>외부 AI, 분석 도구, 원격 음성을 사용하지 않아요.</dd>
            <dt>읽어 주기</dt>
            <dd>설치된 로컬 한국어 음성이 있을 때 사용해요.</dd>
            <dt>보호자 확인</dt>
            <dd>잠금 없음 · 실제 서비스에서는 연결 계정 권한으로 분리 예정</dd>
            <dt>결제·계정</dt>
            <dd>미연결 · 무료 로컬 체험</dd>
          </dl>
          <Link className="btn light" to="/data">
            내 기록 열람·내려받기
            <Icon name="download" />
          </Link>
          <Notice>
            실제 서비스 제공을 위한 서버 인증, 동의 관리, AI 연결, 콘텐츠 검수와 안전성 검증은
            별도로 필요해요.
          </Notice>
        </section>
      </div>
      <section className="panel space-top">
        <div className="row between">
          <h3>키워드 차단 기록</h3>
          <small className="muted">실제 기록 {data.safety.length}건 · 최근 20건 보관</small>
        </div>
        {data.safety.length > 0 ? (
          <div className="table-wrap">
            <table>
              <caption>미리 정한 일부 단어와 일치한 기록</caption>
              <thead>
                <tr>
                  <th>일시 (기기 시간)</th>
                  <th>입력 키워드</th>
                  <th>판단 방식</th>
                  <th>이유</th>
                </tr>
              </thead>
              <tbody>
                {data.safety.map((s) => (
                  <tr key={s.id}>
                    <td>{new Date(s.at).toLocaleString('ko-KR')}</td>
                    <td>{s.keyword}</td>
                    <td>규칙 기반</td>
                    <td>{s.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted space-top">
            실제 차단 기록이 없어요. 차단 기록이 없다고 모든 내용의 안전이 보장되지는 않아요.
          </p>
        )}
        <details>
          <summary>차단 로그 화면 예시 보기 · 목데이터</summary>
          <div className="notice">
            <div>
              <span className="tag gold">예시</span>
              <p>
                입력: 미리 정의된 차단 키워드
                <br />
                판단: 규칙 기반 목록과 일치
                <br />
                결과: 활동 구성을 중단하고 다른 주제 선택 안내
              </p>
            </div>
          </div>
        </details>
      </section>
    </>
  );
}
export function DataScreen() {
  const { data, reset, restoreExamples, update, toast } = useVillage();
  const navigate = useNavigate();
  const [armed, setArmed] = useState(false);
  const [word, setWord] = useState('');
  const [exported, setExported] = useState(false);
  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `우리_아이_생각친구_티키_기록_${localDate()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExported(true);
  };
  return (
    <>
      <Link to="/profile" className="back">
        <Icon name="back" />
        아이 프로필과 설정
      </Link>
      <PageHeading
        eyebrow="YOUR DATA, YOUR CHOICE"
        title="우리 아이의 기록, 직접 관리해요."
        description="저장된 정보를 열람하고 내려받거나 삭제할 수 있어요."
      />
      <div className="learning-grid">
        <section className="panel">
          <h3>이 기기에 저장된 정보</h3>
          <dl className="definition">
            <dt>아이 별명</dt>
            <dd>{data.profile.name}</dd>
            <dt>직접 완료 기록</dt>
            <dd>{data.sessions.filter((s) => s.source === 'local').length}개</dd>
            <dt>예시 목데이터</dt>
            <dd>{data.sessions.filter((s) => s.source === 'mock').length}개</dd>
            <dt>진행 중 모험</dt>
            <dd>
              {data.resume ? `${PLACES[data.resume.track].name} · ${data.resume.title}` : '없음'}
            </dd>
            <dt>차단 기록</dt>
            <dd>{data.safety.length}건</dd>
            <dt>보관기간</dt>
            <dd>{data.settings.retention}일</dd>
          </dl>
          <Button onClick={download}>
            <Icon name="download" />
            전체 기록 내려받기
          </Button>
          {exported && (
            <p role="status" className="muted space-top">
              내려받기를 요청했어요. 브라우저의 다운로드 목록을 확인해 주세요.
            </p>
          )}
          <details>
            <summary>저장된 전체 정보 열람하기</summary>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </details>
        </section>
        <div className="stack">
          <section className="panel">
            <h3>서비스 체험용 예시 기록</h3>
            <p className="muted space-top">
              예시를 다시 채우거나 숨길 수 있어요. 직접 작성한 활동은 유지돼요.
            </p>
            <div className="actions split">
              <Button className="light small" onClick={restoreExamples}>
                예시 기록 다시 채우기
              </Button>
              <Button
                className="ghost small"
                disabled={!data.sessions.some((s) => s.source === 'mock')}
                onClick={() => {
                  update((p) => ({
                    ...p,
                    sessions: p.sessions.filter((s) => s.source === 'local'),
                    summary: null,
                  }));
                  toast('예시 기록을 숨겼어요. 다시 채울 수 있어요.');
                }}
              >
                예시 기록 숨기기
              </Button>
            </div>
          </section>
          <section className="panel">
            <h3>기기 기록 모두 삭제</h3>
            <p className="muted space-top">
              프로필, 설정, 모험 기록, 진행 중인 문장과 체험 안내 확인 정보를 모두 삭제해요. 삭제
              후에는 되돌릴 수 없어요.
            </p>
            <Notice>
              필요한 기록은 먼저 내려받아 주세요. 이전 HTML 프로토타입의 저장 데이터에는 영향을 주지
              않아요.
            </Notice>
            {armed ? (
              <>
                <div className="field">
                  <label htmlFor="delete-confirm">삭제하려면 “삭제”를 입력해 주세요.</label>
                  <input
                    id="delete-confirm"
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="actions split">
                  <Button
                    className="light"
                    onClick={() => {
                      setArmed(false);
                      setWord('');
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    className="danger"
                    disabled={word.trim() !== '삭제'}
                    onClick={() => {
                      if (word.trim() === '삭제' && reset())
                        navigate('/first-talk', { replace: true });
                    }}
                  >
                    전체 기록 영구 삭제
                  </Button>
                </div>
              </>
            ) : (
              <Button className="danger" onClick={() => setArmed(true)}>
                기기 기록 삭제하기
              </Button>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
