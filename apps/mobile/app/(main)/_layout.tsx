import { Redirect, Tabs } from 'expo-router';
import type { ComponentType } from 'react';
import { View } from 'react-native';
import { AppShell, useIsTabletShell } from '../../components/shell/AppShell';
import { QuickFab } from '../../components/QuickFab';
import type { AppIconProps } from '../../components/icons';
import { useAuthStore } from '../../lib/auth-store';
import { useParishStore } from '../../lib/parish-store';
import { useAppTheme } from '../../lib/providers';
import { useParishBrand } from '../../lib/parish-brand';
import { isDedicatedParishApp } from '../../lib/parish-app-config';
import { personaFromRoles, tabsForPersona, type NavTabDef } from '../../lib/role-nav';

function TabIcon({
  Icon,
  focused,
  activeColor,
}: {
  Icon: ComponentType<AppIconProps>;
  focused: boolean;
  activeColor: string;
}) {
  return (
    <Icon
      size={focused ? 22 : 20}
      color={focused ? activeColor : '#94A3B8'}
      strokeWidth={focused ? 2.4 : 2}
    />
  );
}

export default function MainTabsLayout() {
  const { colors } = useAppTheme();
  const { config } = useParishBrand();
  const session = useAuthStore((s) => s.session);
  const parishReady = useParishStore((s) => s.ready);
  const parish = useParishStore((s) => s.context);
  const persona = personaFromRoles(session?.user.roles || [], Boolean(session));
  const tabs = tabsForPersona(persona);
  const bySlot = Object.fromEntries(tabs.map((t) => [t.slot, t])) as Partial<Record<string, NavTabDef>>;
  const isTablet = useIsTabletShell(persona);
  const showFab = persona === 'priest';
  const activeColor = config.colors.primary;
  const isPublic = persona === 'public';

  if (parishReady && !parish && !isDedicatedParishApp()) {
    return <Redirect href={'/onboarding/select-diocese' as never} />;
  }

  const tabOpts = (tab?: NavTabDef) => ({
    title: tab?.title || '',
    headerShown: false,
    href: (tab?.href ?? undefined) as never,
    tabBarIcon: tab
      ? ({ focused }: { focused: boolean }) => (
          <TabIcon Icon={tab.Icon} focused={focused} activeColor={activeColor} />
        )
      : undefined,
  });

  const hidden = { href: null as never, headerShown: false };

  return (
    <AppShell persona={persona} fab={showFab ? <QuickFab /> : null}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: activeColor,
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
        <Tabs.Screen name="mass" options={isPublic ? tabOpts(bySlot.mass) : hidden} />
        <Tabs.Screen name="events" options={isPublic ? tabOpts(bySlot.events) : hidden} />
        <Tabs.Screen name="prayers" options={isPublic ? tabOpts(bySlot.prayers) : hidden} />
        <Tabs.Screen name="more" options={isPublic ? tabOpts(bySlot.more) : hidden} />
        <Tabs.Screen name="calendar" options={!isPublic ? tabOpts(bySlot.calendar) : hidden} />
        <Tabs.Screen name="directory" options={!isPublic ? tabOpts(bySlot.directory) : hidden} />
        <Tabs.Screen name="notifications" options={!isPublic ? tabOpts(bySlot.notifications) : hidden} />
        <Tabs.Screen name="profile" options={!isPublic ? tabOpts(bySlot.profile) : hidden} />
        <Tabs.Screen name="sacraments" options={hidden} />
        <Tabs.Screen name="directory-public" options={hidden} />
        <Tabs.Screen name="about" options={{ ...hidden, title: 'About', headerShown: true }} />
      </Tabs>
    </AppShell>
  );
}
