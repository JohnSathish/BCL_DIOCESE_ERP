import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut } from '../icons';
import { useAuthStore } from '../../lib/auth-store';
import { useDrawerStore } from '../../lib/drawer-store';
import { useParishStore } from '../../lib/parish-store';
import { useAppTheme } from '../../lib/providers';
import {
  drawerSectionsForPersona,
  type DrawerItem,
  type NavPersona,
} from '../../lib/role-nav';
import { primaryRole, roleLabel } from '../../lib/rbac';
import { brand } from '../../lib/theme';

const DRAWER_WIDTH = Math.min(320, Dimensions.get('window').width * 0.86);

export function NavDrawer({ persona }: { persona: NavPersona }) {
  const open = useDrawerStore((s) => s.open);
  const closeDrawer = useDrawerStore((s) => s.closeDrawer);
  const sections = drawerSectionsForPersona(persona);
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const parish = useParishStore((s) => s.context);
  const slide = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: open ? 0 : -DRAWER_WIDTH,
      useNativeDriver: true,
      friction: 9,
      tension: 65,
    }).start();
  }, [open, slide]);

  if (persona === 'public') return null;

  const onItem = async (item: DrawerItem) => {
    closeDrawer();
    if (item.action === 'logout') {
      await logout();
      router.replace('/(main)' as never);
      return;
    }
    if (item.href) router.push(item.href as never);
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={closeDrawer}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={closeDrawer} />
        <Animated.View
          style={[
            styles.panel,
            {
              width: DRAWER_WIDTH,
              paddingTop: insets.top + 8,
              paddingBottom: insets.bottom + 12,
              backgroundColor: colors.surface,
              transform: [{ translateX: slide }],
            },
          ]}
        >
          <LinearGradient
            colors={persona === 'bishop' ? ['#0F3D91', '#7B1E2B'] : ['#7B1E2B', '#5A1520']}
            style={styles.header}
          >
            <Text style={styles.headerEyebrow}>BCL PARISH APP</Text>
            <Text style={styles.headerName} numberOfLines={1}>
              {session
                ? `${session.user.firstName} ${session.user.lastName}`
                : 'Staff'}
            </Text>
            <Text style={styles.headerMeta} numberOfLines={2}>
              {session ? roleLabel(primaryRole(session.user.roles)) : 'Guest'}
              {' · '}
              {parish?.parishName || parish?.dioceseName || 'Diocese'}
            </Text>
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {sections.map((section) => (
              <View key={section.id} style={styles.section}>
                {section.title ? (
                  <Text style={[styles.sectionTitle, { color: colors.muted }]}>{section.title}</Text>
                ) : null}
                {section.items.map((item) => {
                  const Icon = item.action === 'logout' ? LogOut : item.Icon;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => void onItem(item)}
                      style={[styles.row, { borderColor: colors.border }]}
                    >
                      <View
                        style={[
                          styles.iconWrap,
                          { backgroundColor: `${item.color || brand.burgundy}18` },
                        ]}
                      >
                        {Icon ? (
                          <Icon size={18} color={item.color || brand.burgundy} strokeWidth={2.2} />
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.rowLabel,
                          {
                            color: item.action === 'logout' ? brand.danger : colors.text,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 10, 12, 0.45)',
  },
  panel: {
    height: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 4, height: 0 },
    elevation: 16,
  },
  header: {
    marginHorizontal: 12,
    borderRadius: 18,
    padding: 16,
    marginBottom: 8,
  },
  headerEyebrow: {
    color: brand.goldSoft,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  headerMeta: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  list: { paddingHorizontal: 12, paddingBottom: 24, gap: 4 },
  section: { marginTop: 10, gap: 4 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
});
