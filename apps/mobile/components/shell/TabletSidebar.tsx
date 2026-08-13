import { router, usePathname } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu } from '../icons';
import { useAuthStore } from '../../lib/auth-store';
import { useAppTheme } from '../../lib/providers';
import {
  drawerSectionsForPersona,
  flattenDrawerItems,
  type DrawerItem,
  type NavPersona,
} from '../../lib/role-nav';
import { brand } from '../../lib/theme';

const EXPANDED = 248;
const COLLAPSED = 72;

export function TabletSidebar({ persona }: { persona: NavPersona }) {
  const [expanded, setExpanded] = useState(true);
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const logout = useAuthStore((s) => s.logout);
  const pathname = usePathname();
  const items = flattenDrawerItems(drawerSectionsForPersona(persona)).filter(
    (i) => i.href || i.action === 'logout',
  );

  const onItem = async (item: DrawerItem) => {
    if (item.action === 'logout') {
      await logout();
      router.replace('/(main)' as never);
      return;
    }
    if (item.href) router.push(item.href as never);
  };

  const width = expanded ? EXPANDED : COLLAPSED;

  return (
    <View
      style={[
        styles.rail,
        {
          width,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
          backgroundColor: colors.surface,
          borderRightColor: colors.border,
        },
      ]}
    >
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.toggle}>
        <Menu size={20} color={brand.burgundy} />
        {expanded ? (
          <Text style={[styles.brand, { color: brand.burgundy }]}>BCL Parish</Text>
        ) : null}
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
        {items.map((item) => {
          const Icon = item.Icon;
          const active = item.href ? pathnameIncludes(pathname, item.href) : false;
          return (
            <Pressable
              key={item.id}
              onPress={() => void onItem(item)}
              style={[
                styles.item,
                active && { backgroundColor: brand.burgundySoft },
                !expanded && styles.itemCollapsed,
              ]}
            >
              {Icon ? (
                <Icon
                  size={20}
                  color={active ? brand.burgundy : item.color || colors.muted}
                  strokeWidth={2.2}
                />
              ) : null}
              {expanded ? (
                <Text
                  style={[
                    styles.label,
                    { color: active ? brand.burgundy : colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function pathnameIncludes(pathname: string, href: string) {
  const clean = href.replace('/(main)', '').replace('/(app)', '').replace(/^\//, '');
  if (!clean) return pathname === '/' || pathname.endsWith('/index');
  return pathname.includes(clean.split('/')[0] || clean);
}

const styles = StyleSheet.create({
  rail: {
    borderRightWidth: 1,
    paddingHorizontal: 10,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  brand: { fontWeight: '800', fontSize: 15 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  itemCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  label: { fontSize: 14, fontWeight: '700', flex: 1 },
});
