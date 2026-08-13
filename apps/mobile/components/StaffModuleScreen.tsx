/** Shared pattern for staff list modules */
import { Text, View } from 'react-native';
import { Screen } from './ui';
import { useAppTheme } from '../lib/providers';
import { useAuthStore } from '../lib/auth-store';
import { canDeleteHistorical, canManageFinance } from '../lib/rbac';

export function StaffModuleScreen({
  title,
  subtitle,
  items,
  financeLocked,
}: {
  title: string;
  subtitle: string;
  items: Array<{ title: string; meta: string }>;
  financeLocked?: boolean;
}) {
  const { ui, colors } = useAppTheme();
  const roles = useAuthStore((s) => s.session?.user.roles || []);
  const locked = financeLocked && !canManageFinance(roles);

  if (locked) {
    return (
      <Screen scroll>
        <Text style={ui.title}>{title}</Text>
        <View style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>Access restricted</Text>
          <Text style={ui.body}>
            Your role cannot manage finance. Contact the Parish Priest or Finance Committee.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={ui.title}>{title}</Text>
      <Text style={ui.subtitle}>{subtitle}</Text>
      {!canDeleteHistorical(roles) ? (
        <View style={[ui.chip, { marginBottom: 4 }]}>
          <Text style={ui.chipText}>View / Create / Update · No historical delete</Text>
        </View>
      ) : null}
      {items.map((item) => (
        <View key={item.title} style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>{item.title}</Text>
          <Text style={ui.meta}>{item.meta}</Text>
        </View>
      ))}
    </Screen>
  );
}
