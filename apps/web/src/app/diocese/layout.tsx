import { DioceseLayoutClient } from './DioceseLayoutClient';

/** ERP dashboard is auth/client-heavy — never SSG during Docker production builds. */
export const dynamic = 'force-dynamic';

export default function DioceseLayout({ children }: { children: React.ReactNode }) {
  return <DioceseLayoutClient>{children}</DioceseLayoutClient>;
}
