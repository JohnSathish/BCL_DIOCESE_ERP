import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { KpiCard, LoadingBlock, Screen } from '../../components/ui';
import { api } from '../../lib/api';
import { useAppTheme } from '../../lib/providers';
import { brand } from '../../lib/theme';

export default function DioceseScreen() {
  const { ui, colors } = useAppTheme();
  const stats = useQuery({
    queryKey: ['mobile-diocese-stats'],
    queryFn: () => api<Record<string, number>>('/diocese/dashboard'),
  });
  const expansion = useQuery({
    queryKey: ['mobile-diocese-expansion'],
    queryFn: () =>
      api<{
        priests?: number;
        parishBreakdown?: Array<{ id: string; name: string; _count?: { families?: number; members?: number } }>;
      }>('/diocese/expansion-dashboard'),
  });

  if (stats.isLoading) {
    return (
      <Screen>
        <LoadingBlock label="Loading diocese overview…" />
      </Screen>
    );
  }

  const s = stats.data || {};

  return (
    <Screen scroll>
      <Text style={ui.title}>Diocese Overview</Text>
      <Text style={ui.subtitle}>Bishop & Admin view — parishes, people, sacraments, and comparisons.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <KpiCard label="Parishes" value={s.parishes ?? '—'} color={brand.burgundy} />
        <KpiCard label="Families" value={s.families ?? '—'} color={brand.royal} />
        <KpiCard label="Catholics" value={s.members ?? '—'} color="#2f6b5c" />
        <KpiCard label="Priests" value={expansion.data?.priests ?? '—'} color="#8a6a2f" />
        <KpiCard label="Baptisms" value={s.baptisms ?? '—'} color="#2f5f98" />
        <KpiCard label="Marriages" value={s.marriages ?? '—'} color="#8b3a42" />
      </View>
      <Text style={[ui.section, { color: colors.primary }]}>Parish comparison</Text>
      {(expansion.data?.parishBreakdown || []).slice(0, 8).map((p) => (
        <View key={p.id} style={ui.card}>
          <Text style={ui.cardTitle}>{p.name}</Text>
          <Text style={ui.meta}>
            Families {p._count?.families ?? 0} · Members {p._count?.members ?? 0}
          </Text>
        </View>
      ))}
      <View style={ui.card}>
        <Text style={ui.cardTitle}>AI Diocese Insights</Text>
        <Text style={ui.body}>
          Open the AI Assistant for pending approvals, certificate queues, and deanery comparisons.
        </Text>
      </View>
    </Screen>
  );
}
