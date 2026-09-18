// 서버에 저장된 이야기 한 편(명세 12절): 읽기·고치기·아끼기·지우기·나누기.

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  categoryEmoji,
  categoryLabel,
  conflictVersion,
  deleteStory,
  editStory,
  getStoryDetail,
  isVersionConflict,
  setStoryFavorite,
  wordStatusLabel,
  wordStatusTone,
} from '../../../api/v1/endpoints';
import type { StoryDetail } from '../../../api/v1/types';
import { useAuth } from '../../../providers/AuthProvider';
import { Icon } from './Icon';
import {
  libraryErrorText,
  LibraryConfirmButton,
  LibraryErrorNotice,
  LibraryLoading,
} from './LibraryParts';
import { ShareRequestPanel } from './ShareStoryPanel';
import { Button, EmptyState, Notice, PageHeading, ReadAloud } from './ui';
import { useVillage } from '../state/VillageProvider';

interface StoryResult {
  key: string;
  detail: StoryDetail | null;
  error: string;
}

/** 서버 이야기 상세. variant="complete" 면 방금 마친 이야기 축하 화면으로 쓴다. */
export function LibraryServerStory({
  storyId,
  variant = 'detail',
}: {
  storyId: string;
  variant?: 'detail' | 'complete';
}) {
  const { client, status } = useAuth();
  const { toast } = useVillage();
  const navigate = useNavigate();
  const [result, setResult] = useState<StoryResult | null>(null);
  const [reloads, setReloads] = useState(0);
  // 고치기 초안은 아이가 "고치기"를 누를 때만 만든다. 서버 값과 따로 맞출 필요가 없다.
  const [draft, setDraft] = useState<{ title: string; body: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState('');
  const [actionError, setActionError] = useState('');
  const key = `${reloads}|${storyId}`;
  const loading = status === 'signedIn' && result?.key !== key;
  const detail = result?.key === key ? result.detail : null;
  const error = (result?.key === key ? result.error : '') || actionError;
  const reload = () => {
    setActionError('');
    setConflict('');
    setDraft(null);
    setReloads((n) => n + 1);
  };

  useEffect(() => {
    if (status !== 'signedIn') return;
    const abort = new AbortController();
    getStoryDetail(client, storyId, abort.signal)
      .then((next) => {
        if (!abort.signal.aborted) setResult({ key, detail: next, error: '' });
      })
      .catch((reason: unknown) => {
        if (!abort.signal.aborted)
          setResult({
            key,
            detail: null,
            error: libraryErrorText(reason, '이야기를 불러오지 못했어요.'),
          });
      });
    return () => abort.abort();
  }, [client, storyId, status, key]);

  if (status === 'loading' || loading) return <LibraryLoading label="내 이야기를 펼치고 있어요…" />;
  if (status !== 'signedIn')
    return (
      <EmptyState
        title="로그인하면 이 이야기를 볼 수 있어요."
        description="티키가 서버에 소중히 보관해 두었어요."
        to={`/login?returnTo=${encodeURIComponent(`/shelf/${storyId}`)}`}
        action="로그인하러 가기"
      />
    );
  if (!detail)
    return (
      <EmptyState
        title="이야기를 찾지 못했어요."
        description={error || '책장에서 다른 이야기를 찾아볼 수 있어요.'}
        to="/shelf"
        action="책장으로 돌아가기"
      />
    );

  const story = detail.story;

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setConflict('');
    setActionError('');
    try {
      const next = await editStory(
        client,
        storyId,
        { title: draft.title, body: draft.body },
        story.version,
      );
      setResult({ key, detail: { ...detail, story: next.story }, error: '' });
      setDraft(null);
      toast(next.edited ? '고친 내용을 저장했어요.' : '바뀐 곳이 없어요.');
    } catch (reason) {
      if (isVersionConflict(reason)) {
        const current = conflictVersion(reason);
        setConflict(
          `다른 기기에서 먼저 고쳤어요.${current ? ` (지금 저장된 건 ${current}번째 고침이에요)` : ''}`,
        );
      } else setActionError(libraryErrorText(reason, '저장하지 못했어요.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleFavorite = async () => {
    try {
      const next = await setStoryFavorite(client, storyId, !story.favorite);
      setResult({
        key,
        detail: {
          ...detail,
          story: { ...story, favorite: next.story.favorite, version: next.story.version },
        },
        error: '',
      });
      toast(next.story.favorite ? '아끼는 기록에 담았어요.' : '아끼는 기록에서 뺐어요.');
    } catch (reason) {
      setActionError(libraryErrorText(reason, '아끼는 기록을 바꾸지 못했어요.'));
    }
  };

  const remove = async () => {
    try {
      await deleteStory(client, storyId);
      toast('이야기를 지웠어요.');
      navigate('/shelf', { replace: true });
    } catch (reason) {
      setActionError(libraryErrorText(reason, '이야기를 지우지 못했어요.'));
    }
  };

  return (
    <>
      <Link to="/shelf" className="back">
        <Icon name="back" />
        나의 책장
      </Link>
      <PageHeading
        eyebrow={variant === 'complete' ? 'ONE MORE LITTLE DISCOVERY' : 'MY LITTLE DISCOVERY'}
        title={variant === 'complete' ? '나만의 이야기가 책장에 담겼어요.' : story.title}
        description={`${categoryEmoji(story.category)} ${categoryLabel(story.category)} · ${new Date(
          story.createdAt,
        ).toLocaleDateString('ko-KR')} · ${story.version}번째 고침`}
      >
        <Button
          className="light small"
          aria-pressed={story.favorite}
          onClick={() => void toggleFavorite()}
        >
          <Icon name="heart" />
          {story.favorite ? '아끼는 기록에 담았어요' : '아끼는 기록에 담기'}
        </Button>
      </PageHeading>
      <LibraryErrorNotice error={error} onRetry={reload} />
      {conflict && (
        <div className="notice error">
          <Icon name="info" />
          <div>
            {conflict} 새로 불러온 뒤 다시 고쳐 주세요.
            <div className="actions">
              <Button className="light small" onClick={reload}>
                새로 불러오기
              </Button>
            </div>
          </div>
        </div>
      )}
      <span className="tag teal">티키 서버에 저장된 이야기</span>
      <div className="learning-grid">
        <section className="panel">
          {variant === 'complete' && <h2 className="space-top">{story.title}</h2>}
          {draft ? (
            <>
              <div className="field">
                <label htmlFor="story-title">제목</label>
                <input
                  id="story-title"
                  value={draft.title}
                  maxLength={60}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="story-body">내 이야기</label>
                <textarea
                  id="story-body"
                  value={draft.body}
                  maxLength={4000}
                  rows={12}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                />
              </div>
              <div className="actions split">
                <Button
                  className="light"
                  disabled={saving}
                  onClick={() => {
                    setDraft(null);
                    setConflict('');
                  }}
                >
                  그대로 둘래요
                </Button>
                <Button
                  disabled={saving || !draft.title.trim() || !draft.body.trim()}
                  onClick={() => void save()}
                >
                  {saving ? '저장하는 중…' : '고친 내용 저장'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="muted">{story.summary}</p>
              <div className="story-reading">
                {story.body
                  .split('\n')
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </div>
              <div className="actions split">
                <ReadAloud text={story.body} />
                <Button
                  className="light small"
                  onClick={() => setDraft({ title: story.title, body: story.body })}
                >
                  <Icon name="spark" /> 내 말로 고치기
                </Button>
              </div>
            </>
          )}
        </section>
        <div className="stack">
          <section className="panel">
            <h3>생각이 자란 길</h3>
            <dl className="definition">
              <dt>처음 생각</dt>
              <dd>{story.thoughtJourney.initialIdea || '—'}</dd>
              <dt>그렇게 생각한 까닭</dt>
              <dd>
                {story.thoughtJourney.evidence.length
                  ? story.thoughtJourney.evidence.join(' / ')
                  : '—'}
              </dd>
              <dt>다른 경우도 떠올렸어요</dt>
              <dd>
                {story.thoughtJourney.alternatives.length
                  ? story.thoughtJourney.alternatives.join(' / ')
                  : '—'}
              </dd>
              <dt>마지막에 정리한 생각</dt>
              <dd>{story.thoughtJourney.finalReflection || '—'}</dd>
            </dl>
          </section>
          {detail.wordsUsed.length > 0 && (
            <section className="panel">
              <h3>이 이야기에서 만난 낱말</h3>
              <div className="row wrap">
                {detail.wordsUsed.map((word) => (
                  <span className={`tag ${wordStatusTone(word.status)}`} key={word.id}>
                    {word.word} · {wordStatusLabel(word.status)}
                  </span>
                ))}
              </div>
              <Link className="btn light small" to="/words">
                단어 보관함 열기 <Icon name="arrow" />
              </Link>
            </section>
          )}
          {detail.sourceConversation && (
            <section className="panel">
              <h3>이 이야기가 시작된 대화</h3>
              <dl className="definition">
                <dt>주제</dt>
                <dd>{detail.sourceConversation.topic.title}</dd>
                <dt>주고받은 말</dt>
                <dd>{detail.sourceConversation.messageCount}번</dd>
                <dt>나눈 날</dt>
                <dd>{new Date(detail.sourceConversation.startedAt).toLocaleDateString('ko-KR')}</dd>
              </dl>
              <Link
                className="btn light small"
                to={`/talk?conversationId=${encodeURIComponent(detail.sourceConversation.conversationId)}`}
              >
                그때 대화 다시 보기 <Icon name="arrow" />
              </Link>
            </section>
          )}
          <ShareRequestPanel storyId={storyId} storyTitle={story.title} compact />
          <section className="panel">
            <h3>정리하기</h3>
            <Notice>이야기를 지우면 친구들에게 공개된 것도 함께 사라져요.</Notice>
            <LibraryConfirmButton
              label="이 이야기 지우기"
              question={`“${story.title}” 을 지울까요? 되돌릴 수 없어요.`}
              confirmLabel="네, 지울래요"
              onConfirm={() => void remove()}
            />
          </section>
        </div>
      </div>
      {variant === 'complete' && (
        <div className="actions split">
          <Link to="/" className="btn light">
            첫 화면으로
          </Link>
          <Link to="/shelf" className="btn">
            책장에서 다시 보기 <Icon name="book" />
          </Link>
        </div>
      )}
    </>
  );
}
