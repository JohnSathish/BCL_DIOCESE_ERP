import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { brand } from '../lib/theme';

export function SplashScreenView({ onDone }: { onDone?: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const pulse = useRef(new Animated.Value(0.4)).current;
  const cross = useRef(new Animated.Value(0)).current;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const finished = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(cross, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      onDoneRef.current?.();
    };

    // Always advance — do not depend on unstable parent callbacks
    const t = setTimeout(finish, 1600);
    const hard = setTimeout(finish, 3200);

    return () => {
      clearTimeout(t);
      clearTimeout(hard);
      loop.stop();
    };
    // Intentionally mount-once: parent re-renders must not reset the splash timer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LinearGradient colors={['#0B1220', '#1e3a5f', '#7A1F2A']} style={styles.root}>
      <View style={styles.glow} />
      <Animated.View style={{ opacity: cross, position: 'absolute', top: '22%' }}>
        <Text style={{ fontSize: 64, color: 'rgba(200,163,77,0.35)' }}>✝</Text>
      </Animated.View>
      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>BCL</Text>
        </View>
        <Text style={styles.title}>BCL Parish App</Text>
        <Text style={styles.sub}>Faith. Community. Service.</Text>
        <Text style={styles.diocese}>Roman Catholic Diocese of Tura</Text>
      </Animated.View>
      <Animated.View style={[styles.loader, { opacity: pulse }]}>
        <View style={styles.bar} />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(200,163,77,0.16)',
    top: '26%',
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(200,163,77,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  logoText: { color: brand.goldSoft, fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.4 },
  sub: { color: 'rgba(255,255,255,0.8)', marginTop: 8, fontSize: 15, textAlign: 'center' },
  diocese: { color: brand.gold, marginTop: 10, fontSize: 12, fontWeight: '700' },
  loader: {
    position: 'absolute',
    bottom: 72,
    width: 120,
    height: 4,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  bar: { width: '55%', height: '100%', backgroundColor: brand.gold },
});
