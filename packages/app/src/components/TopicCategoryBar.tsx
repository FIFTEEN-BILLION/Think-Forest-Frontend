// 주제 카테고리 줄. 기본 카테고리는 서버가 주는 그대로 쓰고, 내가 만든 카테고리만 이름을 고치거나 지운다.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { V1Client } from '../api/v1/client';
import {
  createTopicCategory,
  deleteTopicCategory,
  updateTopicCategory,
} from '../api/v1/endpoints';
import type { TopicCategory } from '../api/v1/types';
import { Icon } from './Icon';
import { Button, Notice } from './ui';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export function TopicCategoryBar({
  client,
  categories,
  active,
  onSelect,
  onChanged,
}: {
  client: V1Client;
  categories: TopicCategory[];
  /** null 이면 추천 주제(“오늘”). */
  active: string | null;
  onSelect: (categoryId: string | null) => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<TopicCategory | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    setEditing(null);
    setAdding(false);
    setName('');
    setError('');
  };

  const run = async (task: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setError('');
    try {
      await task();
      onChanged();
      close();
    } catch (failure) {
      setError(errorText(failure, fallback));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="category-scroll">
        <button
          className={`chip ${active === null ? 'active' : ''}`}
          onClick={() => onSelect(null)}
        >
          오늘
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            className={`chip ${active === category.id ? 'active' : ''}`}
            onClick={() => {
              // 내가 만든 카테고리를 다시 누르면 이름 고치기가 열린다.
              if (active === category.id && category.editable) {
                setAdding(false);
                setEditing(category);
                setName(category.name);
                return;
              }
              close();
              onSelect(category.id);
            }}
          >
            {category.name}
            {category.editable && active === category.id ? ' ✎' : ''}
          </button>
        ))}
        <button
          className="chip add-category"
          onClick={() => {
            setEditing(null);
            setName('');
            setError('');
            setAdding((value) => !value);
          }}
        >
          <Icon name="plus" /> 카테고리 추가
        </button>
        <Link className="chip add-category" to="/topics/new">
          <Icon name="plus" /> 내 주제 추가
        </Link>
      </div>

      {(adding || editing) && (
        <section className="panel">
          <div className="field">
            <label htmlFor="topic-category-name">
              {editing ? '카테고리 이름 바꾸기' : '새 카테고리 이름'}
            </label>
            <input
              id="topic-category-name"
              value={name}
              maxLength={20}
              autoFocus
              placeholder="예: 내 일상"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          {error && <Notice variant="error">{error}</Notice>}
          <div className="actions split">
            <Button className="light small" onClick={close} disabled={busy}>
              그만두기
            </Button>
            <div className="row">
              {editing && (
                <Button
                  className="danger small"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await deleteTopicCategory(client, editing.id);
                      onSelect(null);
                    }, '카테고리를 지우지 못했어요.')
                  }
                >
                  지우기
                </Button>
              )}
              <Button
                className="small"
                disabled={busy || name.trim().length < 1}
                onClick={() =>
                  run(
                    () =>
                      editing
                        ? updateTopicCategory(client, editing.id, { name: name.trim() })
                        : createTopicCategory(client, { name: name.trim() }),
                    editing ? '이름을 바꾸지 못했어요.' : '카테고리를 만들지 못했어요.',
                  )
                }
              >
                {busy ? '저장 중…' : '저장'}
              </Button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
