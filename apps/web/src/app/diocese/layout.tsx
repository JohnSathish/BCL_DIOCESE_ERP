'use client';

import { usePathname } from 'next/navigation';
import { DioceseShell } from '@/components/diocese-shell';
import '../print/print.css';

/**
 * Skip DioceseShell on print routes so dashboard chrome never appears
 * in browser print / PDF output.
 */
export default function DioceseLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const barePrint =
    pathname.includes('/print') ||
    pathname.includes('/baptism-preview');

  if (barePrint) {
    return <div className="bcl-print-root">{children}</div>;
  }

  return <DioceseShell>{children}</DioceseShell>;
}
