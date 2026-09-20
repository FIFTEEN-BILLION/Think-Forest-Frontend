import { Navigate } from 'react-router-dom';
import { useBackend } from '../providers/BackendProvider';
import { ConsentSetup } from './OnboardingScreen';

export function GuestConsentScreen() {
  const { me, scopeId } = useBackend();
  if (me?.user.role !== 'GUEST') return <Navigate replace to="/guardian/consent" />;
  return <ConsentSetup key={scopeId} manage />;
}
