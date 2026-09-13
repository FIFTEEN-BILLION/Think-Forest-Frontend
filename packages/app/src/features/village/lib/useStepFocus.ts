import { useEffect } from 'react';

export function useStepFocus(step: string | number | undefined) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById('main')?.focus({ preventScroll: true });
    window.speechSynthesis?.cancel();
  }, [step]);
}
