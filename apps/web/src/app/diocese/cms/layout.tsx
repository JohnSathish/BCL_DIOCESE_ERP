'use client';

import { CmsShell } from '@/components/cms/CmsShell';

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return <CmsShell>{children}</CmsShell>;
}
