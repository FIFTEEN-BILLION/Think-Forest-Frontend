import { useState, type PropsWithChildren } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { Model } from '../api/schema';
import { consentSetupState, deferGuest, guestDeferred, setupReturnTo } from '../api/consentSetup';
import { json } from '../api/requestOptions';
import { useAction, useServerQuery } from '../hooks/useServerApi';
import { useBackend } from '../providers/BackendProvider';
import { Icon } from '../components/Icon';
import { Message, Wait } from '../components/QueryFeedback';

function useSetup() {
  const backend = useBackend();
  const documents = useServerQuery<Model<'LegalDocumentListResponse'>>('legal-documents');
  const consents = useServerQuery<Model<'ConsentListResponse'>>(
    backend.profileId
      ? `consents?profileId=${encodeURIComponent(backend.profileId)}&currentOnly=true`
      : null,
  );
  const state = consentSetupState(documents.data?.items ?? [], consents.data?.items ?? []);
  return {
    ...state,
    documents,
    consents,
    loading: !documents.data || !consents.data,
    error: documents.error ?? consents.error,
    deferKey: `jjcp-consent-later:${backend.scopeId}:${state.items.map((doc) => `${doc.id}:${doc.version}`).join(',')}`,
    reload: async () => {
      await Promise.all([documents.refetch(), consents.refetch()]);
    },
  };
}

/** 동의를 확인하기 전에는 자식 화면과 그 API 호출을 실행하지 않는다. */
export function OnboardingGate({ children }: PropsWithChildren) {
  const backend = useBackend();
  const location = useLocation();
  const setup = useSetup();
  if (setup.error || setup.loading) return <Wait error={setup.error} retry={setup.reload} />;
  // 첫인사를 마친 일반 계정은 AI 동의를 철회해도 기존 기본 기능을 계속 쓴다.
  const privacy = setup.items.find((doc) => doc.id === 'privacy_child');
  const completedWithPrivacy =
    backend.me?.user.role !== 'GUEST' &&
    !backend.me?.user.needsFirstGreeting &&
    privacy &&
    setup.consents.data?.items.some(
      (consent) =>
        consent.documentId === privacy.id &&
        consent.documentVersion === privacy.version &&
        consent.current &&
        consent.status === 'GRANTED',
    );
  if (
    setup.granted ||
    completedWithPrivacy ||
    (backend.me?.user.role === 'GUEST' && guestDeferred(setup.deferKey))
  )
    return <>{children}</>;
  return (
    <Navigate
      replace
      to={`/welcome?next=${encodeURIComponent(setupReturnTo(location.pathname + location.search))}`}
    />
  );
}

export function OnboardingScreen() {
  const { scopeId } = useBackend();
  return <ConsentSetup key={scopeId} />;
}

