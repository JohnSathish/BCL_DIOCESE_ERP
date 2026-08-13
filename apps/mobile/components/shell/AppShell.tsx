import { useWindowDimensions, View } from 'react-native';
import type { ReactNode } from 'react';
import { NavDrawer } from './NavDrawer';
import { TabletSidebar } from './TabletSidebar';
import type { NavPersona } from '../../lib/role-nav';

export const TABLET_BREAKPOINT = 900;

export function AppShell({
  persona,
  children,
  fab,
}: {
  persona: NavPersona;
  children: ReactNode;
  fab?: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const isTablet = width > TABLET_BREAKPOINT && persona !== 'public';

  if (isTablet) {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <TabletSidebar persona={persona} />
        <View style={{ flex: 1 }}>{children}</View>
        {fab}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {children}
      <NavDrawer persona={persona} />
      {fab}
    </View>
  );
}

export function useIsTabletShell(persona: NavPersona) {
  const { width } = useWindowDimensions();
  return width > TABLET_BREAKPOINT && persona !== 'public';
}
