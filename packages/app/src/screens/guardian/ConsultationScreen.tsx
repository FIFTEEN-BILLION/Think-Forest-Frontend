// 명세 29절. 보호자 월간 AI 상담.
// 한 달 넘게 쌓인 기록을 관찰 기록으로 정리한다. 진단처럼 쓰지 않는다는 말을 먼저 적는다.

import { useCallback, useEffect, useState } from 'react';
import {
  aiSourceLabel,
  askConsultationQuestion,
  createConsultation,
  getConsultation,
  getConsultationEligibility,
  listConsultations,
} from '../../api/v1/endpoints';
import type {
  Consultation,
  ConsultationEligibility,
  ConsultationSummary,
} from '../../api/v1/types';
import { useAuth } from '../../providers/AuthProvider';
import { Icon } from '../../components/Icon';
import {
  ActionResult,
  errorText,
  GuardianAiStatus,
  GuardianGate,
  GuardianSection,
  useAction,
  useGuardian,
} from '../../components/GuardianParts';
import { Button, Notice } from '../../components/ui';

function ConsultationBody() {
  const { client } = useAuth();
  const { profileId, profile } = useGuardian();
  const { busy, message, failed, runQuiet } = useAction();
  const [eligibility, setEligibility] = useState<ConsultationEligibility | null>(null);
  const [list, setList] = useState<ConsultationSummary[]>([]);
  const [opened, setOpened] = useState<Consultation | null>(null);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!profileId) return;
    const abort = new AbortController();
    Promise.all([
      getConsultationEligibility(client, { profileId }, abort.signal),
      listConsultations(client, profileId, abort.signal),
    ])
      .then(([found, items]) => {
        if (abort.signal.aborted) return;
        setEligibility(found);
        setList(items);
        setError('');
      })
      .catch((reason) => {
        if (!abort.signal.aborted) setError(errorText(reason, '상담 정보를 불러오지 못했어요.'));
      });
    return () => abort.abort();
  }, [client, profileId, tick]);

  const create = () =>
    runQuiet(async () => {
      const made = await createConsultation(client, {
        profileId: profileId ?? undefined,
        period: eligibility?.period,
      });
      setOpened(made);
      refresh();
      return '상담 기록을 만들었어요.';
    });

  const open = (id: string) =>
    runQuiet(async () => {
      setOpened(await getConsultation(client, id, profileId ?? undefined));
      return '';
    });

  const ask = () =>
    runQuiet(async () => {
      if (!opened) return;
      const answered = await askConsultationQuestion(
        client,
        opened.id,
        question.trim(),
        profileId ?? undefined,
      );
      setOpened({ ...opened, questions: [...(opened.questions ?? []), answered] });
      setQuestion('');
      return '답을 받았어요.';
    });

  return (
    <>
      <GuardianAiStatus compact />
      <Notice>
        의료·심리·발달 진단이 아니에요. 아이가 실제로 말하고 쓴 것에서 보이는 모습만 정리해요.
        기록에 없는 성향이나 상태는 만들어 쓰지 않아요.
      </Notice>
      {error && (
        <div role="alert">
          <Notice variant="error">{error}</Notice>
        </div>
      )}

      <section className="panel space-top">
        <div className="row between wrap">
          <h2>{eligibility?.period ?? '이번 달'} 상담</h2>
          {eligibility && (
            <span className={`tag ${eligibility.eligible ? 'teal' : 'gold'}`}>
              {eligibility.eligible ? '만들 수 있어요' : '아직이에요'}
            </span>
          )}
        </div>
        {eligibility && (
          <dl className="definition">
            <dt>지금 상태</dt>
            <dd>{eligibility.reason}</dd>
            <dt>마친 이야기</dt>
            <dd>{eligibility.completedStories}편</dd>
            <dt>남은 날</dt>
            <dd>{eligibility.daysRemaining}일</dd>
          </dl>
        )}
        <Button disabled={busy || !eligibility?.eligible} onClick={create}>
          <Icon name="spark" />
          {busy ? '만드는 중…' : `${profile?.nickname ?? '아이'} 상담 기록 만들기`}
        </Button>
        <ActionResult message={message} failed={failed} />
      </section>

      {list.length > 0 && (
        <section className="panel space-top">
          <h3>지난 상담</h3>
          <div className="table-wrap">
            <table>
              <caption>월별 상담 기록</caption>
              <thead>
                <tr>
                  <th>기간</th>
                  <th>만든 방식</th>
                  <th>만든 날</th>
                  <th>열기</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item.id}>
                    <td>{item.period}</td>
                    <td>{aiSourceLabel(item.source)}</td>
                    <td>{new Date(item.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td>
                      <Button className="light small" onClick={() => open(item.id)}>
                        열기
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {opened && (
        <section className="panel space-top">
          <div className="row between wrap">
            <h3>{opened.period} 상담 내용</h3>
            <span className={`tag ${opened.source === 'ai' ? 'teal' : 'gold'}`}>
              {aiSourceLabel(opened.source)}
            </span>
          </div>
          {(
            [
              ['대화에서 본 모습', opened.consultation.observedBehaviors],
              ['그때 아이가 한 말', opened.consultation.examples],
              ['함께 해 볼 질문', opened.consultation.questionsToTry],
            ] as const
          ).map(([title, lines]) =>
            lines.length === 0 ? null : (
              <div key={title}>
                <h4 className="section-title">{title}</h4>
                <ul className="checklist">
                  {lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ),
          )}
          {opened.consultation.evidenceStoryIds.length > 0 && (
            <p className="muted space-top">
              근거가 된 이야기 {opened.consultation.evidenceStoryIds.length}편 ·{' '}
              {opened.consultation.evidenceStoryIds.join(', ')}
            </p>
          )}
          {opened.notice && <Notice>{opened.notice}</Notice>}

          <h4 className="section-title">더 묻고 싶은 것</h4>
          {(opened.questions ?? []).map((item) => (
            <div className="notice" key={item.id}>
              <div>
                <strong>{item.question}</strong>
                <p>{item.answer}</p>
                <small className="muted">{aiSourceLabel(item.source)}</small>
              </div>
            </div>
          ))}
          <div className="field">
            <label htmlFor="consultation-question">질문 적기</label>
            <textarea
              id="consultation-question"
              value={question}
              maxLength={300}
              placeholder="예: 이유를 말하는 걸 어려워하는데 집에서 어떻게 도와줄까요?"
              onChange={(event) => setQuestion(event.target.value)}
            />
          </div>
          <Button disabled={busy || question.trim().length < 4} onClick={ask}>
            질문 보내기
          </Button>
        </section>
      )}
    </>
  );
}

export function GuardianConsultationScreen() {
  return (
    <GuardianSection
      title="월간 상담"
      description="쌓인 대화에서 관찰된 모습과 근거가 된 이야기를 정리해요. 진단이 아니라 기록이에요."
    >
      <GuardianGate>
        <ConsultationBody />
      </GuardianGate>
    </GuardianSection>
  );
}
