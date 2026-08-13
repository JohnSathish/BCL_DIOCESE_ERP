'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

export default function BaptismRegisterPrintPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const rows = useQuery({
    queryKey: ['sacraments', 'BAPTISM'],
    queryFn: () => api.get<Record<string, unknown>[]>('/sacraments?type=BAPTISM'),
  });

  const filtered = useMemo(
    () => (rows.data || []).filter((r) => String(r.registerYear) === year),
    [rows.data, year],
  );

  return (
    <div>
      <PageHeader
        title="Baptism register (print)"
        description="Paper-book layout for the selected year"
        actions={
          <Button onClick={() => window.print()} className="print:hidden">
            Print
          </Button>
        }
      />
      <Card className="mb-4 print:hidden">
        <CardContent className="flex items-end gap-3">
          <div>
            <Label>Year</Label>
            <Input value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
        </CardContent>
      </Card>
      <div className="overflow-x-auto rounded border border-stone-400 bg-white p-4 text-black">
        <div className="mb-3 flex justify-between font-semibold">
          <span>BAPTISM</span>
          <span>Year {year}</span>
          <span>Parish of St. Mary</span>
        </div>
        <table className="w-full min-w-[1200px] border-collapse text-[10px]">
          <thead>
            <tr>
              {[
                'No',
                'Date of baptism',
                'Date of birth',
                'Place of birth',
                'Name',
                'Sex',
                'Father',
                'Mother',
                'Nationality',
                'Parents domicile',
                'Father occupation',
                'God father/mother',
                'Place of baptism',
                'Minister',
                'Notanda',
              ].map((h) => (
                <th key={h} className="border border-stone-400 px-1 py-1 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={String(r.id)}>
                <td className="border border-stone-300 px-1">{String(r.registerNumber)}</td>
                <td className="border border-stone-300 px-1">
                  {new Date(String(r.celebratedAt)).toLocaleDateString()}
                </td>
                <td className="border border-stone-300 px-1">
                  {r.birthDate ? new Date(String(r.birthDate)).toLocaleDateString() : ''}
                </td>
                <td className="border border-stone-300 px-1">{String(r.birthPlace || '')}</td>
                <td className="border border-stone-300 px-1">{String(r.childName || '')}</td>
                <td className="border border-stone-300 px-1">{String(r.childGender || '')}</td>
                <td className="border border-stone-300 px-1">{String(r.fatherName || '')}</td>
                <td className="border border-stone-300 px-1">{String(r.motherName || '')}</td>
                <td className="border border-stone-300 px-1">{String(r.nationality || '')}</td>
                <td className="border border-stone-300 px-1">{String(r.parentsDomicile || '')}</td>
                <td className="border border-stone-300 px-1">{String(r.fatherOccupation || '')}</td>
                <td className="border border-stone-300 px-1">
                  {[r.godFatherName, r.godMotherName].filter(Boolean).join(' / ')}
                </td>
                <td className="border border-stone-300 px-1">
                  {String(r.placeOfBaptism || r.churchName || '')}
                </td>
                <td className="border border-stone-300 px-1">{String(r.ministerName || '')}</td>
                <td className="border border-stone-300 px-1">{String(r.remarks || '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
