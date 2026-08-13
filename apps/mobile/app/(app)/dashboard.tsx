import { Link, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { GlassHeader, KpiCard, ModuleGrid, Screen } from '../../components/ui';
import { useAuthStore } from '../../lib/auth-store';
import { api } from '../../lib/api';
import { useAppTheme } from '../../lib/providers';
import {
  canManageDiocese,
  canManageFinance,
  modulesForRoles,
  primaryRole,
  roleLabel,
} from '../../lib/rbac';
import { brand } from '../../lib/theme';

export default function DashboardScreen() {
  const { ui, colors } = useAppTheme();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const roles = session?.user.roles || [];
  const role = primaryRole(roles);
  const modules = modulesForRoles(roles);
  const isBishopish = canManageDiocese(roles);

  const parishDash = useQuery({
    queryKey: ['mobile-parish-dash'],
    queryFn: () => api<Record<string, unknown>>('/parishes/me/dashboard'),
    enabled: Boolean(session?.user.parishId) && !isBishopish,
  });

  const dioceseDash = useQuery({
    queryKey: ['mobile-diocese-dash'],
    queryFn: () => api<Record<string, number>>('/diocese/dashboard'),
    enabled: isBishopish,
  });

  const d = parishDash.data;
  const families = Number(d?.families ?? dioceseDash.data?.families ?? 0);
  const members = Number(d?.members ?? dioceseDash.data?.members ?? 0);
  const pending = Number(d?.pendingCertificates ?? 0);
  const collection = Number(d?.todaysCollection ?? 0);

  return (
    <Screen scroll>
      <GlassHeader
        title={
          role === 'BISHOP'
            ? 'Diocese Dashboard'
            : role === 'DIOCESE_ADMINISTRATOR'
              ? 'Admin Console'
              : 'Parish Dashboard'
        }
        subtitle={`${roleLabel(role)} · ${session?.user.firstName} ${session?.user.lastName}`}
        right={
          <Link href={'/(public)/home' as never} asChild>
            <Pressable
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Public</Text>
            </Pressable>
          </Link>
        }
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <KpiCard label="Families" value={families} hint="Register" color={brand.burgundy} />
        <KpiCard label="Members" value={members} hint="Catholics" color={brand.royal} />
        <KpiCard label="Certificates" value={pending} hint="Pending" color="#8a6a2f" />
        {canManageFinance(roles) ? (
          <KpiCard
            label="Collection"
            value={`₹${collection.toLocaleString('en-IN')}`}
            hint="Today"
            color="#166534"
          />
        ) : (
          <KpiCard label="Approvals" value={pending + 2} hint="Queue" color="#059669" />
        )}
      </View>

      {isBishopish ? (
        <View style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>Diocese pulse</Text>
          <Text style={ui.body}>
            Parishes {dioceseDash.data?.parishes ?? '—'} · Baptisms {dioceseDash.data?.baptisms ?? '—'} ·
            Marriages {dioceseDash.data?.marriages ?? '—'}
          </Text>
          <Link href={'/(app)/diocese' as never} asChild>
            <Pressable style={[ui.button, { marginTop: 8 }]}>
              <Text style={ui.buttonText}>Open Diocese Overview</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <View style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>Today&apos;s priorities</Text>
          <Text style={ui.body}>
            · Review pending certificates{'\n'}
            · Check mass intentions{'\n'}
            · Respond to prayer requests{'\n'}
            · Open AI brief for a parish summary
          </Text>
        </View>
      )}

      <Text style={[ui.section, { color: colors.primary }]}>Modules for your role</Text>
      <ModuleGrid modules={modules} />

      <Pressable
        style={[ui.button, ui.secondary]}
        onPress={async () => {
          await logout();
          router.replace('/(public)/home' as never);
        }}
      >
        <Text style={ui.secondaryText}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}
