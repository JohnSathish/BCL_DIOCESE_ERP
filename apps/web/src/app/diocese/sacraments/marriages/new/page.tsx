'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MarriageWizard } from '@/components/marriage-register/MarriageWizard';

function NewMarriageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  useEffect(() => {
    if (id) router.replace(`/diocese/sacraments/marriages/${id}/edit`);
  }, [id, router]);

  if (id) return null;
  return <MarriageWizard />;
}

export default function NewMarriagePage() {
  return (
    <Suspense fallback={null}>
      <NewMarriageInner />
    </Suspense>
  );
}
