import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../components/ui';
import { useAppTheme } from '../../lib/providers';
import {
  parishQuery,
  fetchStaffCached,
  STAFF_CACHE,
  staffQueryKey,
  useStaffParishId,
} from '../../lib/staff-data';
import { api } from '../../lib/api';
import { canManageFinance } from '../../lib/rbac';
import { useAuthStore } from '../../lib/auth-store';

type FinanceSummary = {
  income?: number;
  expense?: number;
  net?: number;
  todayCollection?: number;
  monthIncome?: number;
  monthExpense?: number;
  recent?: Array<{ id: string; description?: string; amount: number; type: string; txnDate: string }>;
};

export default function FinanceScreen() {
  const { ui, colors } = useAppTheme();
  const parishId = useStaffParishId();
  const roles = useAuthStore((s) => s.session?.user.roles || []);
  const locked = !canManageFinance(roles);

  const summary = useQuery({
    queryKey: staffQueryKey('finance-summary', parishId),
    queryFn: () =>
      fetchStaffCached(STAFF_CACHE.finance, () =>
        api<FinanceSummary>(`/finance/summary${parishQuery(parishId)}`),
      ),
    enabled: !locked,
  });

  const txns = useQuery({
    queryKey: staffQueryKey('finance-txns', parishId),
    queryFn: () =>
      api<Array<{ id: string; description?: string; amount: number; type: string; txnDate: string }>>(
        `/finance/transactions${parishQuery(parishId)}`,
      ),
    enabled: !locked && !summary.data?.recent?.length,
  });

  const recentTxns = summary.data?.recent || txns.data || [];

  if (locked) {
    return (
      <Screen scroll>
        <Text style={ui.title}>Finance</Text>
        <View style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>Access restricted</Text>
          <Text style={ui.body}>Finance is limited to priests and finance staff.</Text>
        </View>
      </Screen>
    );
  }

  const s = summary.data;

  return (
    <Screen scroll>
      <Text style={ui.title}>Finance</Text>
      <Text style={ui.subtitle}>Collections, ledger and parish accounts</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {[
          ['Today', s?.todayCollection, '₹'],
          ['Income', s?.income, '₹'],
          ['Expense', s?.expense, '₹'],
          ['Net', s?.net, '₹'],
        ].map(([label, value, prefix]) => (
          <View key={String(label)} style={[ui.card, { width: '47%', flexGrow: 1, padding: 12 }]}>
            <Text style={ui.meta}>{String(label)}</Text>
            <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 18 }}>
              {prefix}
              {Number(value || 0).toLocaleString('en-IN')}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[ui.cardTitle, { color: colors.primary, marginTop: 16 }]}>Recent transactions</Text>
      {(recentTxns).slice(0, 20).map((t) => (
        <View key={t.id} style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>
            {t.type} · ₹{Number(t.amount).toLocaleString('en-IN')}
          </Text>
          <Text style={ui.body}>{t.description || 'Transaction'}</Text>
          <Text style={ui.meta}>{new Date(t.txnDate).toLocaleString()}</Text>
        </View>
      ))}
      {summary.isLoading || txns.isLoading ? (
        <Text style={ui.meta}>Loading finance data…</Text>
      ) : null}
    </Screen>
  );
}
