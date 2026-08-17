import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '../../components/ui';
import {
  Bell,
  Calendar,
  Cross,
  FileText,
  Heart,
  Users,
} from '../../components/icons';
import { useAppTheme } from '../../lib/providers';
import { brand } from '../../lib/theme';

const ITEMS = [
  { label: 'Baptisms', href: '/(app)/baptisms', Icon: Cross, color: brand.emerald },
  { label: 'Marriages', href: '/(app)/marriages', Icon: Heart, color: brand.burgundy },
  { label: 'Confirmations', href: '/(app)/confirmations', Icon: Cross, color: brand.royal },
  { label: 'Holy Communion', href: '/(app)/communions', Icon: Heart, color: brand.gold },
  { label: 'Death Register', href: '/(app)/deaths', Icon: Cross, color: brand.navy },
  { label: 'Families', href: '/(app)/families', Icon: Users, color: brand.teal },
  { label: 'Certificates', href: '/certificates', Icon: FileText, color: brand.indigo },
  { label: 'Mass Schedule', href: '/(app)/schedule', Icon: Calendar, color: brand.orange },
  { label: 'Notify Parish', href: '/(app)/communications', Icon: Bell, color: brand.burgundy },
] as const;

export default function PastoralHubScreen() {
  const { colors, ui } = useAppTheme();

  return (
    <Screen scroll>
      <Text style={ui.title}>Pastoral</Text>
      <Text style={[ui.muted, { marginBottom: 8 }]}>
        Sacraments, families, and parish ministry tools.
      </Text>
      <View style={{ gap: 10 }}>
        {ITEMS.map((item) => {
          const Icon = item.Icon;
          return (
            <Link key={item.label} href={item.href as never} asChild>
              <Pressable
                style={[
                  ui.card,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 14,
                  },
                ]}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: `${item.color}14`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} color={item.color} />
                </View>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
                  {item.label}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </Screen>
  );
}
