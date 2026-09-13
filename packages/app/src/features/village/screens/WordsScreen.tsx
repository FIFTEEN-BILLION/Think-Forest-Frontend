import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Button, PageHeading } from '../components/ui';
import { WORDS } from '../data/experience';

export function WordsScreen() {
  const [quiz, setQuiz] = useState(false),
    [answer, setAnswer] = useState('');
  return (
    <>
      <PageHeading
        eyebrow="MY WORD POCKET"
        title="새로 알게 된 말을 모아요"
        description="이야기 속에서 만난 단어를 내 문장으로 만들어 보자!"
      >
        <Button
          onClick={() => {
            setQuiz(!quiz);
            setAnswer('');
          }}
        >
          <Icon name="spark" /> 단어 퀴즈
        </Button>
      </PageHeading>
      <section className="word-summary">
        <div>
          <span>🌱</span>
          <strong>12</strong>
          <small>만난 단어</small>
        </div>
        <div>
          <span>⭐</span>
          <strong>8</strong>
          <small>내가 알아요</small>
        </div>
        <div>
          <span>🎯</span>
          <strong>4</strong>
          <small>더 연습할 단어</small>
        </div>
        <p>
          이번 주에는 <strong>과학 단어 5개</strong>를 만났어요!
        </p>
      </section>
      {quiz && (
        <section className="quiz-panel">
          <span className="tag gold">보호자와 함께해도 좋아요</span>
          <h2>“아직 확실하지 않지만 알고 있는 것으로 미루어 생각하는 것”은?</h2>
          <div className="choice-row">
            {['결로', '추측', '근거'].map((word) => (
              <button
                className={`chip ${answer === word ? 'active' : ''}`}
                onClick={() => setAnswer(word)}
                key={word}
              >
                {word}
              </button>
            ))}
          </div>
          {answer && (
            <p className={answer === '추측' ? 'correct' : 'try-again'}>
              {answer === '추측'
                ? '맞았어! 그럼 ‘추측’을 넣은 네 문장도 만들어 볼까?'
                : '거의 다 왔어. 예시를 다시 떠올려 보자!'}
            </p>
          )}
        </section>
      )}
      <div className="word-grid">
        {WORDS.map((item) => (
          <article className="word-card" key={item.word}>
            <span className="word-emoji">{item.emoji}</span>
            <div className="row between">
              <span className={`tag ${item.mastered ? 'teal' : 'gold'}`}>
                {item.mastered ? '알아요' : '연습 중'}
              </span>
              <button aria-label="단어 듣기">
                <Icon name="sound" />
              </button>
            </div>
            <h2>
              {item.word} <small>{item.reading}</small>
            </h2>
            <p>{item.meaning}</p>
            <blockquote>“{item.example}”</blockquote>
            <button className="btn light">
              내 문장 만들기 <Icon name="arrow" />
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
