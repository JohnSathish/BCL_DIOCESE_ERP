import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { z } from 'zod';
import { Screen } from '../components/ui';
import { useAuthStore } from '../lib/auth-store';
import { getApiBase } from '../lib/api';
import { useParishStore } from '../lib/parish-store';
import { useAppTheme } from '../lib/providers';
import { dashboardKindForRoles, homeHrefForRoles } from '../lib/rbac';
import { brand } from '../lib/theme';
import { registerForPushNotifications } from '../lib/notifications';

const schema = z.object({
  identifier: z.string().min(3, 'Enter email or mobile'),
  password: z.string().optional(),
  otp: z.string().optional(),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;
type LoginIntent = 'family' | 'priest' | 'diocese' | 'general';

const INTENT_META: Record<
  LoginIntent,
  { title: string; subtitle: string; email: string; password: string }
> = {
  family: {
    title: 'Family Login',
    subtitle: 'Access family records, sacraments, certificates & donations',
    email: '',
    password: '',
  },
  priest: {
    title: 'Parish Staff Login',
    subtitle: 'Priest · Assistant Priest · Parish office',
    email: '',
    password: '',
  },
  diocese: {
    title: 'Diocese Login',
    subtitle: 'Bishop · Diocese Administrator · Chancery',
    email: '',
    password: '',
  },
  general: {
    title: 'Sign in',
    subtitle: 'Secure access for families and parish staff',
    email: '',
    password: '',
  },
};

function parseIntent(raw: string | string[] | undefined): LoginIntent {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === 'family' || v === 'priest' || v === 'diocese') return v;
  return 'general';
}

export default function LoginScreen() {
  const { ui, colors } = useAppTheme();
  const login = useAuthStore((s) => s.login);
  const biometricLogin = useAuthStore((s) => s.biometricLogin);
  const parish = useParishStore((s) => s.context);
  const router = useRouter();
  const params = useLocalSearchParams<{ intent?: string }>();
  const intent = useMemo(() => parseIntent(params.intent), [params.intent]);
  const meta = INTENT_META[intent];
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [loading, setLoading] = useState(false);
  const [apiBase, setApiBase] = useState(getApiBase);

  useEffect(() => {
    // HostUri can appear shortly after Expo Go connects — refresh displayed API URL.
    const t = setInterval(() => setApiBase(getApiBase()), 1500);
    setApiBase(getApiBase());
    return () => clearInterval(t);
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      identifier: meta.email,
      password: meta.password,
      remember: true,
    },
  });

  useEffect(() => {
    reset({
      identifier: meta.email,
      password: meta.password,
      remember: true,
    });
  }, [intent, meta.email, meta.password, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (mode === 'otp') {
      setError('root', {
        message:
          'OTP login will activate with the SMS gateway. Use password / email for JWT login now.',
      });
      return;
    }
    if (!values.password) {
      setError('password', { message: 'Password required' });
      return;
    }
    setLoading(true);
    try {
      const email = values.identifier.trim();
      const session = await login(email, values.password);
      void registerForPushNotifications();
      const kind = dashboardKindForRoles(session.user.roles);
      const roleHint =
        kind === 'bishop' || kind === 'admin'
          ? 'Opening diocese dashboard'
          : kind === 'priest'
            ? 'Opening parish priest dashboard'
            : 'Opening your family profile';
      Alert.alert(
        'Welcome',
        `${session.user.firstName} ${session.user.lastName}\n${parish?.parishName || 'Parish'}\n${roleHint}`,
      );
      router.replace(homeHrefForRoles(session.user.roles) as never);
    } catch (e) {
      setError('root', {
        message: e instanceof Error ? e.message : 'Login failed',
      });
    } finally {
      setLoading(false);
    }
  });

  return (
    <Screen scroll>
      <LinearGradient
        colors={
          intent === 'diocese'
            ? ['#0F3D91', '#1E3A5F']
            : intent === 'priest'
              ? ['#5A1520', '#7A1F2A']
              : ['#7B1E2B', '#0F3D91']
        }
        style={{ borderRadius: 18, padding: 18 }}
      >
        <Text style={{ color: brand.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
          {parish?.parishName?.toUpperCase() || 'PARISH LOGIN'}
        </Text>
        <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 4 }}>
          {meta.title}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 6, fontSize: 13 }}>
          {meta.subtitle}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 8, fontSize: 12 }}>
          {parish?.parishName || 'Select a parish'} · API {apiBase.replace(/^https?:\/\//, '')}
        </Text>
      </LinearGradient>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['password', 'otp'] as const).map((m) => (
          <Pressable
            key={m}
            style={[ui.button, mode !== m && ui.secondary, { flex: 1 }]}
            onPress={() => setMode(m)}
          >
            <Text style={mode === m ? ui.buttonText : ui.secondaryText}>
              {m === 'password' ? 'Email / Password' : 'OTP'}
            </Text>
          </Pressable>
        ))}
      </View>

      {errors.root?.message ? <Text style={ui.error}>{errors.root.message}</Text> : null}

      <Controller
        control={control}
        name="identifier"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={ui.input}
            autoCapitalize="none"
            autoCorrect={false}
            value={value}
            onChangeText={onChange}
            placeholder="Email · Username · Mobile"
            placeholderTextColor={colors.muted}
          />
        )}
      />
      {errors.identifier ? <Text style={ui.error}>{errors.identifier.message}</Text> : null}

      {mode === 'password' ? (
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={ui.input}
              secureTextEntry
              value={value}
              onChangeText={onChange}
              placeholder="Password"
              placeholderTextColor={colors.muted}
            />
          )}
        />
      ) : (
        <Controller
          control={control}
          name="otp"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={ui.input}
              keyboardType="number-pad"
              value={value}
              onChangeText={onChange}
              placeholder="Enter OTP"
              placeholderTextColor={colors.muted}
            />
          )}
        />
      )}

      <Pressable
        style={[ui.button, loading && ui.buttonDisabled]}
        onPress={onSubmit}
        disabled={loading}
      >
        <Text style={ui.buttonText}>
          {loading ? 'Signing in…' : mode === 'otp' ? 'Send / Verify OTP' : 'Sign in'}
        </Text>
      </Pressable>

      <Pressable
        style={[ui.button, ui.secondary]}
        onPress={async () => {
          const ok = await biometricLogin();
          if (ok) {
            void registerForPushNotifications();
            router.replace(useAuthStore.getState().homeHref() as never);
          } else {
            Alert.alert(
              'Biometric',
              'Unlock failed or no saved session. Sign in with password first.',
            );
          }
        }}
      >
        <Text style={ui.secondaryText}>Face ID / Fingerprint</Text>
      </Pressable>

      <Pressable
        style={[ui.button, ui.secondary]}
        onPress={() => router.replace('/(main)' as never)}
      >
        <Text style={ui.secondaryText}>Continue browsing as guest</Text>
      </Pressable>

      <Link href={'/(main)/profile' as never} asChild>
        <Pressable>
          <Text style={[ui.link, { textAlign: 'center' }]}>Back to Profile</Text>
        </Pressable>
      </Link>
      <Link href={'/onboarding/select-parish' as never} asChild>
        <Pressable>
          <Text style={[ui.link, { textAlign: 'center', marginTop: 8 }]}>Change parish</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}
