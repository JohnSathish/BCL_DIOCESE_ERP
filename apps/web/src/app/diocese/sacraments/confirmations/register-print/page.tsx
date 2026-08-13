'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button, Card, CardContent, Input, Label } from '@bcl/ui';
import { api } from '@/lib/api';
import { getConfirmationDetails } from '@/components/confirmation-register/types';
import '@/components/confirmation-register/confirmation-register.css';

export default function ConfirmationRegisterPrintPage() {
  const t = useTranslations('certificates.confirmation');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const parish = useQuery({
    queryKey: ['parish-me-brand'],
    queryFn: () =>
      api.get<{ parish: { name: string } }>('/parishes/me/dashboard'),
  });
  const rows = useQuery({
    queryKey: ['sacraments', 'CONFIRMATION'],
    queryFn: () => api.get<Record<string, unknown>[]>('/sacraments?type=CONFIRMATION'),
  });

  const filtered = useMemo(
    () =>
      (rows.data || [])
        .filter((r) => String(r.registerYear) === year)
        .sort((a, b) => Number(a.registerNumber) - Number(b.registerNumber)),
    [rows.data, year],
  );

  const parishName = parish.data?.parish?.name || 'Parish';

  return (
    <div>
      <div className="ecr-no-print mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-[var(--bcl-burgundy)]">{t('printTitle')}</h1>
          <p className="text-sm text-[var(--bcl-muted)]">{t('printDescription')}</p>
        </div>
        <Button onClick={() => window.print()}>{t('actions.print')}</Button>
      </div>

      <Card className="ecr-no-print mb-4">
        <CardContent className="flex items-end gap-3">
          <div>
            <Label>{t('filters.year')}</Label>
            <Input value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="ecr-register-print">
        <div className="ecr-book-title">
          <span>{t('bookHeading')}</span>
          <span>{t('bookYear', { year })}</span>
          <span>{parishName}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{t('columns.no')}</th>
              <th>{t('columns.date')}</th>
              <th>{t('columns.place')}</th>
              <th>{t('columns.name')}</th>
              <th>{t('columns.surname')}</th>
              <th>{t('columns.father')}</th>
              <th>{t('columns.mother')}</th>
              <th>{t('columns.village')}</th>
              <th>{t('columns.sponsor')}</th>
              <th>{t('columns.minister')}</th>
              <th>{t('columns.notanda')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const d = getConfirmationDetails(r);
              return (
                <tr key={String(r.id)}>
                  <td>{String(r.registerNumber ?? '')}</td>
                  <td>{new Date(String(r.celebratedAt)).toLocaleDateString()}</td>
                  <td>{String(r.churchName || r.place || '')}</td>
                  <td>{String(r.childName || '')}</td>
                  <td>{String(d.surname || '')}</td>
                  <td>{String(r.fatherName || '')}</td>
                  <td>{String(r.motherName || '')}</td>
                  <td>{String(d.village || r.parentsDomicile || '')}</td>
                  <td>{String(r.sponsorName || '')}</td>
                  <td>{String(r.ministerName || '')}</td>
                  <td>{String(r.remarks || '')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
