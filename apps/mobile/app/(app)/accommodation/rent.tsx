import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../../components/ui';
import { useAppTheme } from '../../../lib/providers';
import { getCachedPortal, loadPortalPreferCache, type PortalInvoice } from '../../../lib/occupant-portal';

function money(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function InvoiceRow({ inv }: { inv: PortalInvoice }) {
  const { ui, colors } = useAppTheme();
  const due = Number(inv.totalAmount) - Number(inv.paidAmount);
  return (
    <View style={ui.card}>
      <Text style={[ui.cardTitle, { color: colors.primary }]}>{inv.invoiceNo}</Text>
      <Text style={ui.body}>
        {new Date(inv.periodStart).toLocaleDateString()} – {new Date(inv.periodEnd).toLocaleDateString()}
      </Text>
      <Text style={ui.meta}>
        Total {money(Number(inv.totalAmount))} · Paid {money(Number(inv.paidAmount))} · Due {money(due)}
      </Text>
      <Text style={ui.meta}>Status: {inv.status.replace(/_/g, ' ')}</Text>
      {inv.payments?.length ? (
        <Text style={ui.meta}>
          Latest receipt: {inv.payments[0].receiptNo} ({money(Number(inv.payments[0].amount))})
        </Text>
      ) : null}
    </View>
  );
}

export default function RentScreen() {
  const { ui, colors } = useAppTheme();
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        setLoading(true);
        const bundle = (await loadPortalPreferCache()) || (await getCachedPortal());
        if (active) {
          setInvoices(bundle?.invoices || []);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={ui.subtitle}>Rent invoices and payment history (cached offline in SQLite).</Text>
      {!invoices.length ? (
        <View style={ui.card}>
          <Text style={ui.body}>No rent invoices on file.</Text>
        </View>
      ) : (
        invoices.map((inv) => <InvoiceRow key={inv.id} inv={inv} />)
      )}
    </Screen>
  );
}
