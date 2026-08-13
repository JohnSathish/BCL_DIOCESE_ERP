import { Link, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { GlassHeader, ModuleGrid, Screen } from '../../components/ui';
import { useAuthStore } from '../../lib/auth-store';
import { useAppTheme } from '../../lib/providers';
import { PUBLIC_MODULES, modulesForRoles, roleLabel, primaryRole } from '../../lib/rbac';

/** Legacy public browse route — prefer /(main) Home. No large staff login CTA. */
export default function PublicHome() {
  const { colors, ui } = useAppTheme();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const role = primaryRole(session?.user.roles || []);
  const modules = session ? modulesForRoles(session.user.roles) : PUBLIC_MODULES;

  return (
    <Screen scroll>
      <GlassHeader
        title="About this parish"
        subtitle="Mass timings, news, gospel, gallery, and parish contact — open to everyone."
        right={
          <Pressable
            onPress={() => router.push('/(main)/profile' as never)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel="Open profile"
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>👤</Text>
          </Pressable>
        }
      />

      <View style={ui.card}>
        <Text style={ui.cardTitle}>
          {session ? `Welcome, ${session.user.firstName}` : 'Parish information'}
        </Text>
        <Text style={ui.body}>
          {session
            ? `Signed in as ${roleLabel(role)}. Manage your account from the Profile tab.`
            : 'Explore Mass schedules, events, and parish life. Sign in from the Profile tab when you need family or staff access.'}
        </Text>
        {session ? (
          <Pressable
            style={[ui.button, ui.secondary, { marginTop: 8 }]}
            onPress={async () => {
              await logout();
              router.replace('/(main)/profile' as never);
            }}
          >
            <Text style={ui.secondaryText}>Sign out</Text>
          </Pressable>
        ) : (
          <Link href={'/(main)/profile' as never} asChild>
            <Pressable style={[ui.button, ui.secondary, { marginTop: 8 }]}>
              <Text style={ui.secondaryText}>Open Profile to sign in</Text>
            </Pressable>
          </Link>
        )}
      </View>

      <Text style={[ui.section, { color: colors.primary }]}>Public parish services</Text>
      <ModuleGrid modules={session ? modules.slice(0, 12) : PUBLIC_MODULES} />

      {!session ? (
        <View style={ui.card}>
          <Text style={ui.cardTitle}>Choose Diocese & Parish</Text>
          <Text style={ui.body}>
            Search parishes across the diocese, open maps, and view priest contacts.
          </Text>
          <Link href={'/(public)/parishes' as never} asChild>
            <Pressable style={[ui.button, { marginTop: 8 }]}>
              <Text style={ui.buttonText}>Browse Parishes</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}
    </Screen>
  );
}
