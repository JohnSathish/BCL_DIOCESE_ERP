'use client';

import Link from 'next/link';
import { Button, Card, CardContent, PageHeader } from '@bcl/ui';
import { useAuthStore } from '@/lib/auth-store';

/** Parish-scoped entry — same tools, locked to the signed-in parish. */
export default function ParishAppControlPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <PageHeader
        title="Parish App Control Center"
        description={`${user?.parishId ? 'Managing your parish app content & notifications' : 'Select a parish-scoped login to manage parish app content'}`}
        actions={
          <Link href="/diocese/app-control">
            <Button variant="secondary">Diocese overview</Button>
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-4">
            <h3 className="font-semibold">Compose for this parish</h3>
            <p className="mt-1 text-sm text-slate-600">
              Target only your parish families, priests, or catechism groups. You cannot broadcast diocese-wide.
            </p>
            <Link href="/diocese/app-control/composer?scope=parish">
              <Button className="mt-3">Open composer</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <h3 className="font-semibold">Mobile CMS</h3>
            <p className="mt-1 text-sm text-slate-600">
              Update hero, gospel, mass schedule, contacts — appears instantly in the Android app.
            </p>
            <Link href="/diocese/app-control/mobile-cms?scope=parish">
              <Button className="mt-3" variant="secondary">
                Edit Mobile CMS
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
