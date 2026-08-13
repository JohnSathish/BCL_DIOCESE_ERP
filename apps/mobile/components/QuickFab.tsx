import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from '../lib/theme';

const ACTIONS = [
  { icon: '👨', label: 'New Family', href: '/(app)/families' },
  { icon: '🕊', label: 'New Baptism', href: '/(app)/baptisms' },
  { icon: '💍', label: 'New Marriage', href: '/(app)/marriages' },
  { icon: '💰', label: 'New Donation', href: '/donations' },
  { icon: '📜', label: 'New Certificate', href: '/certificates' },
  { icon: '🕯', label: 'Mass Intention', href: '/(app)/schedule' },
] as const;

export function QuickFab() {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(spin, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
    }).start();
  }, [open, spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <>
      <Pressable
        accessibilityLabel="Quick create"
        onPress={() => setOpen(true)}
        style={[styles.fab, { bottom: Math.max(insets.bottom, 12) + 56 }]}
      >
        <Animated.Text style={[styles.fabPlus, { transform: [{ rotate }] }]}>+</Animated.Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { marginBottom: Math.max(insets.bottom, 16) + 80 }]}>
            <Text style={styles.sheetTitle}>Create new</Text>
            {ACTIONS.map((a) => (
              <Pressable
                key={a.label}
                style={styles.actionRow}
                onPress={() => {
                  setOpen(false);
                  router.push(a.href as never);
                }}
              >
                <View style={styles.actionIcon}>
                  <Text style={{ fontSize: 18 }}>{a.icon}</Text>
                </View>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: brand.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: brand.burgundyDeep,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 50,
  },
  fabPlus: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '400',
    lineHeight: 34,
    marginTop: -2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 12, 0.45)',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 16,
    gap: 4,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: brand.burgundy,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: brand.burgundySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f1520',
  },
});
