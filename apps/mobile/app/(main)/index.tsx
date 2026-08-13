import { BishopHome, ParishionerHome, PriestHome } from '../../components/RoleHomes';
import { useAuthStore } from '../../lib/auth-store';
import { dashboardKindForRoles } from '../../lib/rbac';

export default function MainHomeScreen() {
  const session = useAuthStore((s) => s.session);
  const kind = dashboardKindForRoles(session?.user.roles || []);

  if (kind === 'bishop' || kind === 'admin') return <BishopHome />;
  if (kind === 'priest') return <PriestHome />;
  return <ParishionerHome />;
}
