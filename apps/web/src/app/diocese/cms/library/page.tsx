'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CmsDigitalLibraryPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/diocese/cms/media?folder=library');
  }, [router]);
  return <p className="text-sm text-[var(--bcl-muted)]">Opening digital library…</p>;
}