export function ConsentSetup({ manage = false }: { manage?: boolean }) {
  const backend = useBackend();
  const guest = backend.me?.user.role === 'GUEST';
  const setup = useSetup();
  const action = useAction();
  const navigate = useNavigate();
  const location = useLocation();
  const [guardian, setGuardian] = useState(false);
  const [checked, setChecked] = useState<Record<string, string>>({});
  const target = setupReturnTo(new URLSearchParams(location.search).get('next'));
  const destination = target.startsWith('/first-talk')
    ? target
    : guest || backend.me?.user.needsFirstGreeting
      ? `/first-talk?next=${encodeURIComponent(target)}`
      : target;
  if (setup.error || setup.loading) return <Wait error={setup.error} retry={setup.reload} />;
  if (setup.granted && !manage) return <Navigate replace to={destination} />;
  const canAgree =
    setup.available && guardian && setup.items.every((doc) => checked[doc.id] === doc.version);
  const record = (agreed: boolean) =>
    action.run(async () => {
      try {
        await backend.request(
          'consents',
          json({
            profileId: backend.profileId,
            guardianConfirmed: agreed && guardian,
            items: setup.items.map((doc) => ({ documentId: doc.id, version: doc.version, agreed })),
          }),
        );
      } catch (error) {
        await setup.reload();
        throw error;
      }
      await setup.reload();
      setGuardian(false);
      setChecked({});
      if (agreed) navigate(destination, { replace: true });
    });
  return (
    <section className="consent-setup" aria-labelledby="consent-title">
      <header className="consent-heading">
        <span className="consent-eyebrow">
          <Icon name="sprout" /> 우리 아이 생각친구, 티키
        </span>
        <ol className="consent-steps" aria-label="시작 순서">
          <li aria-current="step">
            <span>1</span> 이용 안내와 동의
          </li>
          <li>
            <span>2</span> 티키와 첫인사
          </li>
          <li>
            <span>3</span> 생각 이야기
          </li>
        </ol>
        <h1 id="consent-title">
          {setup.granted ? '우리 아이의 동의를 관리해요' : '반가워요. 시작 전에 함께 확인해요.'}
        </h1>
        <p>보호자가 먼저 읽고 동의해 주세요. 그다음, 아이가 티키와 첫인사를 나눌 수 있어요.</p>
      </header>
      <div className="consent-columns">
        <aside className="consent-intro">
          <span className="consent-intro-icon">
            <Icon name="shield" />
          </span>
          <h2>
            작은 생각을 나누기 전,
            <br />
            보호자와 하는 약속
          </h2>
          <p>어떤 정보를 쓰고, AI와 어떻게 이야기하는지 알기 쉽게 안내할게요.</p>
          <ul>
            <li>
              <Icon name="user" />
              <div>
                <strong>아이를 알아가는 정보</strong>
                <p>
                  별명·학년대·관심사와 대화 기록을 사용해요. 이름·연락처·주소는 입력하지 마세요.
                </p>
              </div>
            </li>
            <li>
              <Icon name="chat" />
              <div>
                <strong>AI가 만드는 질문과 답</strong>
                <p>
                  입력한 문장을 AI 처리 사업자에게 보내 답을 만들어요. AI의 답은 틀릴 수도 있어요.
                </p>
              </div>
            </li>
            <li>
              <Icon name="shield" />
              <div>
                <strong>동의는 언제든 다시 확인</strong>
                <p>
                  {guest ? '상단 ‘보호자 동의’' : '보호자 공간의 ‘동의와 약관’'}에서 AI 처리 동의를
                  철회할 수 있어요.
                </p>
              </div>
            </li>
          </ul>
          {guest && (
            <p className="consent-guest-note">
              게스트 체험은 최대 24시간이에요. 만료된 기록은 순차 정리되며 카카오 계정으로 옮겨지지
              않아요.
            </p>
          )}
        </aside>
        <div className="consent-form">
          <div className="consent-form-heading">
            <h2>이용 안내와 동의</h2>
            <span>보호자 확인</span>
          </div>
          <p className="consent-caption">
            항목별 내용을 읽고 직접 선택해 주세요. 음성·공유 기능의 동의는 여기서 받지 않아요.
          </p>
          <Message text={action.message} />
          {!setup.available && (
            <p role="alert">
              필요한 동의서를 불러오지 못했어요.{' '}
              <button className="btn light small" onClick={() => void setup.reload()}>
                다시 불러오기
              </button>
            </p>
          )}
          {setup.items.map((doc) => (
            <section className="consent-document" key={doc.id}>
              <span className="consent-purpose">
                {doc.id === 'ai_conversation'
                  ? '선택 · AI 첫인사 이용 시 필요'
                  : '개인정보 수집·이용'}
              </span>
              <h3>{doc.title}</h3>
              <p>{doc.summary}</p>
              <details>
                <summary>
                  내용 자세히 보기 <span>{doc.version}</span>
                </summary>
                <div className="consent-document-body">{doc.body}</div>
              </details>
              {doc.draft && <p className="consent-draft">{doc.draftNotice}</p>}
              {setup.granted ? (
                <span className="consent-granted">
                  <Icon name="check" /> 동의 완료
                </span>
              ) : (
                <label className="consent-check">
                  <input
                    type="checkbox"
                    checked={checked[doc.id] === doc.version}
                    disabled={action.busy}
                    onChange={(event) =>
                      setChecked({ ...checked, [doc.id]: event.target.checked ? doc.version : '' })
                    }
                  />
                  <span>
                    {doc.id === 'ai_conversation'
                      ? 'AI 대화 처리에 동의합니다.'
                      : '아이 개인정보 수집·이용에 동의합니다.'}
                  </span>
                </label>
              )}
            </section>
          ))}
          {!setup.granted && (
            <label className="consent-check consent-guardian">
              <input
                type="checkbox"
                checked={guardian}
                disabled={action.busy}
                onChange={(event) => setGuardian(event.target.checked)}
              />
              <span>
                저는 이 아이의 보호자이며,
                <br />
                내용을 확인하고 직접 동의합니다.
              </span>
            </label>
          )}
          <div className="consent-actions">
            {setup.granted ? (
              <>
                <Link className="btn" to="/first-talk">
                  티키와 만나기 <Icon name="arrow" />
                </Link>
                <button
                  className="btn light"
                  disabled={action.busy}
                  onClick={() => void record(false)}
                >
                  동의 철회하기
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn"
                  disabled={!canAgree || action.busy}
                  onClick={() => void record(true)}
                >
                  {action.busy ? '동의를 저장하고 있어요…' : '동의하고 티키와 만나기'}
                  <Icon name="arrow" />
                </button>
                <p className="consent-caption">두 동의와 보호자 확인을 마치면 시작할 수 있어요.</p>
              </>
            )}
            {guest ? (
              <button
                className="consent-later"
                disabled={action.busy}
                onClick={() => {
                  deferGuest(setup.deferKey);
                  navigate('/', { replace: true });
                }}
              >
                {setup.granted ? '홈으로' : '동의하지 않고 기본 체험하기'}
              </button>
            ) : (
              <button
                className="consent-later"
                disabled={action.busy || backend.loading}
                onClick={() => void backend.logout()}
              >
                나중에 할게요 · 로그아웃
              </button>
            )}
          </div>
          <p className="consent-caption">
            동의하지 않으면 AI 첫인사가 시작되지 않아요.
            {!guest && ' 로그인 화면에서 기본 게스트 체험을 선택할 수 있어요.'}
          </p>
        </div>
      </div>
    </section>
  );
}

