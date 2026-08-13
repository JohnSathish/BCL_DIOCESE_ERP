import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../components/ui';
import { useAppTheme } from '../../lib/providers';
import { useAuthStore } from '../../lib/auth-store';
import { api } from '../../lib/api';
import { canManageDiocese } from '../../lib/rbac';

type OrgLicense = {
  id: string;
  productCode: string;
  seats: number;
  isActive: boolean;
  endsAt?: string | null;
};

type Organization = {
  id: string;
  name: string;
  productCode: string;
  licenses?: OrgLicense[];
  subscriptions?: Array<{ planCode: string; status: string }>;
};

export default function LicensesScreen() {
  const { ui, colors } = useAppTheme();
  const session = useAuthStore((s) => s.session);
  const isAdmin = canManageDiocese(session?.user.roles || []);

  const org = useQuery({
    queryKey: ['mobile-org-license', session?.user.organizationId],
    queryFn: async () => {
      const orgId = session?.user.organizationId;
      if (!orgId) throw new Error('No organization');
      if (isAdmin) {
        return api<Organization>(`/platform/organizations/${orgId}`);
      }
      const profile = await api<{ officialName?: string }>('/diocese/profile');
      return {
        id: orgId,
        name: profile.officialName || 'Diocese',
        productCode: 'DIOCESE_ERP',
        licenses: [],
      } as Organization;
    },
    enabled: Boolean(session?.user.organizationId),
  });

  const data = org.data;

  return (
    <Screen scroll>
      <Text style={ui.title}>Licenses</Text>
      <Text style={ui.subtitle}>{data?.name || 'Organization licensing'}</Text>

      <View style={ui.card}>
        <Text style={[ui.cardTitle, { color: colors.primary }]}>Product</Text>
        <Text style={ui.body}>{data?.productCode?.replace(/_/g, ' ') || 'DIOCESE ERP'}</Text>
      </View>

      {(data?.licenses || []).map((l) => (
        <View key={l.id} style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>{l.productCode.replace(/_/g, ' ')}</Text>
          <Text style={ui.meta}>
            {l.seats} seats · {l.isActive ? 'Active' : 'Inactive'}
            {l.endsAt ? ` · until ${new Date(l.endsAt).toLocaleDateString()}` : ''}
          </Text>
        </View>
      ))}

      {(data?.subscriptions || []).map((s, i) => (
        <View key={i} style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>{s.planCode} plan</Text>
          <Text style={ui.meta}>Status: {s.status}</Text>
        </View>
      ))}

      {!data?.licenses?.length && !data?.subscriptions?.length ? (
        <View style={ui.card}>
          <Text style={ui.body}>
            {isAdmin
              ? 'No license rows returned. Check Platform admin on web.'
              : 'Contact your diocese administrator for seat and plan details.'}
          </Text>
        </View>
      ) : null}
      {org.isLoading ? <Text style={ui.meta}>Loading…</Text> : null}
    </Screen>
  );
}
