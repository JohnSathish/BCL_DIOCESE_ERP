'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** Legacy URL → dedicated print surface (no dashboard chrome). */
export default function LegacyCertificatePrintRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (params.id) {
      router.replace(`/print/certificates/${params.id}`);
    }
  }, [params.id, router]);

  return (
    <p className="p-8 text-center text-sm text-stone-500">Opening print view…</p>
  );
}
