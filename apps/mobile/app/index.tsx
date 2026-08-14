import { useCallback, useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { SplashScreenView } from '../components/SplashScreenView';
import { useAuthStore } from '../lib/auth-store';
import { useParishStore } from '../lib/parish-store';
import { isDedicatedParishApp } from '../lib/parish-app-config';
import { homeHrefForRoles } from '../lib/rbac';

export default function Index() {
  const [splashDone, setSplashDone] = useState(false);
  const [forceContinue, setForceContinue] = useState(false);
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);
  const parishReady = useParishStore((s) => s.ready);
  const parish = useParishStore((s) => s.context);

  const onSplashDone = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    const t = setTimeout(() => {
      setSplashDone(true);
      setForceContinue(true);
    }, 4500);
    return () => clearTimeout(t);
  }, []);

  const bootReady = (ready && parishReady) || forceContinue;

  if (!splashDone || !bootReady) {
    return <SplashScreenView onDone={onSplashDone} />;
  }

  if (!parish && !isDedicatedParishApp()) {
    return <Redirect href={'/onboarding/select-diocese' as never} />;
  }

  if (session) {
    return <Redirect href={homeHrefForRoles(session.user.roles) as never} />;
  }

  return <Redirect href={'/(main)' as never} />;
}
