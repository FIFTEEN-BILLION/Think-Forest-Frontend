/** 현재 계정의 이어하기 정보와 기기에 남은 테스트 초안만 제거한다. */
export function clearResetStorage(storage: Storage, userId: string) {
  const legacyKeys = new Set([
    'jaram_village_react_v1',
    'jjcp.activitySessions',
    'jjcp.guardian.profileId',
    'jjcp-kakao-return-to',
    `jjcp-account-delete-${userId}`,
  ]);
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
  for (const key of keys) {
    if (
      key &&
      (legacyKeys.has(key) ||
        key.startsWith(`jjcp-active-${userId}:`) ||
        key.startsWith(`jjcp-quiz-${userId}:`))
    ) {
      storage.removeItem(key);
    }
  }
}
