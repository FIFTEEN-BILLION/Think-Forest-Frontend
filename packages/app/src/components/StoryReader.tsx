import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Model } from '../api/schema';
import { contentAppearance } from './contentAppearance';
import { Icon } from './Icon';

export function journeyEntries(journey: Model<'ThoughtJourney'>) {
  const entries: { text: string; labels: string[] }[] = [];
  const seen = new Map<string, number>();
  const stages: [string, string[]][] = [
    ['처음 떠올린 생각', [journey.initialIdea]],
    ['생각의 단서', journey.evidence],
    ['다르게 바라본 생각', journey.alternatives],
    ['마지막에 남긴 생각', [journey.finalReflection]],
  ];
  for (const [label, lines] of stages) {
    for (const line of lines) {
      const text = line.trim();
      const key = text.replace(/\s+/g, '').replace(/[.!?~…]+$/, '');
      if (!key) continue;
      const index = seen.get(key);
      if (index !== undefined) {
        if (!entries[index]!.labels.includes(label)) entries[index]!.labels.push(label);
      } else {
        seen.set(key, entries.length);
        entries.push({ text, labels: [label] });
      }
    }
  }
  return entries;
}

export function StoryReader({
  detail,
  editor,
  actions,
  management,
  notice,
  guest = false,
}: {
  detail: Model<'StoryDetail'>;
  editor?: ReactNode;
  actions: ReactNode;
  management: ReactNode;
  notice?: ReactNode;
  guest?: boolean;
}) {
  const story = detail.story;
  const appearance = contentAppearance(story.category);
  const entries = journeyEntries(story.thoughtJourney);
  const created = new Date(story.createdAt);
  const date = Number.isNaN(created.valueOf())
    ? null
    : new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Seoul',
      }).format(created);
  return (
    <div className="record-page">
      <Link className="record-back" to="/shelf">
        <Icon name="back" /> 나의 책장으로
      </Link>
      <header className="record-heading">
        <div className="record-heading-copy">
          <span className="record-eyebrow">
            <Icon name="check" /> 책장에 담긴 나의 이야기
          </span>
          <h1>{story.title}</h1>
          <div className="record-meta">
            <span>
              <Icon name={appearance.icon} /> {appearance.label} 이야기
            </span>
            {date && <time dateTime={story.createdAt}>{date}</time>}
          </div>
        </div>
        <div className="record-emblem" aria-hidden="true">
          <Icon name="book" />
          <span>나만의 생각 한 편</span>
        </div>
      </header>
      {notice}
      <div className="record-grid">
        <article className="record-paper" aria-labelledby="record-body-title">
          <div className="record-paper-heading">
            <span className="record-eyebrow">MY STORY</span>
            <h2 id="record-body-title">
              {editor ? '내 말로 이야기 다듬기' : '내가 완성한 이야기'}
            </h2>
          </div>
          {editor || (
            <div className="record-prose">
              {story.body
                .split(/\n\s*\n/)
                .filter((p) => p.trim())
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
            </div>
          )}
          <div className="record-paper-end">
            <span />
            <Icon name="sprout" />
            <span />
          </div>
          <footer className="record-paper-footer">
            <p>작은 생각이 모여, 나만의 이야기가 되었어요.</p>
            <div className="record-actions">{actions}</div>
          </footer>
        </article>
        <aside className="record-sidebar" aria-label="이야기에 담긴 생각과 단어">
          <section className="record-journey" aria-labelledby="record-journey-title">
            <span className="record-eyebrow">MY THOUGHTS</span>
            <h2 id="record-journey-title">생각이 자란 과정</h2>
            <p className="record-caption">대화에서 내가 남긴 말들을 돌아봐요.</p>
            {entries.length ? (
              <ol className="record-timeline">
                {entries.map((entry, index) => (
                  <li key={index}>
                    <div className="record-stage-labels">
                      {entry.labels.map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>
                    <blockquote>{entry.text}</blockquote>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="record-empty">이 이야기에 따로 남긴 생각 기록은 없어요.</p>
            )}
          </section>
          {!!detail.wordsUsed.length && (
            <section className="record-words" aria-labelledby="record-words-title">
              <h2 id="record-words-title">
                <Icon name="spark" /> 이야기에서 만난 단어
              </h2>
              <div>
                {detail.wordsUsed.map((word) => (
                  <Link key={word.id} to="/words" title={word.meaning}>
                    {word.word}
                    <Icon name="arrow" />
                  </Link>
                ))}
              </div>
            </section>
          )}
          <div className="record-keep-note">
            <Icon name={guest ? 'clock' : 'book'} />
            <p>
              {guest
                ? '게스트 기록은 체험 기간에만 볼 수 있어요. 공유는 정식 계정에서 이용할 수 있어요.'
                : '이야기는 책장에 보관돼요. 언제든 다시 읽고 내 말로 다듬을 수 있어요.'}
            </p>
          </div>
        </aside>
      </div>
      <details className="record-management">
        <summary>이야기 관리</summary>
        <div>{management}</div>
      </details>
    </div>
  );
}
