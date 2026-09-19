import { ApiError } from '../client';
import type { ApiRequest } from '../client';
import type { Model } from '../schema';
import type { ChatSession } from '../../types/conversation';
import { activities, id, makeStory, now, seed } from './seed';
import { createActivity, updateActivity } from './activities';

// Deliberately separate from real account storage. A tab reload preserves the demo;
// closing the tab clears it. No request in this transport ever falls through to fetch.
export const MOCK_STORAGE_KEY = 'jjcp-api-demo-v1';
type State = ReturnType<typeof initialState>;
function initialState() {
  const data = seed();
  return {
    ...data,
    signedIn: true,
    profiles: [data.profile],
    settingsByProfile: { [data.profile.id]: data.settings },
    chats: {} as Record<string, ChatSession>,
    sessions: [] as Model<'ActivitySessionOut'>[],
    quizzes: [] as Model<'WordQuizOut'>[],
    categories: [] as Model<'TopicCategoryOut'>[],
    summaries: [] as Model<'SummaryOut'>[],
    shares: [] as Model<'ShareRequestOut'>[],
    notificationSettings: {
      pushEnabled: false,
      shareRequests: true,
      safetyNotices: true,
      activitySummary: true,
      updatedAt: now(),
    },
  };
}
function fail(status: number, message: string): never {
  throw new ApiError(status, JSON.stringify({ error: { code: 'MOCK_REQUEST_ERROR', message } }));
}
function find<T>(items: T[], predicate: (item: T) => boolean): T {
  return (
    items.find(predicate) ?? fail(404, '예시 기록을 찾을 수 없어요. 목록에서 다시 선택해 주세요.')
  );
}
function page<T>(items: T[], search: URLSearchParams) {
  const start = Math.max(0, Number(search.get('cursor')) || 0);
  const limit = Math.max(1, Math.min(100, Number(search.get('limit')) || 20));
  return {
    items: items.slice(start, start + limit),
    nextCursor: start + limit < items.length ? String(start + limit) : null,
  };
}

