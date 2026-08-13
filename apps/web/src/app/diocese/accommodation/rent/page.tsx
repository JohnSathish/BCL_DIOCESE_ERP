'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, DataTable, Input, Label, PageHeader, Select } from '@bcl/ui';
import { api } from '@/lib/api';

type Allocation = {
  id: string;
  monthlyRent: string | number;
  occupant?: { name: string };
  room?: { roomNumber: string; facility?: { name: string } };
};

type Invoice = {
  id: string;
  invoiceNo: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: string | number;
  paidAmount: string | number;
  status: string;
  allocation?: {
    occupant?: { name: string };
    room?: { roomNumber: string; facility?: { name: string } };
  };
};

export default function RentPage() {
  const qc = useQueryClient();
  const [invoiceForm, setInvoiceForm] = useState({
    allocationId: '',
    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10),
    periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10),
    electricity: '0',
    water: '0',
    maintenance: '0',
  });
  const [payForm, setPayForm] = useState({
    invoiceId: '',
    amount: '',
    paymentMethod: 'UPI',
  });

  const allocations = useQuery({
    queryKey: ['accommodation-allocations'],
    queryFn: () => api.get<Allocation[]>('/accommodation/allocations?status=ACTIVE'),
  });
  const invoices = useQuery({
    queryKey: ['accommodation-invoices'],
    queryFn: () => api.get<Invoice[]>('/accommodation/rent/invoices'),
  });

  const createInvoice = useMutation({
    mutationFn: () =>
      api.post('/accommodation/rent/invoices', {
        allocationId: invoiceForm.allocationId,
        periodStart: new Date(invoiceForm.periodStart).toISOString(),
        periodEnd: new Date(invoiceForm.periodEnd).toISOString(),
        electricity: Number(invoiceForm.electricity) || 0,
        water: Number(invoiceForm.water) || 0,
        maintenance: Number(invoiceForm.maintenance) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accommodation-invoices'] });
      qc.invalidateQueries({ queryKey: ['accommodation-dashboard'] });
    },
  });

  const pay = useMutation({
    mutationFn: () =>
      api.post('/accommodation/rent/payments', {
        invoiceId: payForm.invoiceId,
        amount: Number(payForm.amount),
        paymentMethod: payForm.paymentMethod,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accommodation-invoices'] });
      qc.invalidateQueries({ queryKey: ['accommodation-dashboard'] });
      setPayForm((f) => ({ ...f, amount: '' }));
    },
  });

  const outstanding = (invoices.data || []).filter(
    (i) => i.status === 'ISSUED' || i.status === 'PARTIAL',
  );

  return (
    <div>
      <PageHeader
        title="Accommodation rent"
        description="Monthly invoices, payments, and outstanding balances"
        actions={
          <Link href="/diocese/accommodation" className="text-sm font-semibold text-[var(--bcl-burgundy)]">
            ← Dashboard
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="grid gap-2 p-4">
            <h2 className="font-semibold">Generate invoice</h2>
            <Label>Allocation</Label>
            <Select
              value={invoiceForm.allocationId}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, allocationId: e.target.value })}
            >
              <option value="">Select</option>
              {(allocations.data || []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.occupant?.name} · {a.room?.roomNumber} · ₹{Number(a.monthlyRent)}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Period start</Label>
                <Input
                  type="date"
                  value={invoiceForm.periodStart}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, periodStart: e.target.value })}
                />
              </div>
              <div>
                <Label>Period end</Label>
                <Input
                  type="date"
                  value={invoiceForm.periodEnd}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, periodEnd: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Electricity"
                value={invoiceForm.electricity}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, electricity: e.target.value })}
              />
              <Input
                placeholder="Water"
                value={invoiceForm.water}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, water: e.target.value })}
              />
              <Input
                placeholder="Maintenance"
                value={invoiceForm.maintenance}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, maintenance: e.target.value })}
              />
            </div>
            <Button
              onClick={() => createInvoice.mutate()}
              disabled={!invoiceForm.allocationId || createInvoice.isPending}
            >
              Issue invoice
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-2 p-4">
            <h2 className="font-semibold">Record payment</h2>
            <Label>Outstanding invoice</Label>
            <Select
              value={payForm.invoiceId}
              onChange={(e) => {
                const inv = outstanding.find((i) => i.id === e.target.value);
                const due = inv
                  ? Number(inv.totalAmount) - Number(inv.paidAmount)
                  : 0;
                setPayForm({
                  ...payForm,
                  invoiceId: e.target.value,
                  amount: due > 0 ? String(due) : '',
                });
              }}
            >
              <option value="">Select</option>
              {outstanding.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.invoiceNo} · {i.allocation?.occupant?.name} · due ₹
                  {(Number(i.totalAmount) - Number(i.paidAmount)).toLocaleString('en-IN')}
                </option>
              ))}
            </Select>
            <Label>Amount</Label>
            <Input
              value={payForm.amount}
              onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
            />
            <Label>Method</Label>
            <Select
              value={payForm.paymentMethod}
              onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
            >
              {['CASH', 'UPI', 'BANK', 'ONLINE', 'CARD', 'CHEQUE'].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <Button
              onClick={() => pay.mutate()}
              disabled={!payForm.invoiceId || !payForm.amount || pay.isPending}
            >
              Record payment
            </Button>
            {pay.isError ? <p className="text-sm text-red-600">{(pay.error as Error).message}</p> : null}
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={[
          { key: 'no', header: 'Invoice' },
          { key: 'who', header: 'Occupant / Room' },
          { key: 'period', header: 'Period' },
          { key: 'total', header: 'Total' },
          { key: 'paid', header: 'Paid' },
          { key: 'status', header: 'Status' },
        ]}
        rows={(invoices.data || []).map((i) => ({
          no: i.invoiceNo,
          who: `${i.allocation?.occupant?.name || '—'} · ${i.allocation?.room?.roomNumber || ''}`,
          period: `${new Date(i.periodStart).toLocaleDateString()} – ${new Date(i.periodEnd).toLocaleDateString()}`,
          total: `₹${Number(i.totalAmount).toLocaleString('en-IN')}`,
          paid: `₹${Number(i.paidAmount).toLocaleString('en-IN')}`,
          status: i.status,
        }))}
      />
    </div>
  );
}
