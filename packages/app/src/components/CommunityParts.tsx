// 친구들의 이야기 조각(명세 14절).
// 작성자 표시는 서버가 준 displayName·ageBand 만 쓴다. 실명·학교는 응답에 없고 화면에서도 만들지 않는다.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  categoryEmoji,
  categoryLabel,
  REPORT_REASONS,
  reportCommunityStory,
} from '../api/v1/endpoints';
import type { PublicStory, ReportReason } from '../api/v1/types';
import { useAuth } from '../providers/AuthProvider';
import { Icon } from './Icon';
import { libraryErrorText, LibraryErrorNotice } from './LibraryParts';
import { Button, Notice } from './ui';

export function CommunityStoryCard({
  story,
  onRecommend,
}: {
  story: PublicStory;
  onRecommend: (story: PublicStory) => void;
}) {
  return (
    <article className="community-card">
      <div className="community-cover">
        <span aria-hidden="true">{categoryEmoji(story.category)}</span>
        <small>{categoryLabel(story.category)} 이야기</small>
      </div>
      <div className="community-copy">
        <div className="author">
          <span aria-hidden="true">{story.author.displayName.slice(0, 1)}</span>
          <strong>{story.author.displayName}</strong>
          <small>
            {story.author.ageBand}
            {story.guardianApproved !== false && ' · 보호자 확인'}
          </small>
        </div>
        <h2>{story.title}</h2>
        <p>{story.excerpt}</p>
        {story.recommendationReason && (
          <p className="recommend-reason">
            <Icon name="spark" /> {story.recommendationReason}
          </p>
        )}
        <div className="row between">
          <button
            type="button"
            className={`like ${story.recommendedByMe ? 'active' : ''}`}
            aria-pressed={story.recommendedByMe}
            onClick={() => onRecommend(story)}
          >
            <Icon name="heart" /> {story.recommendationCount}
          </button>
          <Link className="read-more" to={`/community/${story.id}`}>
            이야기 읽기 <Icon name="arrow" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/** 불편한 내용 신고. 보낸 뒤에는 검토 중이라고만 알려 준다. */
export function CommunityReportForm({ publicStoryId }: { publicStoryId: string }) {
  const { client, status } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('SCARY');
  const [detail, setDetail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (sent)
    return (
      <Notice>
        알려 줘서 고마워요. 지금 어른들이 이 이야기를 살펴보고 있어요. 확인이 끝나면 알려 줄게요.
      </Notice>
    );
  if (status !== 'signedIn') return <Notice>로그인하면 불편한 내용을 알려 줄 수 있어요.</Notice>;
  if (!open)
    return (
      <button type="button" className="report-link" onClick={() => setOpen(true)}>
        불편한 내용 알리기
      </button>
    );

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      await reportCommunityStory(client, publicStoryId, {
        reason,
        ...(detail.trim() ? { detail: detail.trim() } : {}),
      });
      setSent(true);
    } catch (reason_) {
      setError(libraryErrorText(reason_, '알림을 보내지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <h2>무엇이 불편했나요?</h2>
      <LibraryErrorNotice error={error} />
      <div className="filters" role="group" aria-label="알리는 이유">
        {REPORT_REASONS.map((item) => (
          <button
            type="button"
            key={item.key}
            className={`chip ${reason === item.key ? 'active' : ''}`}
            aria-pressed={reason === item.key}
            onClick={() => setReason(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="report-detail">더 알려 주고 싶은 말 (안 써도 돼요)</label>
        <textarea
          id="report-detail"
          value={detail}
          maxLength={300}
          rows={3}
          placeholder="어떤 부분이 불편했는지 알려 주면 어른들이 더 잘 살펴볼 수 있어요."
          onChange={(e) => setDetail(e.target.value)}
        />
      </div>
      <div className="actions split">
        <Button className="light" onClick={() => setOpen(false)}>
          그만두기
        </Button>
        <Button disabled={busy} onClick={() => void send()}>
          {busy ? '보내는 중…' : '어른에게 알리기'}
        </Button>
      </div>
    </section>
  );
}
