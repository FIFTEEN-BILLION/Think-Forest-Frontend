import { useMutation } from '@tanstack/react-query';
import { interpretThought, requestChallenge, teachFriend, useApiClient } from '../api';
import type { ChallengeRequest, InterpretRequest, ShadowMission, TeachRequest } from '../api';
import { isSetup } from '../lib/shadow';

type Input<T> = { body: T; signal: AbortSignal };

export function useInterpretThought(beliefs: ShadowMission['friendBeliefs']) {
  const request = useApiClient();
  return useMutation({
    mutationFn: async ({ body, signal }: Input<InterpretRequest>) => {
      const response = await interpretThought(request, body, signal);
      const belief = beliefs.find((item) => item.id === response.friendBeliefId);
      if (!belief) throw new Error('생각 친구의 응답을 읽지 못했어요.');
      return { response, belief };
    },
  });
}

export function useTeachFriend() {
  const request = useApiClient();
  return useMutation({
    mutationFn: ({ body, signal }: Input<TeachRequest>) => teachFriend(request, body, signal),
  });
}

export function useThinkingChallenge() {
  const request = useApiClient();
  return useMutation({
    mutationFn: async ({ body, signal }: Input<ChallengeRequest>) => {
      const response = await requestChallenge(request, body, signal);
      if (!isSetup(response.challenge.base) || !isSetup(response.challenge.compare))
        throw new Error('새 예측을 읽지 못했어요. 다시 받아 볼까요?');
      return {
        ...response,
        challenge: {
          ...response.challenge,
          base: response.challenge.base,
          compare: response.challenge.compare,
        },
      };
    },
  });
}
