// 명세 26절. 보호자 동의 화면.
// `ai_conversation` 동의가 이 앱의 가장 큰 스위치다. 켜면 아이가 쓴 문장이 AI 사업자에게 가고,
// 끄면 준비된 대사로만 대화가 이어진다. 그 사실을 화면에 그대로 적는다.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AI_CONSENT_DOCUMENT_ID,
  aiModeLabel,
  currentConsents,
  recordConsents,
  revokeConsent,
  VOICE_CONSENT_DOCUMENT_ID,
  voiceModeLabel,
} from '../../api/v1/endpoints';
import type { Consent, LegalDocument } from '../../api/v1/types';
import { useAuth } from '../../providers/AuthProvider';
import { Icon } from '../../components/Icon';
import {
  ActionResult,
  GuardianGate,
  GuardianSection,
  useAction,
  useGuardian,
} from '../../components/GuardianParts';
import { Button, Notice } from '../../components/ui';

/** 문서마다 "이 동의가 실제로 허락하는 것"을 서버 본문과 별개로 한 줄 더 적는다. */
const WHAT_IT_ALLOWS: Record<string, string> = {
  privacy_child: '아이 별명·학년대·관심사와 티키와 나눈 대화를 서버에 저장해요.',
  ai_conversation:
    '아이가 쓴 문장을 AI 처리 사업자에게 보내 티키의 답과 다음 질문을 만들어요. 동의하지 않아도 대화는 준비된 대사로 이어져요.',
  voice_retention:
    '말로 답하기를 켜요. 아이가 말한 음성을 글로 바꿔 대화에 쓰고, 음성 원본은 저장하지 않아요. 동의가 없으면 글로만 답해요.',
  community_share: '보호자가 먼저 읽고 승인한 이야기만 다른 가족에게 보여요.',
};

function ConsentCard({
  document,
  consent,
  busy,
  onGrant,
  onRevoke,
}: {
  document: LegalDocument;
  consent: Consent | undefined;
  busy: boolean;
  onGrant: () => void;
  onRevoke: () => void;
}) {
  const granted = Boolean(consent);
  const isAi = document.id === AI_CONSENT_DOCUMENT_ID;
  const isVoice = document.id === VOICE_CONSENT_DOCUMENT_ID;
  return (
    <section className={`panel ${isAi || isVoice ? 'space-top' : ''}`}>
      <div className="row between wrap">
        <h3>{document.title}</h3>
        <span className={`tag ${granted ? 'teal' : 'gold'}`}>
          {granted ? '동의함' : document.required ? '필수 · 아직 동의 안 함' : '선택 · 안 함'}
        </span>
      </div>
      <p className="muted space-top">{document.summary}</p>
      {isAi && (
        <Notice>
          <strong>이 동의가 AI를 켜고 끕니다.</strong> 동의하면 아이가 쓴 문장이 AI 처리 사업자에게
          전송돼요(이름·학교 이름·주소·음성 원본은 보내지 않아요). 동의하지 않아도 티키는 준비된
          대사로 계속 이야기해요.
        </Notice>
      )}
      <dl className="definition">
        <dt>무엇을 허락하나요</dt>
        <dd>{WHAT_IT_ALLOWS[document.id] ?? document.summary}</dd>
        <dt>문서 버전</dt>
        <dd>
          {document.version} · {document.locale}
        </dd>
        <dt>지금 상태</dt>
        <dd>
          {consent
            ? `${consent.documentVersion} 판에 ${consent.grantedAt.slice(0, 10)} 동의 (${consent.actor.role})`
            : '동의 기록 없음'}
        </dd>
      </dl>
      <details>
        <summary>문서 전문 읽기</summary>
        <pre className="story-body">{document.body}</pre>
      </details>
      {document.draft !== false && (
        <p className="muted space-top">
          <Icon name="info" /> {document.draftNotice}
        </p>
      )}
      <div className="actions split">
        {granted ? (
          <Button className="ghost" disabled={busy || document.required} onClick={onRevoke}>
            동의 철회하기
          </Button>
        ) : (
          <Button disabled={busy} onClick={onGrant}>
            {document.version} 판에 동의하기
          </Button>
        )}
        {granted && document.required && (
          <small className="muted">
            필수 동의는 철회할 수 없어요. 기록 삭제는 기록 관리에서 해요.
          </small>
        )}
      </div>
    </section>
  );
}

