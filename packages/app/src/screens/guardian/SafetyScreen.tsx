// 명세 23절. 보호자에게 보이는 안전 이벤트.
// 분류 점수나 차단 규칙, 아이 원문은 보여 주지 않는다. 종류와 안내 문장만 온다.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listSafetyEvents } from '../../api/v1/endpoints';
import type { SafetyEventList } from '../../api/v1/types';
import { useAuth } from '../../providers/AuthProvider';
import {
  errorText,
  GuardianGate,
  GuardianSection,
  useGuardian,
} from '../../components/GuardianParts';
import { Notice } from '../../components/ui';

// 서버는 'violence' 처럼 소문자로 준다. 대소문자를 맞춰 찾고, 모르는 값은 그대로 보여 준다.
const CATEGORY_LABELS: Record<string, string> = {
  BLOCKED_TOPIC: '다루지 않는 주제',
  PII: '개인정보로 보이는 말',
  SELF_HARM: '도움이 필요해 보이는 말',
  MODERATION: '안전 정책에 걸린 말',
  UNSAFE_TOPIC: '만들 수 없는 주제',
  VIOLENCE: '무서운 표현',
  SEXUAL: '어린이에게 맞지 않는 표현',
  HATE: '누군가를 낮추는 표현',
  PROFANITY: '거친 말',
};

function categoryLabel(category: string) {
  return CATEGORY_LABELS[category.toUpperCase()] ?? category;
}

function SafetyBody() {
  const { client } = useAuth();
  const { profileId } = useGuardian();
  const [page, setPage] = useState<SafetyEventList | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const abort = new AbortController();
    listSafetyEvents(client, { profileId: profileId ?? undefined }, abort.signal)
      .then((found) => {
        if (!abort.signal.aborted) {
          setPage(found);
          setError('');
        }
      })
      .catch((reason) => {
        if (!abort.signal.aborted) setError(errorText(reason, '안전 기록을 불러오지 못했어요.'));
      });
    return () => abort.abort();
  }, [client, profileId]);

  const needsAttention = page?.items.filter((event) => event.needsAttention) ?? [];

  return (
    <>
      {error && (
        <div role="alert">
          <Notice variant="error">{error}</Notice>
        </div>
      )}
      {page?.notice && <Notice>{page.notice}</Notice>}

      {needsAttention.length > 0 && (
        <section className="panel space-top">
          <h2>먼저 봐 주세요 {needsAttention.length}건</h2>
          <div className="stack space-top">
            {needsAttention.map((event) => (
              <div className="notice" key={event.id}>
                <div>
                  <strong>{categoryLabel(event.category)}</strong>
                  <p>{event.guidance}</p>
                  <small className="muted">
                    {new Date(event.occurredAt).toLocaleString('ko-KR')}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel space-top">
        <div className="row between">
          <h3>안전 기록</h3>
          <small className="muted">{page?.items.length ?? 0}건</small>
        </div>
        {!page || page.items.length === 0 ? (
          <p className="muted space-top">
            안내가 필요한 기록이 없어요. 기록이 없다고 모든 대화의 안전이 보장되지는 않아요.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <caption>감지된 종류와 보호자 안내</caption>
              <thead>
                <tr>
                  <th>일시</th>
                  <th>종류</th>
                  <th>안내</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((event) => (
                  <tr key={event.id}>
                    <td>{new Date(event.occurredAt).toLocaleString('ko-KR')}</td>
                    <td>
                      {categoryLabel(event.category)}
                      {event.needsAttention && <span className="tag gold"> 확인 필요</span>}
                    </td>
                    <td>{event.guidance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel space-top">
        <h3>왜 원문이 없나요</h3>
        <p className="muted space-top">
          민감한 단어가 한 번 나왔다고 아이가 쓴 문장 전체를 보호자에게 자동으로 보내지 않아요. 어떤
          종류였는지와 어떻게 도우면 좋을지만 알려 드려요. 즉각적인 위험이 보일 때는 별도의 위기
          대응 정책이 움직여요.
        </p>
        <Link className="btn light small" to="/tech">
          기술·안전 안내 보기
        </Link>
      </section>
    </>
  );
}

export function GuardianSafetyScreen() {
  return (
    <GuardianSection
      title="안내가 필요한 순간만 알려 드려요."
      description="점수나 차단 규칙은 보여 주지 않아요. 무슨 종류였는지와 어떻게 도우면 좋을지만 전해요."
    >
      <GuardianGate needsProfile={false}>
        <SafetyBody />
      </GuardianGate>
    </GuardianSection>
  );
}
