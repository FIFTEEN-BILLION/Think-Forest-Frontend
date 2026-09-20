export interface GreetingProcessing {
  mode: 'AI' | 'RULES';
  reason?: string | null;
}

/** 서버가 알려 준 처리 상태만 표시한다. 프론트에서 대화나 프로필을 추론하지 않는다. */
export function greetingProcessingNotice(processing?: GreetingProcessing | null): string | null {
  if (!processing || processing.reason === 'guided_step') return null;
  if (processing.mode === 'AI') return '백엔드 AI가 대화를 처리하고 있어요.';
  const reasons: Record<string, string> = {
    child_data_mode_off: 'AI 대화에 필요한 보호자 동의 또는 테스트 계정 설정을 확인해 주세요.',
    no_api_key: '서버에 AI API 키가 설정되지 않았어요.',
    ai_disabled: '서버의 AI 사용 설정이 꺼져 있어요.',
    session_call_limit: '이번 대화의 AI 사용 한도에 도달했어요.',
    daily_limit: '오늘의 AI 사용 한도에 도달했어요.',
    unverified_extraction: '확실하지 않은 내용은 프로필에 담지 않았어요.',
  };
  const detail = processing.reason?.startsWith('ai_error:')
    ? 'AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.'
    : (reasons[processing.reason ?? ''] ?? '현재 AI 대화를 사용할 수 없어요.');
  return `AI 대화 상태를 확인해 주세요. ${detail}`;
}
