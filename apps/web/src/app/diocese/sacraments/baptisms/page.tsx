'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  DataTable,
  Input,
  Label,
  PageHeader,
  Select,
} from '@bcl/ui';
import { api } from '@/lib/api';
import { ParishScopeField } from '@/components/ParishScopeField';

const empty = {
  parishId: '',
  memberId: '',
  registerNumber: '',
  registerYear: String(new Date().getFullYear()),
  celebratedAt: new Date().toISOString().slice(0, 10),
  birthDate: '',
  birthPlace: '',
  childName: '',
  childGender: '',
  fatherName: '',
  motherName: '',
  nationality: 'Indian',
  parentsDomicile: '',
  fatherOccupation: '',
  placeOfBaptism: '',
  godFatherName: '',
  godMotherName: '',
  ministerName: '',
  remarks: '',
};

export default function BaptismsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [year, setYear] = useState('');
  const [village, setVillage] = useState('');
  const [childQ, setChildQ] = useState('');
  const [certQ, setCertQ] = useState('');

  const members = useQuery({
    queryKey: ['members'],
    queryFn: () =>
      api.get<{ id: string; firstName: string; lastName: string; memberCode: string }[]>(
        '/members',
      ),
  });
  const rows = useQuery({
    queryKey: ['sacraments', 'BAPTISM'],
    queryFn: () => api.get<Record<string, unknown>[]>('/sacraments?type=BAPTISM'),
  });

  const filtered = useMemo(() => {
    return (rows.data || []).filter((row) => {
      if (year && String(row.registerYear) !== year) return false;
      const domicile = String(row.parentsDomicile || row.birthPlace || '').toLowerCase();
      if (village && !domicile.includes(village.toLowerCase())) return false;
      const name = String(row.childName || '').toLowerCase();
      if (childQ && !name.includes(childQ.toLowerCase())) return false;
      const cert = row.certificate as { serialNumber?: string } | null;
      if (certQ && !String(cert?.serialNumber || '').toLowerCase().includes(certQ.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [rows.data, year, village, childQ, certQ]);

  const create = useMutation({
    mutationFn: () =>
      api.post('/sacraments', {
        type: 'BAPTISM',
        parishId: form.parishId,
        memberId: form.memberId || undefined,
        registerNumber: form.registerNumber || undefined,
        registerYear: form.registerYear ? Number(form.registerYear) : undefined,
        celebratedAt: form.celebratedAt,
        birthDate: form.birthDate || undefined,
        birthPlace: form.birthPlace || undefined,
        childName: form.childName || undefined,
        childGender: form.childGender || undefined,
        fatherName: form.fatherName || undefined,
        motherName: form.motherName || undefined,
        nationality: form.nationality || undefined,
        parentsDomicile: form.parentsDomicile || undefined,
        fatherOccupation: form.fatherOccupation || undefined,
        placeOfBaptism: form.placeOfBaptism || undefined,
        churchName: form.placeOfBaptism || undefined,
        godFatherName: form.godFatherName || undefined,
        godMotherName: form.godMotherName || undefined,
        ministerName: form.ministerName || undefined,
        remarks: form.remarks || undefined,
        issueCertificate: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sacraments', 'BAPTISM'] });
      qc.invalidateQueries({ queryKey: ['certificates'] });
      setOpen(false);
      setForm(empty);
    },
  });

  const columns = [
    {
      key: 'reg',
      header: 'No',
      render: (row: Record<string, unknown>) => `${row.registerNumber}/${row.registerYear}`,
    },
    { key: 'childName', header: 'Child Name' },
    {
      key: 'dob',
      header: 'DOB',
      render: (row: Record<string, unknown>) =>
        row.birthDate ? new Date(String(row.birthDate)).toLocaleDateString() : '—',
    },
    {
      key: 'baptism',
      header: 'Baptism',
      render: (row: Record<string, unknown>) =>
        new Date(String(row.celebratedAt)).toLocaleDateString(),
    },
    { key: 'fatherName', header: 'Father' },
    { key: 'motherName', header: 'Mother' },
    { key: 'parentsDomicile', header: 'Village' },
    { key: 'ministerName', header: 'Minister' },
    {
      key: 'cert',
      header: 'Certificate',
      render: (row: Record<string, unknown>) => {
        const cert = row.certificate as { id?: string; serialNumber?: string } | null;
        return cert?.id ? (
          <Link
            className="text-[var(--bcl-burgundy)] hover:underline"
            href={`/print/certificates/${cert.id}`}
          >
            {cert.serialNumber || 'Print'}
          </Link>
        ) : (
          '—'
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Baptism Register"
        description="Parish baptism book — fields match the physical register"
        actions={
          <div className="flex gap-2">
            <Link href="/diocese/sacraments/baptisms/register-print">
              <Button variant="secondary">Register print view</Button>
            </Link>
            <Button onClick={() => setOpen((v) => !v)}>{open ? 'Cancel' : '+ New Baptism'}</Button>
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label>Year</Label>
            <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2012" />
          </div>
          <div>
            <Label>Village</Label>
            <Input value={village} onChange={(e) => setVillage(e.target.value)} />
          </div>
          <div>
            <Label>Child name</Label>
            <Input value={childQ} onChange={(e) => setChildQ(e.target.value)} />
          </div>
          <div>
            <Label>Certificate No</Label>
            <Input value={certQ} onChange={(e) => setCertQ(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {open ? (
        <Card className="mb-6">
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <ParishScopeField
                value={form.parishId}
                onChange={(parishId) => setForm((f) => ({ ...f, parishId }))}
                required
              />
            </div>
            <div>
              <Label>Register No</Label>
              <Input
                value={form.registerNumber}
                onChange={(e) => setForm({ ...form, registerNumber: e.target.value })}
              />
            </div>
            <div>
              <Label>Year</Label>
              <Input
                value={form.registerYear}
                onChange={(e) => setForm({ ...form, registerYear: e.target.value })}
              />
            </div>
            <div>
              <Label>Date of baptism</Label>
              <Input
                type="date"
                value={form.celebratedAt}
                onChange={(e) => setForm({ ...form, celebratedAt: e.target.value })}
              />
            </div>
            <div>
              <Label>Date of birth</Label>
              <Input
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Place of birth</Label>
              <Input
                value={form.birthPlace}
                onChange={(e) => setForm({ ...form, birthPlace: e.target.value })}
              />
            </div>
            <div>
              <Label>Child name</Label>
              <Input
                value={form.childName}
                onChange={(e) => setForm({ ...form, childName: e.target.value })}
              />
            </div>
            <div>
              <Label>Gender</Label>
              <Select
                value={form.childGender}
                onChange={(e) => setForm({ ...form, childGender: e.target.value })}
              >
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </Select>
            </div>
            <div>
              <Label>Link member (optional)</Label>
              <Select
                value={form.memberId}
                onChange={(e) => {
                  const id = e.target.value;
                  const m = (members.data || []).find((x) => x.id === id);
                  setForm({
                    ...form,
                    memberId: id,
                    childName: m ? `${m.firstName} ${m.lastName}` : form.childName,
                  });
                }}
              >
                <option value="">Optional</option>
                {(members.data || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Father name</Label>
              <Input
                value={form.fatherName}
                onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
              />
            </div>
            <div>
              <Label>Mother name</Label>
              <Input
                value={form.motherName}
                onChange={(e) => setForm({ ...form, motherName: e.target.value })}
              />
            </div>
            <div>
              <Label>Nationality</Label>
              <Input
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
              />
            </div>
            <div>
              <Label>Parents domicile</Label>
              <Input
                value={form.parentsDomicile}
                onChange={(e) => setForm({ ...form, parentsDomicile: e.target.value })}
              />
            </div>
            <div>
              <Label>Father occupation</Label>
              <Input
                value={form.fatherOccupation}
                onChange={(e) => setForm({ ...form, fatherOccupation: e.target.value })}
              />
            </div>
            <div>
              <Label>God father</Label>
              <Input
                value={form.godFatherName}
                onChange={(e) => setForm({ ...form, godFatherName: e.target.value })}
              />
            </div>
            <div>
              <Label>God mother</Label>
              <Input
                value={form.godMotherName}
                onChange={(e) => setForm({ ...form, godMotherName: e.target.value })}
              />
            </div>
            <div>
              <Label>Place of baptism</Label>
              <Input
                value={form.placeOfBaptism}
                onChange={(e) => setForm({ ...form, placeOfBaptism: e.target.value })}
              />
            </div>
            <div>
              <Label>Minister</Label>
              <Input
                value={form.ministerName}
                onChange={(e) => setForm({ ...form, ministerName: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label>Remarks / Notanda</Label>
              <Input
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button
                onClick={() => create.mutate()}
                disabled={!form.parishId || !form.childName || create.isPending}
              >
                Save & issue certificate
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <DataTable columns={columns} rows={filtered} />
        </CardContent>
      </Card>
    </div>
  );
}