/** 기본 체험을 건너뛰었어도 첫인사에는 항상 현재 동의가 필요하다. */
export function FirstGreetingGate({ children }: PropsWithChildren) {
  const backend = useBackend();
  const setup = useSetup();
  const location = useLocation();
  if (!backend.useApi) return <>{children}</>;
  if (setup.error || setup.loading) return <Wait error={setup.error} retry={setup.reload} />;
  if (!setup.granted)
    return (
      <Navigate
        replace
        to={`/welcome?next=${encodeURIComponent(location.pathname + location.search)}`}
      />
    );
  return <GreetingReadiness>{children}</GreetingReadiness>;
}

function GreetingReadiness({ children }: PropsWithChildren) {
  const readiness = useServerQuery<{ available: boolean; message: string | null }>(
    'first-greeting/readiness',
  );
  if (readiness.error || !readiness.data)
    return <Wait error={readiness.error} retry={readiness.refetch} />;
  if (readiness.data.available) return <>{children}</>;
  return (
    <section className="consent-setup consent-unavailable">
      <span className="consent-intro-icon">
        <Icon name="chat" />
      </span>
      <h1>첫인사를 잠시 기다려 주세요</h1>
      <p>동의 확인은 마쳤어요. {readiness.data.message}</p>
      <div className="row wrap">
        <button
          className="btn"
          disabled={readiness.isFetching}
          onClick={() => void readiness.refetch()}
        >
          다시 확인하기
        </button>
        <Link className="btn light" to="/">
          홈으로
        </Link>
      </div>
    </section>
  );
}
