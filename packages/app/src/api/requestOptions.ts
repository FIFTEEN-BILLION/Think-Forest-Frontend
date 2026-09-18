import { ApiError } from './client';

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    try {
      const body = JSON.parse(error.body) as { error?: { message?: string; code?: string } };
      const explanations: Record<string, string> = {
        WORD_EXPLANATION_UNAVAILABLE:
          '아직 이 단어의 뜻을 가져올 수 없어요. 다른 단어로 시도해 주세요.',
        REAUTHENTICATION_REQUIRED: '다시 로그인한 뒤 5분 안에 시도해 주세요.',
        LAST_GUARDIAN:
          '아이를 관리하는 마지막 보호자예요. 다른 보호자를 연결한 뒤 삭제할 수 있어요.',
        STALE_SHARE_VERSION: '이야기가 수정되었어요. 아이가 새 내용으로 다시 공유를 요청해야 해요.',
        ACCOUNT_PENDING_DELETION: '계정 삭제 대기 중이에요. 기록 관리에서 삭제를 취소할 수 있어요.',
        INSUFFICIENT_WORDS: '퀴즈를 시작하려면 단어를 먼저 보관해 주세요.',
      };
      if (body.error?.code && explanations[body.error.code]) return explanations[body.error.code]!;
      return body.error?.message ?? '요청을 처리하지 못했어요.';
    } catch {
      return '서버 응답을 확인하지 못했어요.';
    }
  }
  return error instanceof Error ? error.message : '연결을 확인하고 다시 시도해 주세요.';
}

export function json(body: unknown, method = 'POST', version?: number): RequestInit {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(method === 'POST' ? { 'Idempotency-Key': crypto.randomUUID() } : {}),
      ...(version !== undefined ? { 'If-Match': `"${version}"` } : {}),
    },
    body: JSON.stringify(body),
  };
}