function ConsentBody() {
  const { client } = useAuth();
  const { profileId, profile, consents, documents, mode, voice, reload } = useGuardian();
  const { busy, message, failed, runQuiet } = useAction();
  const [confirmAi, setConfirmAi] = useState(false);
  const current = currentConsents(consents);

  const grant = (document: LegalDocument) =>
    runQuiet(async () => {
      await recordConsents(client, {
        profileId: profileId as string,
        items: [{ documentId: document.id, version: document.version, agreed: true }],
        actor: 'GUARDIAN',
      });
      reload();
      setConfirmAi(false);
      if (document.id === AI_CONSENT_DOCUMENT_ID)
        return '이제 티키가 AI와 이야기해요. 아이 대화 화면에도 바로 반영돼요.';
      if (document.id === VOICE_CONSENT_DOCUMENT_ID)
        return '이제 아이가 말로도 답할 수 있어요. 음성은 글로 바꾼 뒤 바로 버려요.';
      return `${document.title} 동의를 기록했어요.`;
    });

  const revoke = (consent: Consent, document: LegalDocument) =>
    runQuiet(async () => {
      await revokeConsent(client, consent.id);
      reload();
      if (document.id === AI_CONSENT_DOCUMENT_ID)
        return '동의를 철회했어요. 지금부터 티키는 준비된 대사로만 이야기해요.';
      if (document.id === VOICE_CONSENT_DOCUMENT_ID)
        return '동의를 철회했어요. 이제 말로 답하기 없이 글로만 이야기해요.';
      return `${document.title} 동의를 철회했어요.`;
    });

  const aiDocument = documents.find((item) => item.id === AI_CONSENT_DOCUMENT_ID);
  const aiGranted = current.has(AI_CONSENT_DOCUMENT_ID);

  return (
    <>
      <section className="panel">
        <div className="row between wrap">
          <h2>지금 아이 대화는 이렇게 동작해요</h2>
          <div className="row wrap" style={{ gap: '0.4rem' }}>
            <span className={`tag ${mode === 'ai' ? 'teal' : 'gold'}`}>{aiModeLabel(mode)}</span>
            <span className={`tag ${voice === 'on' ? 'teal' : 'gold'}`}>
              {voiceModeLabel(voice)}
            </span>
          </div>
        </div>
        <p className="muted space-top">
          {aiGranted
            ? `${profile?.nickname ?? '아이'}가 쓴 문장을 AI 처리 사업자에게 보내 티키의 답을 만들어요. 아래에서 언제든 철회할 수 있어요.`
            : '아직 AI 대화 동의가 없어요. 티키는 미리 준비한 대사와 질문으로만 이야기해요. 대화 자체는 막히지 않아요.'}
        </p>
        {aiDocument && !aiGranted && (
          <>
            {confirmAi ? (
              <div className="notice">
                <div>
                  <strong>한 번만 더 확인할게요.</strong>
                  <p>
                    동의하면 아이가 쓴 문장이 AI 처리 사업자에게 전송돼요. 사업자는 받은 문장을 모델
                    학습에 쓰지 않아요. 언제든 철회하면 바로 준비된 대사로 돌아가요.
                  </p>
                  <div className="actions split">
                    <Button className="light" onClick={() => setConfirmAi(false)}>
                      그만두기
                    </Button>
                    <Button disabled={busy} onClick={() => grant(aiDocument)}>
                      네, AI와 이야기할게요
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button onClick={() => setConfirmAi(true)}>
                <Icon name="spark" />
                AI 대화 켜기
              </Button>
            )}
          </>
        )}
        <ActionResult message={message} failed={failed} />
      </section>

      <Notice>
        아래 문서는 모두 <strong>법률 검토 전 초안</strong>이에요. 정식 고지·동의서는 검토 뒤에 바뀔
        수 있고, 바뀌면 새 버전으로 다시 여쭤봐요.
      </Notice>

      {documents.length === 0 ? (
        <section className="panel space-top">
          <p className="muted">약관 문서를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>
        </section>
      ) : (
        <div className="stack space-top">
          {documents.map((document) => (
            <ConsentCard
              key={document.id}
              document={document}
              consent={current.get(document.id)}
              busy={busy}
              onGrant={() =>
                document.id === AI_CONSENT_DOCUMENT_ID ? setConfirmAi(true) : grant(document)
              }
              onRevoke={() => {
                const consent = current.get(document.id);
                if (consent) revoke(consent, document);
              }}
            />
          ))}
        </div>
      )}

      <section className="panel space-top">
        <h3>동의 기록 전체</h3>
        {consents.length === 0 ? (
          <p className="muted space-top">아직 기록이 없어요.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <caption>버전별로 남기는 동의·철회 기록</caption>
              <thead>
                <tr>
                  <th>문서</th>
                  <th>버전</th>
                  <th>상태</th>
                  <th>동의한 사람</th>
                  <th>시각</th>
                </tr>
              </thead>
              <tbody>
                {consents.map((consent) => (
                  <tr key={consent.id}>
                    <td>
                      {documents.find((item) => item.id === consent.documentId)?.title ??
                        consent.documentId}
                    </td>
                    <td>{consent.documentVersion}</td>
                    <td>{consent.status === 'GRANTED' ? '동의' : '철회'}</td>
                    <td>{consent.actor.role}</td>
                    <td>
                      {new Date(consent.revokedAt ?? consent.grantedAt).toLocaleString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link className="btn light small" to="/tech">
          기술·안전 안내 보기
        </Link>
      </section>
    </>
  );
}

export function GuardianConsentScreen() {
  return (
    <GuardianSection
      title="무엇에 동의할지, 보호자가 정해요."
      description="목적이 다른 동의는 따로 여쭤보고 버전별로 기록해요. 동의하지 않아도 쓸 수 있는 기능은 그대로 열려 있어요."
    >
      <GuardianGate>
        <ConsentBody />
      </GuardianGate>
    </GuardianSection>
  );
}
