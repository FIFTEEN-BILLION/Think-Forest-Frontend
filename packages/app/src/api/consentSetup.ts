import type { Model } from './schema';
import { safeReturnTo } from './v1/chat';

export const START_DOCUMENTS = ['privacy_child', 'ai_conversation'];
export function consentSetupState(
  documents: Model<'LegalDocumentOut'>[],
  consents: Model<'ConsentOut'>[],
) {
  const items = START_DOCUMENTS.flatMap((id) => documents.filter((doc) => doc.id === id));
  const available = START_DOCUMENTS.every(
    (id) => items.filter((doc) => doc.id === id).length === 1,
  );
  const granted =
    available &&
    items.every((doc) =>
      consents.some(
        (consent) =>
          consent.documentId === doc.id &&
          consent.documentVersion === doc.version &&
          consent.current &&
          consent.status === 'GRANTED',
      ),
    );
  return { items, available, granted };
}
export function setupReturnTo(value: string | null) {
  const target = safeReturnTo(value);
  return /^\/(welcome|login|auth)([/?#]|$)/.test(target) ? '/' : target;
}
const deferred = new Set<string>();
export function guestDeferred(key: string) {
  try {
    return deferred.has(key) || sessionStorage.getItem(key) === 'later';
  } catch {
    return deferred.has(key);
  }
}
export function deferGuest(key: string) {
  deferred.add(key);
  try {
    sessionStorage.setItem(key, 'later');
  } catch {
    /* 현재 탭에서는 계속 이용할 수 있다. */
  }
}
