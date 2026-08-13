import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, LoadingBlock, Screen } from '../../components/ui';
import { useAuthStore } from '../../lib/auth-store';
import { useAppTheme } from '../../lib/providers';
import { personaFromRoles } from '../../lib/role-nav';
import { brand } from '../../lib/theme';
import { isStaffRole, modulesForRoles } from '../../lib/rbac';
import { api } from '../../lib/api';

const UPDATES = [
  {
    title: 'Parish announcements',
    meta: 'News · Communications',
    href: '/(public)/news',
  },
  {
    title: 'Upcoming events',
    meta: 'Calendar',
    href: '/(public)/events',
  },
  {
    title: "Today's feast & liturgy",
    meta: 'Daily content',
    href: '/(public)/feast',
  },
  {
    title: 'Holy Mass timings',
    meta: 'Schedule',
    href: '/(public)/mass-timings',
  },
] as const;

export default function DirectoryScreen() {
  const { ui, colors } = useAppTheme();
  const session = useAuthStore((s) => s.session);
  const roles = session?.user.roles || [];
  const persona = personaFromRoles(roles);
  const staff = isStaffRole(roles);
  const modules = modulesForRoles(roles);

  const parishes = useQuery({
    queryKey: ['directory-parishes'],
    queryFn: () => api<Array<{ id: string; name: string; village?: string | null; code: string }>>('/parishes'),
    enabled: persona === 'bishop',
  });

  if (persona === 'bishop') {
    return (
      <Screen scroll>
        <Text style={ui.title}>Parishes</Text>
        <Text style={ui.subtitle}>Diocese overview · tap a parish</Text>
        {parishes.isLoading ? <LoadingBlock /> : null}
        <View style={{ marginTop: 8, gap: 10 }}>
          {(parishes.data || []).map((p) => (
            <Link key={p.id} href={'/(app)/diocese' as never} asChild>
              <Pressable
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  padding: 16,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{p.name}</Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                  {p.code}
                  {p.village ? ` · ${p.village}` : ''}
                </Text>
              </Pressable>
            </Link>
          ))}
          {!parishes.isLoading && !(parishes.data || []).length ? (
            <EmptyState title="No parishes" body="Parishes will appear once loaded from the API." />
          ) : null}
          <Link href={'/(app)/diocese' as never} asChild>
            <Pressable style={[ui.button, { marginTop: 4 }]}>
              <Text style={ui.buttonText}>Open Diocese Console</Text>
            </Pressable>
          </Link>
        </View>
      </Screen>
    );
  }

  if (staff || persona === 'priest') {
    return (
      <Screen scroll>
        <Text style={ui.title}>Records</Text>
        <Text style={ui.subtitle}>Parish administration modules</Text>
        <View style={{ marginTop: 8, gap: 10 }}>
          {modules.map((m) => (
            <Link key={m.href} href={m.href as never} asChild>
              <Pressable style={ui.card}>
                <Text style={[ui.cardTitle, { color: brand.burgundy }]}>{m.label}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={ui.title}>Discover</Text>
      <Text style={ui.subtitle}>Parish life · news · liturgy</Text>
      <View style={{ marginTop: 8, gap: 10 }}>
        {UPDATES.map((u) => (
          <Link key={u.href + u.title} href={u.href as never} asChild>
            <Pressable style={ui.card}>
              <Text style={[ui.cardTitle, { color: colors.text }]}>{u.title}</Text>
              <Text style={ui.meta}>{u.meta}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </Screen>
  );
}
