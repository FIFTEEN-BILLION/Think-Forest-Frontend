import { useMutation } from '@tanstack/react-query';
import { scoreRubric, useApiClient } from '../api';
import type { RubricScoreRequest } from '../api';

/** 되물음 게이트에서 아이 답변을 채점하고 다음 되물음을 받는다. */
export function useRubricScore() {
  const request = useApiClient();
  return useMutation({
    mutationFn: (body: RubricScoreRequest) => scoreRubric(request, body),
  });
}
