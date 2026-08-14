'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label } from '@bcl/ui';
import { api } from '@/lib/api';
import { getConfirmationDetails } from '@/components/confirmation-register/types';
import '@/components/confirmation-register/confirmation-register.css';

export default function ConfirmationRegisterPrintPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const parish = useQuery({
    queryKey: ['parish-me-brand'],
    queryFn: () =>
      api.get<{ parish: { name: string }; diocese?: { name?: string } }>(
        '/parishes/me/dashboard',
      ),
  });
  const rows = useQuery({
    queryKey: ['sacraments', 'CONFIRMATION'],
    queryFn: () => api.get<Record<string, unknown>[]>('/sacraments?type=CONFIRMATION'),
  });

  const filtered = useMemo(
    () =>
      (rows.data || [])
        .filter((r) => String(r.registerYear) === year)
        .sort((a, b) => String(a.registerNumber || '').localeCompare(String(b.registerNumber || ''))),
    [rows.data, year],
  );

  const parishName = parish.data?.parish?.name || 'Parish';
  const dioceseName = 'Roman Catholic Diocese of Tura';

  return (
    <div>
      <div className="ecr-no-print mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-[var(--bcl-primary,#1b4d3e)]">
            Confirmation register (print)
          </h1>
          <p className="text-sm text-[var(--bcl-muted)]">
            Official A4 / register-book layout for the selected year
          </p>
        </div>
        <Button onClick={() => window.print()}>Print</Button>
      </div>

      <Card className="ecr-no-print mb-4">
        <CardContent className="flex items-end gap-3">
          <div>
            <Label>Year</Label>
            <Input value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="ecr-register-print">
        <div className="ecr-book-title">
          <span>{dioceseName}</span>
          <span>{parishName}</span>
          <span>CONFIRMATION REGISTER</span>
          <span>Year {year}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Register No.</th>
              <th>Confirmand</th>
              <th>Date</th>
              <th>Parents</th>
              <th>Village</th>
              <th>Sponsor</th>
              <th>Minister</th>
              <th>Notanda</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const d = getConfirmationDetails(r);
              const parents = [r.fatherName, r.motherName].filter(Boolean).join(' / ');
              return (
                <tr key={String(r.id)}>
                  <td>{String(r.registerNumber ?? '')}</td>
                  <td>
                    {String(r.childName || '')}
                    {d.surname ? ` ${d.surname}` : ''}
                  </td>
                  <td>{new Date(String(r.celebratedAt)).toLocaleDateString()}</td>
                  <td>{parents}</td>
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
