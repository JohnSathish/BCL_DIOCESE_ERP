'use client';

import { useParams } from 'next/navigation';
import { MarriageWizard } from '@/components/marriage-register/MarriageWizard';

export default function EditMarriagePage() {
  const params = useParams<{ id: string }>();
  return <MarriageWizard editId={params.id} />;
}
