'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — redirects to Data Import Studio */
export default function MigrationPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/diocese/data-import');
  }, [router]);
  return null;
}
