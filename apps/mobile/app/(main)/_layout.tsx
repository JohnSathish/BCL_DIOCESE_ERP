import { Redirect, Tabs } from 'expo-router';
import type { ComponentType } from 'react';
import { Text, View } from 'react-native';
import { AppShell, useIsTabletShell } from '../../components/shell/AppShell';
import { QuickFab } from '../../components/QuickFab';
import type { AppIconProps } from '../../components/icons';
import { useAuthStore } from '../../lib/auth-store';
import { useParishStore } from '../../lib/parish-store';
import { useAppTheme } from '../../lib/providers';
import { personaFromRoles, tabsForPersona, type NavTabDef } from '../../lib/role-nav';
import { brand } from '../../lib/theme';

const UNREAD_UPDATES = 2;

function TabIcon({
  Icon,
  focused,
  badge,
}: {
  Icon: ComponentType<AppIconProps>;
  focused: boolean;
  badge?: boolean;
}) {
  return (
    <View>
      <Icon
        size={focused ? 22 : 20}
        color={focused ? brand.burgundy : '#94A3B8'}
        strokeWidth={focused ? 2.4 : 2}
      />
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: -3,
            right: -8,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: brand.burgundy,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 3,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{UNREAD_UPDATES}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function MainTabsLayout() {
  const { colors } = useAppTheme();
  const session = useAuthStore((s) => s.session);
  const parishReady = useParishStore((s) => s.ready);
  const parish = useParishStore((s) => s.context);
  const persona = personaFromRoles(session?.user.roles || [], Boolean(session));
  const tabs = tabsForPersona(persona);
  const bySlot = Object.fromEntries(tabs.map((t) => [t.slot, t])) as Record<string, NavTabDef>;
  const isTablet = useIsTabletShell(persona);
  const showFab = persona === 'priest';

  if (parishReady && !parish) {
    return <Redirect href={'/onboarding/select-diocese' as never} />;
  }

  const tabOpts = (tab: NavTabDef) => ({
    title: tab.title,
    headerShown: tab.headerShown !== false,
    ...(tab.href ? { href: tab.href as never } : {}),
    tabBarIcon: ({ focused }: { focused: boolean }) => (
      <TabIcon Icon={tab.Icon} focused={focused} badge={tab.badge} />
    ),
  });

  return (
    <AppShell persona={persona} fab={showFab ? <QuickFab /> : null}>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '700' },
          tabBarActiveTintColor: brand.burgundy,
          tabBarInactiveTintColor: '#94A3B8',
          tabBarStyle: isTablet
            ? { display: 'none' }
            : {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                height: 68,
                paddingBottom: 10,
                paddingTop: 8,
              },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        }}
      >
        <Tabs.Screen name="index" options={tabOpts(bySlot.index)} />
        <Tabs.Screen name="calendar" options={tabOpts(bySlot.calendar)} />
        <Tabs.Screen name="directory" options={tabOpts(bySlot.directory)} />
        <Tabs.Screen name="notifications" options={tabOpts(bySlot.notifications)} />
        <Tabs.Screen name="profile" options={tabOpts(bySlot.profile)} />
      </Tabs>
    </AppShell>
  );
}
