import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../components/ui';
import { useAppTheme } from '../../lib/providers';
import {
  ReportRegistryItem,
  ReportRunResult,
  STAFF_CACHE,
  fetchStaffCached,
  parishQuery,
  staffQueryKey,
  useStaffParishId,
} from '../../lib/staff-data';
import { api } from '../../lib/api';

export default function ReportsScreen() {
  const { ui, colors } = useAppTheme();
  const parishId = useStaffParishId();
  const [activeCode, setActiveCode] = useState<string | null>(null);

  const registry = useQuery({
    queryKey: staffQueryKey('reports-registry', parishId),
    queryFn: () =>
      fetchStaffCached(STAFF_CACHE.reports, () =>
        api<ReportRegistryItem[]>('/reports/registry'),
      ),
  });

  const run = useQuery({
    queryKey: staffQueryKey('report-run', activeCode, parishId),
    queryFn: () =>
      api<ReportRunResult>(
        `/reports/run/${activeCode}${parishQuery(parishId)}`,
      ),
    enabled: Boolean(activeCode),
  });

  const rows = run.data?.rows || [];

  return (
    <Screen scroll>
      <Text style={ui.title}>Reports</Text>
      <Text style={ui.subtitle}>Run parish analytics from the live report registry</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {(registry.data || []).map((r) => {
          const active = activeCode === r.code;
          return (
            <Pressable
              key={r.code}
              onPress={() => setActiveCode(r.code)}
              style={[
                ui.chip,
                active && { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[ui.chipText, active && { color: '#fff' }]}>{r.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeCode ? (
        <View style={{ marginTop: 16 }}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>
            {registry.data?.find((r) => r.code === activeCode)?.name || activeCode}
          </Text>
          <Text style={ui.meta}>{rows.length} row(s)</Text>
          {run.isLoading ? <Text style={ui.meta}>Running report…</Text> : null}
          {rows.slice(0, 30).map((row, i) => (
            <View key={i} style={ui.card}>
              <Text style={ui.body}>
                {typeof row === 'object' && row
                  ? Object.entries(row as Record<string, unknown>)
                      .slice(0, 6)
                      .map(([k, v]) => `${k}: ${String(v)}`)
                      .join(' · ')
                  : String(row)}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={[ui.card, { marginTop: 16 }]}>
          <Text style={ui.body}>Select a report above to run it.</Text>
        </View>
      )}
    </Screen>
  );
}
