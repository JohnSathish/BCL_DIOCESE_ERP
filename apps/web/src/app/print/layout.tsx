import type { Metadata } from 'next';
import './print.css';

export const metadata: Metadata = {
  title: 'Print Certificate · BCL Diocese ERP',
  robots: { index: false, follow: false },
};

/**
 * Dedicated print surface — no sidebar, top bar, or dashboard chrome.
 * Used by /print/certificates/[id] and similar certificate print routes.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="bcl-print-root">{children}</div>;
}