export function createMockApiClient(storage?: Pick<Storage, 'getItem' | 'setItem'>): ApiRequest {
  if (!storage && typeof window !== 'undefined') {
    try {
      storage = window.sessionStorage;
    } catch {
      /* Storage may be disabled. */
    }
  }
  let state = initialState();
  try {
    const saved = storage?.getItem(MOCK_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as State;
      if (
        Array.isArray(parsed.profiles) &&
        parsed.profiles.length &&
        parsed.settingsByProfile &&
        Array.isArray(parsed.stories) &&
        parsed.chats &&
        Array.isArray(parsed.sessions)
      )
        state = parsed;
    }
  } catch {
    /* A corrupt or older demo starts with fresh examples. */
  }
  const active = () => state.profiles.find((p) => p.isDefault) ?? state.profiles[0]!;
  const me = (): Model<'AccountMeResponse'> => ({
    user: { id: 'mock-user', role: 'CHILD', needsFirstGreeting: active().needsFirstGreeting },
    profile: {
      ...active(),
      interests: active().interests ?? [],
      gradeOrAgeBand: active().gradeOrAgeBand ?? null,
      growthGoal: active().growthGoal ?? null,
    },
    profiles: state.profiles,
  });
  const period = (days = 7) => ({
    from: new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10),
    to: now().slice(0, 10),
  });
  const memo = new Map<string, unknown>();

  function dispatch(path: string, options: RequestInit): unknown {
    const url = new URL(path.replace(/^\/?api\/v1\//, ''), 'https://mock.invalid/');
    const route = url.pathname.slice(1),
      parts = route.split('/'),
      search = url.searchParams;
    const method = options.method?.toUpperCase() ?? 'GET';
    const body = (typeof options.body === 'string' ? JSON.parse(options.body) : {}) as Record<
      string,
      unknown
    >;
    const at = now();
    if (route === 'auth/dev/login' || route === 'auth/token/refresh') {
      if (route.endsWith('refresh') && !state.signedIn) fail(401, '체험을 다시 시작해 주세요.');
      state.signedIn = true;
      return {
        accessToken: 'mock-access-token',
        expiresIn: 3600,
        refreshExpiresIn: 86400,
        user: me().user,
      };
    }
    if (!state.signedIn) fail(401, '체험을 다시 시작해 주세요.');
    if (route === 'auth/logout') {
      state.signedIn = false;
      return { ok: true };
    }
    if (route === 'me') return me();
    if (route === 'profiles' && method === 'GET') return page(state.profiles, search);
    if (parts[0] === 'profiles') {
      if (method === 'POST' && parts.length === 1) {
        const profile = {
          ...seed().profile,
          id: id('profile'),
          nickname: String(body.nickname),
          isDefault: false,
        };
        state.profiles.push(profile);
        state.settingsByProfile[profile.id] = { ...seed().settings, profileId: profile.id };
        return { profile };
      }
      const profile = find(state.profiles, (p) => p.id === parts[1]);
      if (parts[2] === 'settings') {
        const settings = state.settingsByProfile[profile.id]!;
        if (method === 'PATCH')
          Object.assign(settings, body, { version: settings.version + 1, updatedAt: at });
        return { settings };
      }
      if (method === 'PATCH') {
        Object.assign(profile, body, { version: profile.version + 1, updatedAt: at });
        if (body.makeDefault)
          state.profiles.forEach((p) => {
            p.isDefault = p.id === profile.id;
          });
      }
      return { profile };
    }
    if (route === 'home')
      return {
        profile: active(),
        recommendations: state.topics.map((t) => ({
          topicId: t.id,
          title: t.title,
          category: t.category,
          reason: t.hook,
          estimatedMinutes: t.estimatedMinutes,
        })),
        resume: null,
        recentWords: state.words.slice(0, 2),
        communityStories: state.community.slice(0, 3),
        weeklyActivity: { conversationDays: 3, completedStories: state.stories.length },
      } satisfies Model<'HomeResponse'>;
    if (route === 'topics') {
      if (method === 'POST') {
        const topic: Model<'TopicDetail'> = {
          id: id('topic'),
          title: String(body.title),
          category: String(body.category ?? 'THINKING'),
          source: 'USER',
          hook: '어떤 생각이 떠오르나요?',
          estimatedMinutes: 10,
          questions: ['왜 그렇게 생각했나요?'],
        };
        state.topics.unshift(topic);
        return { topic, safety: { allowed: true, reason: null } };
      }
      return page(
        state.topics.filter((t) => t.title.includes(search.get('query') ?? '')),
        search,
      );
    }
    if (parts[0] === 'topics') return { topic: find(state.topics, (t) => t.id === parts[1]) };
    if (route === 'stories')
      return page(
        state.stories.filter(
          (s) =>
            `${s.title} ${s.body}`.includes(search.get('query') ?? '') &&
            (search.get('favorite') !== 'true' || s.favorite),
        ),
        search,
      );
    if (parts[0] === 'stories') {
      const story = find(state.stories, (s) => s.id === parts[1]);
      if (parts[2] === 'share-requests') {
        const shareRequest: Model<'ShareRequestOut'> = {
          id: id('share'),
          storyId: story.id,
          status: 'PENDING_GUARDIAN',
          audience: body.audience as Model<'ShareRequestOut'>['audience'],
          hideProfile: Boolean(body.hideProfile),
          requestedBodyVersion: story.version,
          pendingReason: '예시 체험에서는 실제 보호자에게 전송되지 않아요.',
          requestedAt: at,
          updatedAt: at,
        };
        state.shares.push(shareRequest);
        return { shareRequest };
      }
      if (parts[2] === 'favorite') {
        story.favorite = method === 'PUT';
        story.version++;
      } else if (method === 'PATCH')
        Object.assign(story, body, { version: story.version + 1, updatedAt: at });
      else if (method === 'DELETE') {
        state.stories = state.stories.filter((s) => s.id !== story.id);
        state.books.forEach((b) => {
          b.stories = b.stories.filter((s) => s.id !== story.id);
          b.storyCount = b.stories.length;
        });
        return { ok: true };
      }
      return {
        story,
        wordsUsed: [],
        sourceConversation: story.sourceConversationId
          ? { conversationId: story.sourceConversationId }
          : null,
      };
    }
    if (route === 'books') {
      if (method === 'POST') {
        const stories = state.stories.filter((s) => (body.storyIds as string[]).includes(s.id));
        const book: Model<'BookDetail'> = {
          id: id('book'),
          title: String(body.title),
          introduction: '내 생각을 모은 이야기책이에요.',
          cover: null,
          status: 'DRAFT',
          storyCount: stories.length,
          stories,
          version: 1,
          createdAt: at,
          updatedAt: at,
          completedAt: null,
          introductionSource: 'fallback',
        };
        state.books.unshift(book);
        return { book };
      }
      return page(state.books, search);
    }
    if (parts[0] === 'books') {
      const book = find(state.books, (b) => b.id === parts[1]);
      if (parts[2] === 'complete') {
        book.status = 'COMPLETED';
        book.completedAt = at;
      } else if (parts[2] === 'stories') {
        if (method === 'DELETE') book.stories = book.stories.filter((s) => s.id !== parts[3]);
        else book.stories.push(find(state.stories, (s) => s.id === body.storyId));
      } else if (method === 'DELETE') {
        state.books = state.books.filter((b) => b.id !== book.id);
        return { ok: true };
      } else if (method === 'PATCH') {
        if (body.title !== undefined) book.title = String(body.title);
        if (body.introduction !== undefined) book.introduction = String(body.introduction);
        if (Array.isArray(body.storyIds))
          book.stories = body.storyIds.map((key) => find(state.stories, (s) => s.id === key));
      }
      if (method !== 'GET') {
        book.version++;
        book.updatedAt = at;
        book.storyCount = book.stories.length;
      }
      return { book };
    }
    if (route === 'wordbook')
      return {
        ...page(
          state.words.filter((w) => !search.get('status') || w.status === search.get('status')),
          search,
        ),
        summary: {
          total: state.words.length,
          familiar: state.words.filter((w) => w.status === 'FAMILIAR').length,
          practicing: state.words.filter((w) => w.status === 'PRACTICING').length,
          new: state.words.filter((w) => w.status === 'NEW').length,
          newThisWeek: state.words.length,
          dueForReview: 2,
        },
      };
    if (parts[0] === 'wordbook' && parts[1] === 'entries') {
      if (method === 'POST') {
        const entry = {
          ...seed().words[0]!,
          id: id('word'),
          word: String(body.word),
          reading: String(body.word),
          meaning: '이야기에서 만난 단어예요. 내 문장으로 뜻을 표현해 보세요.',
          example: '',
          status: 'NEW' as const,
          createdAt: at,
          updatedAt: at,
        };
        state.words.unshift(entry);
        return { entry };
      }
      const entry = find(state.words, (w) => w.id === parts[2]);
      if (method === 'PATCH') Object.assign(entry, body, { updatedAt: at });
      if (method === 'DELETE') state.words = state.words.filter((w) => w.id !== entry.id);
      return { entry };
    }
    if (route === 'word-quizzes' && method === 'POST') {
      if (!state.words.length) fail(422, '단어를 먼저 보관해 주세요.');
      const words = state.words.slice(0, Number(body.count) || 5);
      const quiz: Model<'WordQuizOut'> = {
        id: id('quiz'),
        mode: 'MEANING_TO_WORD',
        status: 'IN_PROGRESS',
        questionCount: words.length,
        answeredCount: 0,
        createdAt: at,
        completedAt: null,
        questions: words.map((w, index) => ({
          id: w.id,
          index,
          prompt: w.meaning,
          answered: false,
          options: state.words.map((o) => ({ id: o.id, label: o.word })),
        })),
      };
      state.quizzes.push(quiz);
      return quiz;
    }
    if (parts[0] === 'word-quizzes') {
      const quiz = find(state.quizzes, (q) => q.id === parts[1]);
      if (parts[2] === 'answers') {
        const question = find(quiz.questions, (q) => q.id === body.questionId);
        question.answered = true;
        quiz.answeredCount = quiz.questions.filter((q) => q.answered).length;
        if (quiz.answeredCount === quiz.questionCount) {
          quiz.status = 'COMPLETED';
          quiz.completedAt = at;
        }
        return {
          result: { correct: body.optionId === question.id },
          quiz,
          entry: state.words.find((w) => w.id === question.id),
        };
      }
      return quiz;
    }
    if (route === 'community/stories') return page(state.community, search);
    if (parts[0] === 'community' && parts[1] === 'stories') {
      const story = find(state.community, (s) => s.id === parts[2]);
      if (parts[3] === 'recommendation') {
        const recommended = method === 'PUT';
        if (recommended !== story.recommendedByMe)
          story.recommendationCount += recommended ? 1 : -1;
        story.recommendedByMe = recommended;
      }
      if (parts[3] === 'reports') return { ok: true };
      return { story };
    }
    if (parts[0] === 'topic-categories') {
      if (method === 'POST')
        state.categories.push({
          id: id('category'),
          name: String(body.name),
          kind: 'USER',
          order: state.categories.length,
          visual: '🌱',
          editable: true,
        });
      if (parts[1]) {
        const category = find(state.categories, (c) => c.id === parts[1]);
        if (method === 'PATCH') category.name = String(body.name);
        if (method === 'DELETE')
          state.categories = state.categories.filter((c) => c.id !== category.id);
        return { category };
      }
      return page(state.categories, search);
    }
    if (parts[0] === 'conversations' || route.startsWith('first-greeting/sessions')) {
      const greeting = parts[0] === 'first-greeting';
      const key = parts[greeting ? 2 : 1],
        action = parts[greeting ? 3 : 2];
      if (!key && method === 'POST') {
        const key = id('chat');
        const topic = state.topics.find((t) => t.id === body.topicId) ?? state.topics[0]!;
        const message = {
          id: id('message'),
          role: 'ASSISTANT',
          content: greeting
            ? '안녕! 나는 티키야. 어떤 이름으로 불러 줄까?'
            : `${topic.title} ${topic.hook} 네 생각을 들려줘.`,
          source: 'fallback',
        };
        const chat: ChatSession = {
          ...(greeting ? { sessionId: key } : { conversationId: key }),
          status: 'ACTIVE',
          topic,
          messages: [message],
          assistantMessage: message,
          readiness: { ready: false, progress: 0 },
          currentInteraction: { type: 'TEXT', questionId: id('question'), options: [] },
          ...(greeting
            ? {
                profileDraft: {
                  nickname: null,
                  schoolOrGroup: null,
                  gradeOrAgeBand: null,
                  interests: [],
                },
              }
            : {}),
        };
        state.chats[key] = chat;
        return chat;
      }
      const chat =
        state.chats[key!] ?? fail(404, '이전 예시 대화가 없어요. 새 대화를 시작해 주세요.');
      if (action === 'messages' && method === 'POST') {
        const input = body.input as { text?: string; optionId?: string };
        const text = input.text ?? input.optionId ?? '';
        const turn = (chat.messages ?? []).filter((m) => m.role === 'USER').length;
        const prompts = greeting
          ? [
              '좋아! 어느 학교나 모임에서 지내고 있어?',
              '어떤 것을 좋아하니?',
              '네 이야기를 기억할게. 아래 버튼으로 첫 인사를 마쳐 보자.',
            ]
          : [
              '왜 그렇게 생각했는지 작은 단서 하나를 알려 줄래?',
              '다른 조건이라면 어떻게 될까? 처음 생각과 비교해 보자.',
              '새롭게 알게 된 점을 내 말로 정리해 볼까?',
              '좋아! 네 생각이 담긴 이야기를 책장에 남겨 보자.',
            ];
        chat.userMessage = { id: id('message'), role: 'USER', content: text };
        chat.assistantMessage = {
          id: id('message'),
          role: 'ASSISTANT',
          content: prompts[Math.min(turn, prompts.length - 1)]!,
          source: 'fallback',
        };
        chat.messages!.push(chat.userMessage, chat.assistantMessage);
        if (chat.profileDraft) {
          if (turn === 0) chat.profileDraft.nickname = text;
          if (turn === 1) chat.profileDraft.schoolOrGroup = text;
          if (turn === 2) chat.profileDraft.interests = [text];
        }
        chat.readiness = { ready: turn >= 2, progress: Math.min(100, (turn + 1) * 34) };
        chat.status = chat.readiness.ready ? 'READY_TO_FINISH' : 'ACTIVE';
        chat.currentInteraction = { type: 'TEXT', questionId: id('question'), options: [] };
        return { ...chat, nextInteraction: chat.currentInteraction };
      }
      if (action === 'complete') {
        if (!chat.readiness.ready) fail(422, '생각을 조금 더 나눈 뒤 마칠 수 있어요.');
        chat.status = 'COMPLETED';
        if (greeting) {
          Object.assign(active(), chat.profileDraft, { needsFirstGreeting: false });
          return { profile: active() };
        }
        const story = makeStory(
          chat.topic?.title ?? '티키와 나눈 생각',
          chat
            .messages!.filter((m) => m.role === 'USER')
            .map((m) => m.content)
            .join('\n\n'),
        );
        story.sourceConversationId = key!;
        state.stories.unshift(story);
        chat.storyId = story.id;
        return { story };
      }
      if (action === 'cancel') chat.status = 'CANCELLED';
      return chat;
    }
    if (route === 'activities')
      return page(
        activities.filter(
          (a) =>
            (!search.get('track') || a.track === search.get('track')) &&
            `${a.title} ${a.tags.join(' ')}`.includes(search.get('query') ?? ''),
        ),
        search,
      );
    if (parts[0] === 'activities') return { activity: find(activities, (a) => a.id === parts[1]) };
    if (route === 'activity-sessions') {
      if (method === 'POST') {
        const session = createActivity(find(activities, (a) => a.id === body.activityId));
        state.sessions.push(session);
        return { session };
      }
      return page(
        state.sessions.filter((s) => !search.get('status') || s.status === search.get('status')),
        search,
      );
    }
    if (parts[0] === 'activity-sessions') {
      const session = find(state.sessions, (s) => s.sessionId === parts[1]);
      if (method !== 'GET') updateActivity(session, parts.slice(2).join('/'), method, body);
      if (parts[2] === 'complete') {
        const story = makeStory(
          session.title,
          (session.draft.answers ?? []).map((a) => a.text).join('\n\n') ||
            String(session.draft.inquiry?.final ?? '모험에서 새로운 생각을 발견했어요.'),
        );
        session.storyId = story.id;
        state.stories.unshift(story);
        return { session, story };
      }
      return { session };
    }
    if (route === 'reports/progress') {
      const days = Number(search.get('period')?.replace('d', '')) || 7;
      const timeline = Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.now() - (days - i - 1) * 86400000).toISOString().slice(0, 10),
        conversations: i % 3 === 0 ? 1 : 0,
        completedStories: i % 3 === 0 ? 1 : 0,
        responses: i % 3 === 0 ? 4 : 0,
      }));
      return {
        profileId: active().id,
        period: period(days),
        activity: {
          activeDays: timeline.filter((t) => t.conversations).length,
          completedStories: state.stories.length,
          continuedStories: 1,
          newWords: state.words.length,
        },
        observedBehaviors: {
          fullSentenceResponses: 9,
          reasonExplanations: 5,
          alternativeIdeas: 3,
          revisedIdeas: 2,
        },
        timeline,
        categoryBreakdown: [],
        notice: '화면 체험을 위한 예시 활동 기록이에요.',
      } satisfies Model<'ProgressResponse'>;
    }
    if (route === 'reports/summaries' && method === 'POST') {
      const summary: Model<'SummaryOut'> = {
        id: id('summary'),
        profileId: active().id,
        period: { from: String(body.from), to: String(body.to) },
        status: 'CURRENT',
        source: 'fallback',
        summary: {
          highlights: ['보이는 모습을 자세히 관찰하고 이유를 표현했어요.'],
          suggestions: ['다음에는 조건 하나만 바꾸어 비교해 보세요.'],
          conversationTips: ['“왜 그렇게 생각했어?”라고 물어봐 주세요.'],
          evidenceStoryIds: state.stories.map((s) => s.id),
        },
        notice: '예시 요약이며 실제 평가가 아니에요.',
        createdAt: at,
        updatedAt: at,
      };
      state.summaries.push(summary);
      return { summary };
    }
    if (route.startsWith('reports/summaries/'))
      return { summary: find(state.summaries, (s) => s.id === parts[2]) };
    if (route === 'guardian/consultations/eligibility')
      return {
        profileId: active().id,
        eligible: false,
        period: at.slice(0, 7),
        reason: '예시 체험에서는 활동 요약을 살펴볼 수 있어요.',
        daysRemaining: 0,
        completedStories: state.stories.length,
        alreadyCreated: false,
      };
    if (route === 'notification-settings') {
      if (method === 'PATCH') Object.assign(state.notificationSettings, body, { updatedAt: at });
      return { settings: state.notificationSettings };
    }
    if (route === 'share-requests' || route === 'guardian/share-requests')
      return page(state.shares, search);
    if (parts[0] === 'share-requests') {
      const shareRequest = find(state.shares, (s) => s.id === parts[1]);
      if (method === 'DELETE') state.shares = state.shares.filter((s) => s.id !== shareRequest.id);
      return { shareRequest };
    }
    if (
      [
        'guardian-links',
        'guardian/consultations',
        'guardian/safety-events',
        'consents',
        'legal-documents',
        'notifications',
      ].includes(route) &&
      method === 'GET'
    )
      return { items: [], nextCursor: null, unreadCount: 0, notice: '확인할 예시 알림이 없어요.' };
    if (route === 'data/overview')
      return {
        profileId: active().id,
        counts: {
          profiles: state.profiles.length,
          conversations: Object.keys(state.chats).length,
          stories: state.stories.length,
          words: state.words.length,
          books: state.books.length,
          activities: state.sessions.length,
        },
        retention: { days: 90 },
        hiddenScopes: [],
        pendingDeletionRequestId: null,
        generatedAt: at,
      };
    if (route === 'service-info')
      return {
        service: '생각친구 티키 · 예시 체험',
        storage: '현재 브라우저 탭',
        aiAvailable: false,
        speechAvailable: false,
        streamingAvailable: false,
      };
    // External services (voice, guardian delivery, account deletion) cannot run offline.
    fail(501, '예시 체험에서는 이 기능을 사용할 수 없어요. 실제 API 연결이 필요해요.');
  }
  return async <T>(path: string, options: RequestInit = {}): Promise<T> => {
    options.signal?.throwIfAborted();
    const key = new Headers(options.headers).get('Idempotency-Key');
    const memoKey = key ? `${options.method ?? 'GET'}:${path}:${key}` : '';
    if (memoKey && memo.has(memoKey)) return structuredClone(memo.get(memoKey)) as T;
    const result = dispatch(path, options);
    try {
      storage?.setItem(MOCK_STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* Keep an in-memory demo if storage is full. */
    }
    if (memoKey) memo.set(memoKey, structuredClone(result));
    // Return a snapshot, just like JSON over HTTP, so cache objects never mutate in place.
    return structuredClone(result) as T;
  };
}
