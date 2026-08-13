'use client';

import { useAuthStore } from '@/lib/auth-store';
import { ParishCommandCenter } from '@/components/dashboard/ParishCommandCenter';
import { DioceseDashboardCenter } from '@/components/dashboard/DioceseDashboardCenter';

export default function DioceseDashboardPage() {
  const user = useAuthStore((s) => s.user);
  if (user?.parishId) return <ParishCommandCenter />;
  return <DioceseDashboardCenter />;
}
