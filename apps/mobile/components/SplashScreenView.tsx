import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useParishBrand } from '../lib/parish-brand';

export function SplashScreenView({ onDone }: { onDone?: () => void }) {
  const { config } = useParishBrand();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const finished = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
    ]).start();

    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      onDoneRef.current?.();
    };

    const t = setTimeout(finish, 2200);
    const hard = setTimeout(finish, 3800);
    return () => {
      clearTimeout(t);
      clearTimeout(hard);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LinearGradient
      colors={[config.colors.secondary, '#1a3a5c', config.colors.primary]}
      style={styles.root}
    >
      <View style={styles.glow} />
      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
        <View style={styles.logoWrap}>
          <Image source={config.logo} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.title}>{config.parishName}</Text>
        <Text style={styles.location}>{config.location}</Text>
        <Text style={styles.tagline}>{config.tagline}</Text>
      </Animated.View>
      <Animated.View style={[styles.loader, { opacity }]}>
        <View style={styles.bar} />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(199,154,53,0.14)',
    top: '24%',
  },
  logoWrap: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  logo: { width: 112, height: 112 },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
    maxWidth: 300,
  },
  location: {
    color: '#C79A35',
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  tagline: {
    color: 'rgba(255,255,255,0.82)',
    marginTop: 12,
    fontSize: 14,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  loader: {
    position: 'absolute',
    bottom: 72,
    width: 100,
    height: 3,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  bar: { width: '100%', height: '100%', backgroundColor: '#C79A35' },
});
