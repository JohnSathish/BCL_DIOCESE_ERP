'use client';

import { useCallback, useMemo, useState } from 'react';
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

type SacramentType = 'CONFIRMATION' | 'HOLY_COMMUNION' | 'DEATH' | 'MARRIAGE' | 'BAPTISM';

const titles: Record<SacramentType, string> = {
  BAPTISM: 'Baptisms',
  CONFIRMATION: 'Confirmation Register',
  HOLY_COMMUNION: 'First Holy Communion',
  MARRIAGE: 'Marriages',
  DEATH: 'Death Register',
};

const descriptions: Partial<Record<SacramentType, string>> = {
  CONFIRMATION: 'Date, name, parents, sponsor, minister and certificate',
  HOLY_COMMUNION: 'Date, name, parents, class, school, minister and certificate',
  DEATH: 'Name, family, death/burial, cause, priest and certificate',
};

export function SacramentListPage({
  type,
  extraFields,
}: {
  type: SacramentType;
  extraFields?: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    parishId: '',
    memberId: '',
    celebratedAt: new Date().toISOString().slice(0, 10),
    childName: '',
    fatherName: '',
    motherName: '',
    ministerName: '',
    sponsorName: '',
    className: '',
    teacherName: '',
    schoolName: '',
    cemeteryName: '',
    graveNumber: '',
    burialDate: new Date().toISOString().slice(0, 10),
    causeOfDeath: '',
    placeOfDeath: '',
    funeralCelebrant: '',
    remarks: '',
  });

  const setParishId = useCallback((parishId: string) => {
    setForm((f) => ({ ...f, parishId }));
  }, []);
  const members = useQuery({
    queryKey: ['members'],
    queryFn: () =>
      api.get<{ id: string; firstName: string; lastName: string; memberCode: string }[]>(
        '/members',
      ),
  });
  const rows = useQuery({
    queryKey: ['sacraments', type],
    queryFn: () => api.get<Record<string, unknown>[]>(`/sacraments?type=${type}`),
  });

  const create = useMutation({
    mutationFn: () => {
      const member = (members.data || []).find((m) => m.id === form.memberId);
      const derivedName = form.childName || (member ? `${member.firstName} ${member.lastName}` : undefined);
      return api.post('/sacraments', {
        type,
        parishId: form.parishId,
        memberId: form.memberId || undefined,
        celebratedAt: form.celebratedAt,
        childName: derivedName,
        fatherName: form.fatherName || undefined,
        motherName: form.motherName || undefined,
        ministerName: form.ministerName || undefined,
        sponsorName: form.sponsorName || undefined,
        className: form.className || undefined,
        teacherName: form.teacherName || undefined,
        schoolName: form.schoolName || undefined,
        cemeteryName: form.cemeteryName || undefined,
        graveNumber: form.graveNumber || undefined,
        funeralCelebrant: form.funeralCelebrant || form.ministerName || undefined,
        burialDate: type === 'DEATH' ? form.burialDate || form.celebratedAt : undefined,
        causeOfDeath: form.causeOfDeath || undefined,
        placeOfDeath: form.placeOfDeath || undefined,
        remarks: form.remarks || undefined,
        issueCertificate: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sacraments', type] });
      qc.invalidateQueries({ queryKey: ['sacrament-stats'] });
      qc.invalidateQueries({ queryKey: ['certificates'] });
      qc.invalidateQueries({ queryKey: ['registers'] });
      qc.invalidateQueries({ queryKey: ['members'] });
      setOpen(false);
    },
  });

  const columns = useMemo(() => {
    const base = [
      {
        key: 'reg',
        header: 'Register',
        render: (row: Record<string, unknown>) => `${row.registerNumber}/${row.registerYear}`,
      },
      {
        key: 'name',
        header: 'Name',
        render: (row: Record<string, unknown>) => {
          const m = row.member as { firstName?: string; lastName?: string } | undefined;
          if (row.childName) return String(row.childName);
          return m ? `${m.firstName} ${m.lastName}` : '—';
        },
      },
      {
        key: 'celebratedAt',
        header: type === 'DEATH' ? 'Date of death' : 'Date',
        render: (row: Record<string, unknown>) =>
          new Date(String(row.celebratedAt)).toLocaleDateString(),
      },
    ];

    if (type === 'CONFIRMATION') {
      base.push(
        { key: 'fatherName', header: 'Father', render: (r: Record<string, unknown>) => String(r.fatherName || '—') },
        { key: 'sponsorName', header: 'Sponsor', render: (r: Record<string, unknown>) => String(r.sponsorName || '—') },
      );
    }
    if (type === 'HOLY_COMMUNION') {
      base.push(
        { key: 'className', header: 'Class', render: (r: Record<string, unknown>) => String(r.className || '—') },
        { key: 'schoolName', header: 'School', render: (r: Record<string, unknown>) => String(r.schoolName || '—') },
      );
    }
    if (type === 'DEATH') {
      base.push(
        {
          key: 'burialDate',
          header: 'Burial',
          render: (r: Record<string, unknown>) =>
            r.burialDate ? new Date(String(r.burialDate)).toLocaleDateString() : '—',
        },
        { key: 'causeOfDeath', header: 'Cause', render: (r: Record<string, unknown>) => String(r.causeOfDeath || '—') },
        { key: 'cemeteryName', header: 'Burial place', render: (r: Record<string, unknown>) => String(r.cemeteryName || '—') },
      );
    }

    base.push(
      { key: 'ministerName', header: type === 'DEATH' ? 'Priest' : 'Minister', render: (r: Record<string, unknown>) => String(r.ministerName || r.funeralCelebrant || '—') },
      {
        key: 'cert',
        header: 'Certificate',
        render: (row: Record<string, unknown>) => {
          const cert = row.certificate as { id?: string } | null;
          return cert?.id ? (
            <Link
              className="text-[var(--bcl-burgundy)] hover:underline"
              href={`/print/certificates/${cert.id}`}
            >
              Print
            </Link>
          ) : (
            '—'
          );
        },
      },
    );
    return base;
  }, [type]);

  return (
    <div>
      <PageHeader
        title={titles[type]}
        description={descriptions[type] || 'Register entry, certificate and digital book page'}
        actions={
          type === 'MARRIAGE' ? (
            <Link href="/diocese/sacraments/marriages/new">
              <Button>New Marriage Record</Button>
            </Link>
          ) : type === 'BAPTISM' ? (
            <Link href="/diocese/sacraments/baptisms">
              <Button>Open baptism register</Button>
            </Link>
          ) : (
            <Button onClick={() => setOpen((v) => !v)}>
              {open ? 'Cancel' : `New ${type === 'HOLY_COMMUNION' ? 'communion' : type.toLowerCase()}`}
            </Button>
          )
        }
      />
      {open && type !== 'MARRIAGE' && type !== 'BAPTISM' ? (
        <Card className="mb-6">
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <ParishScopeField value={form.parishId} onChange={setParishId} required />
            </div>
            <div>
              <Label>Member</Label>
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
                <option value="">Select member</option>
                {(members.data || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} ({m.memberCode})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Name (as in register)</Label>
              <Input
                value={form.childName}
                onChange={(e) => setForm({ ...form, childName: e.target.value })}
              />
            </div>
            <div>
              <Label>{type === 'DEATH' ? 'Date of death' : 'Date'}</Label>
              <Input
                type="date"
                value={form.celebratedAt}
                onChange={(e) => setForm({ ...form, celebratedAt: e.target.value })}
              />
            </div>
            <div>
              <Label>Father</Label>
              <Input
                value={form.fatherName}
                onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
              />
            </div>
            <div>
              <Label>Mother</Label>
              <Input
                value={form.motherName}
                onChange={(e) => setForm({ ...form, motherName: e.target.value })}
              />
            </div>
            <div>
              <Label>{type === 'DEATH' ? 'Priest / celebrant' : 'Minister'}</Label>
              <Input
                value={form.ministerName}
                onChange={(e) => setForm({ ...form, ministerName: e.target.value })}
              />
            </div>

            {type === 'CONFIRMATION' ? (
              <div>
                <Label>Sponsor</Label>
                <Input
                  value={form.sponsorName}
                  onChange={(e) => setForm({ ...form, sponsorName: e.target.value })}
                />
              </div>
            ) : null}

            {type === 'HOLY_COMMUNION' ? (
              <>
                <div>
                  <Label>Class</Label>
                  <Input
                    value={form.className}
                    onChange={(e) => setForm({ ...form, className: e.target.value })}
                  />
                </div>
                <div>
                  <Label>School</Label>
                  <Input
                    value={form.schoolName}
                    onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Teacher</Label>
                  <Input
                    value={form.teacherName}
                    onChange={(e) => setForm({ ...form, teacherName: e.target.value })}
                  />
                </div>
              </>
            ) : null}

            {type === 'DEATH' ? (
              <>
                <div>
                  <Label>Burial date</Label>
                  <Input
                    type="date"
                    value={form.burialDate}
                    onChange={(e) => setForm({ ...form, burialDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Burial place / cemetery</Label>
                  <Input
                    value={form.cemeteryName}
                    onChange={(e) => setForm({ ...form, cemeteryName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Grave number</Label>
                  <Input
                    value={form.graveNumber}
                    onChange={(e) => setForm({ ...form, graveNumber: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Place of death</Label>
                  <Input
                    value={form.placeOfDeath}
                    onChange={(e) => setForm({ ...form, placeOfDeath: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Cause of death</Label>
                  <Input
                    value={form.causeOfDeath}
                    onChange={(e) => setForm({ ...form, causeOfDeath: e.target.value })}
                  />
                </div>
              </>
            ) : null}

            {extraFields}
            <div className="sm:col-span-2">
              <Label>Remarks</Label>
              <Input
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={() => create.mutate()} disabled={!form.parishId || create.isPending}>
                Save & issue certificate
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardContent className="p-0">
          <DataTable columns={columns} rows={(rows.data || []) as Record<string, unknown>[]} />
        </CardContent>
      </Card>
    </div>
  );
}
