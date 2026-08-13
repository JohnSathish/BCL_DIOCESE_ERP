import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/ui';
import { useAppTheme } from '../../lib/providers';
import { useAuthStore } from '../../lib/auth-store';
import { roleLabel, primaryRole } from '../../lib/rbac';
import { changeMobileLocale, initI18n } from '../../lib/i18n';
import { api } from '../../lib/api';

const LOCALE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'gar', label: 'A∙chik' },
  { code: 'ta', label: 'தமிழ்' },
];

export default function SettingsScreen() {
  const { ui, colors } = useAppTheme();
  const { t, i18n } = useTranslation('mobile');
  const session = useAuthStore((s) => s.session);
  const themeMode = useAuthStore((s) => s.themeMode);
  const setThemeMode = useAuthStore((s) => s.setThemeMode);
  const biometricLogin = useAuthStore((s) => s.biometricLogin);
  const role = primaryRole(session?.user.roles || []);
  const [locale, setLocale] = useState(i18n.language || 'en');

  useEffect(() => {
    void initI18n(session?.accessToken, locale);
  }, [session?.accessToken, locale]);

  return (
    <Screen scroll>
      <Text style={ui.title}>{t('tabs.settings')}</Text>
      <View style={ui.card}>
        <Text style={ui.cardTitle}>Account</Text>
        <Text style={ui.body}>
          {session?.user.firstName} {session?.user.lastName}
        </Text>
        <Text style={ui.meta}>{session?.user.email}</Text>
        <Text style={[ui.chipText, { marginTop: 8 }]}>{roleLabel(role)}</Text>
      </View>

      <Text style={[ui.section, { color: colors.primary }]}>{t('settings.language')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {LOCALE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.code}
            style={[ui.button, locale !== opt.code && ui.secondary]}
            onPress={async () => {
              await changeMobileLocale(opt.code, session?.accessToken);
              setLocale(opt.code);
              try {
                await api('/auth/me/preferences', {
                  method: 'PATCH',
                  body: JSON.stringify({ locale: opt.code }),
                });
              } catch {
                /* offline */
              }
            }}
          >
            <Text style={locale === opt.code ? ui.buttonText : ui.secondaryText}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[ui.meta, { marginTop: 6 }]}>{t('settings.languageHint')}</Text>

      <Text style={[ui.section, { color: colors.primary }]}>Appearance</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['light', 'dark', 'system'] as const).map((mode) => (
          <Pressable
            key={mode}
            style={[ui.button, themeMode !== mode && ui.secondary, { flex: 1 }]}
            onPress={() => setThemeMode(mode)}
          >
            <Text style={themeMode === mode ? ui.buttonText : ui.secondaryText}>{mode}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[ui.section, { color: colors.primary }]}>Security</Text>
      <View style={ui.card}>
        <Text style={ui.body}>JWT session · refresh token · secure storage</Text>
        <Pressable
          style={[ui.button, { marginTop: 10 }]}
          onPress={async () => {
            await biometricLogin();
          }}
        >
          <Text style={ui.buttonText}>Test Biometric Unlock</Text>
        </Pressable>
      </View>

      <View style={ui.card}>
        <Text style={ui.cardTitle}>About</Text>
        <Text style={ui.body}>BCL Diocese · Catholic Diocese Management Platform · v0.1.0</Text>
      </View>
    </Screen>
  );
}
