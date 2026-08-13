'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, PageHeader, Select } from '@bcl/ui';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { APPOINTMENT_TYPES, clergyTypeLabel } from '@/lib/clergy';

type Institution = {
  id: string;
  name: string;
  type: string;
  parishId?: string | null;
};

export default function PriestProfilePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [status, setStatus] = useState('ACTIVE');
  const [statusNote, setStatusNote] = useState('');
  const [profileEdit, setProfileEdit] = useState({
    faculties: '',
    jubileeDate: '',
    vehicleNote: '',
    passportNumber: '',
    passportExpiry: '',
    passportCountry: '',
  });
  const [assignment, setAssignment] = useState({
    institutionId: '',
    parishId: '',
    role: 'Chaplain',
    appointmentType: 'ADDITIONAL',
    appointedBy: '',
    orderReference: '',
    residence: '',
    responsibilities: '',
    remarks: '',
    isPrimary: false,
    isCurrent: true,
  });
  const [profileCore, setProfileCore] = useState({
    homeDiocese: '',
    province: '',
    currentResidence: '',
    specialResponsibilities: '',
    remarks: '',
  });
  const [leave, setLeave] = useState({
    statusType: 'ON_LEAVE',
    reason: '',
    startsAt: '',
    endsAt: '',
  });

  const profile = useQuery({
    queryKey: ['priest', id],
    queryFn: () => api.get<Record<string, unknown>>(`/priests/${id}`),
    enabled: Boolean(id),
  });
  const parishes = useQuery({
    queryKey: ['parishes'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/parishes'),
  });
  const institutions = useQuery({
    queryKey: ['institutions'],
    queryFn: () => api.get<Institution[]>('/institutions'),
  });

  useEffect(() => {
    if (!profile.data) return;
    const p = profile.data;
    setStatus(String(p.status || 'ACTIVE'));
    const faculties = p.facultiesJson;
    const passport = (p.passportMetaJson as Record<string, string> | null) || {};
    setProfileEdit({
      faculties: Array.isArray(faculties)
        ? (faculties as string[]).join(', ')
        : faculties
          ? JSON.stringify(faculties)
          : '',
      jubileeDate: p.jubileeDate ? String(p.jubileeDate).slice(0, 10) : '',
      vehicleNote: String(p.vehicleNote || ''),
      passportNumber: String(passport.number || ''),
      passportExpiry: passport.expiry ? String(passport.expiry).slice(0, 10) : '',
      passportCountry: String(passport.country || ''),
    });
    setProfileCore({
      homeDiocese: String(p.homeDiocese || ''),
      province: String(p.province || ''),
      currentResidence: String(p.currentResidence || ''),
      specialResponsibilities: String(p.specialResponsibilities || ''),
      remarks: String(p.remarks || ''),
    });
  }, [profile.data]);

  const updateStatus = useMutation({
    mutationFn: () => api.patch(`/priests/${id}`, { status, statusNote }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priest', id] }),
  });

  const saveProfileMeta = useMutation({
    mutationFn: () => {
      const facultiesJson = profileEdit.faculties
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const passportMetaJson =
        profileEdit.passportNumber || profileEdit.passportExpiry || profileEdit.passportCountry
          ? {
              number: profileEdit.passportNumber || undefined,
              expiry: profileEdit.passportExpiry || undefined,
              country: profileEdit.passportCountry || undefined,
            }
          : null;
      return api.patch(`/priests/${id}`, {
        facultiesJson: facultiesJson.length ? facultiesJson : null,
        jubileeDate: profileEdit.jubileeDate || null,
        vehicleNote: profileEdit.vehicleNote || null,
        passportMetaJson,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priest', id] }),
  });

  const saveProfileCore = useMutation({
    mutationFn: () =>
      api.patch(`/priests/${id}`, {
        homeDiocese: profileCore.homeDiocese || null,
        province: profileCore.province || null,
        currentResidence: profileCore.currentResidence || null,
        specialResponsibilities: profileCore.specialResponsibilities || null,
        remarks: profileCore.remarks || null,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priest', id] }),
  });

  const addAssignment = useMutation({
    mutationFn: () =>
      api.post(`/priests/${id}/assignments`, {
        institutionId: assignment.institutionId || undefined,
        parishId: assignment.parishId || undefined,
        role: assignment.role,
        designation: assignment.role,
        appointmentType: assignment.appointmentType,
        appointedBy: assignment.appointedBy || undefined,
        orderReference: assignment.orderReference || undefined,
        residence: assignment.residence || undefined,
        responsibilities: assignment.responsibilities || undefined,
        remarks: assignment.remarks || undefined,
        isPrimary: assignment.isPrimary,
        isCurrent: assignment.isCurrent,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['priest', id] });
      setAssignment({
        institutionId: '',
        parishId: '',
        role: 'Chaplain',
        appointmentType: 'ADDITIONAL',
        appointedBy: '',
        orderReference: '',
        residence: '',
        responsibilities: '',
        remarks: '',
        isPrimary: false,
        isCurrent: true,
      });
    },
  });

  const requestLeave = useMutation({
    mutationFn: () =>
      api.post(`/priests/${id}/leave`, {
        statusType: leave.statusType,
        reason: leave.reason || undefined,
        startsAt: new Date(leave.startsAt).toISOString(),
        endsAt: new Date(leave.endsAt).toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['priest', id] });
      setLeave({ statusType: 'ON_LEAVE', reason: '', startsAt: '', endsAt: '' });
    },
  });

  const reviewLeave = useMutation({
    mutationFn: ({
      leaveId,
      decision,
    }: {
      leaveId: string;
      decision: 'APPROVED' | 'REJECTED' | 'CANCELLED';
    }) => api.patch(`/priests/leave/${leaveId}/review`, { decision }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priest', id] }),
  });

  const p = profile.data;
  const timeline = (p?.timeline as { date: string; title: string; detail?: string }[]) || [];
  const assignments =
    (p?.assignments as Array<{
      id: string;
      role?: string;
      designation?: string;
      appointmentType?: string;
      appointedBy?: string;
      orderReference?: string;
      residence?: string;
      responsibilities?: string;
      remarks?: string;
      status?: string;
      isCurrent?: boolean;
      isPrimary?: boolean;
      startDate?: string;
      endDate?: string;
      parish?: { name: string };
      institution?: { name: string; type: string };
    }>) || [];
  const leaveRequests =
    (p?.leaveRequests as Array<{
      id: string;
      status: string;
      statusType: string;
      reason?: string;
      startsAt: string;
      endsAt: string;
    }>) || [];
  const upcomingMasses =
    (p?.upcomingMasses as Array<{
      id: string;
      title: string;
      type?: string;
      scheduledAt: string;
      language?: string;
      parish?: { name: string };
      celebrantPriestId?: string;
    }>) || [];
  const transfers =
    (p?.transfers as Array<{
      id: string;
      orderNo?: string;
      status: string;
      effectiveDate: string;
      toParish?: { name: string };
      newRole?: string;
    }>) || [];

  const institutionOptions = institutions.data || [];

  if (profile.isLoading) {
    return <p className="p-6 text-slate-500">Loading priest profile…</p>;
  }
  if (!p) {
    return <p className="p-6 text-red-600">Priest not found</p>;
  }

  return (
    <div>
      <PageHeader
        title={`${String(p.title || 'Fr.')} ${String(p.firstName)} ${String(p.lastName)}`}
        description={`${clergyTypeLabel(String(p.clergyType || 'DIOCESAN'))} · ${String(p.status)} · Code ${String(p.code)}`}
        actions={
          <Link href="/diocese/priests">
            <Button variant="secondary">Back to directory</Button>
          </Link>
        }
      />

      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-[#7B1E2B] to-[#0F3D91] p-6 text-white">
        <p className="text-sm text-white/70">
          {(p.congregation as { name?: string })?.name || 'Diocesan'}
          {p.homeDiocese ? ` · Home: ${String(p.homeDiocese)}` : ''}
          {p.religiousName ? ` · ${String(p.religiousName)}` : ''}
        </p>
        <p className="mt-2 text-lg font-semibold">
          {[p.phone, p.email].filter(Boolean).join(' · ') || 'No contact on file'}
        </p>
        <p className="mt-1 text-sm text-white/80">
          Ordained:{' '}
          {p.ordinationDate
            ? new Date(String(p.ordinationDate)).toLocaleDateString()
            : '—'}
          {p.ordainedBy ? ` by ${String(p.ordainedBy)}` : ''}
          {p.jubileeDate
            ? ` · Jubilee ${new Date(String(p.jubileeDate)).toLocaleDateString()}`
            : ''}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 pt-4 text-sm">
            <h3 className="font-semibold text-slate-900">Master profile</h3>
            <p>
              <span className="text-slate-500">DOB:</span>{' '}
              {p.dateOfBirth ? new Date(String(p.dateOfBirth)).toLocaleDateString() : '—'}
            </p>
            <p>
              <span className="text-slate-500">Blood group:</span> {String(p.bloodGroup || '—')}
            </p>
            <p>
              <span className="text-slate-500">Languages:</span>{' '}
              {Array.isArray(p.languages) ? (p.languages as string[]).join(', ') : '—'}
            </p>
            <p>
              <span className="text-slate-500">Education:</span> {String(p.education || '—')}
            </p>
            <p>
              <span className="text-slate-500">Specialization:</span>{' '}
              {String(p.specialization || '—')}
            </p>
            <p>
              <span className="text-slate-500">Special responsibilities:</span>{' '}
              {String(p.specialResponsibilities || '—')}
            </p>
            <p>
              <span className="text-slate-500">Home diocese:</span>{' '}
              {String(p.homeDiocese || '—')}
            </p>
            <p>
              <span className="text-slate-500">Province:</span> {String(p.province || '—')}
            </p>
            <p>
              <span className="text-slate-500">Address:</span> {String(p.address || '—')}
            </p>
            <p>
              <span className="text-slate-500">Current residence:</span>{' '}
              {String(p.currentResidence || '—')}
            </p>
            <p>
              <span className="text-slate-500">Emergency:</span>{' '}
              {String(p.emergencyContact || '—')}
            </p>
            <p>
              <span className="text-slate-500">Vehicle:</span> {String(p.vehicleNote || '—')}
            </p>
            <p>
              <span className="text-slate-500">Remarks:</span> {String(p.remarks || '—')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-4">
            <h3 className="font-semibold text-slate-900">Service identity</h3>
            <div>
              <Label>Home diocese</Label>
              <Input
                value={profileCore.homeDiocese}
                onChange={(e) => setProfileCore({ ...profileCore, homeDiocese: e.target.value })}
                placeholder="Belongs to another diocese?"
              />
            </div>
            <div>
              <Label>Province</Label>
              <Input
                value={profileCore.province}
                onChange={(e) => setProfileCore({ ...profileCore, province: e.target.value })}
              />
            </div>
            <div>
              <Label>Current residence</Label>
              <Input
                value={profileCore.currentResidence}
                onChange={(e) =>
                  setProfileCore({ ...profileCore, currentResidence: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Special responsibilities</Label>
              <Input
                value={profileCore.specialResponsibilities}
                onChange={(e) =>
                  setProfileCore({ ...profileCore, specialResponsibilities: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Remarks</Label>
              <Input
                value={profileCore.remarks}
                onChange={(e) => setProfileCore({ ...profileCore, remarks: e.target.value })}
              />
            </div>
            <Button onClick={() => saveProfileCore.mutate()}>Save service identity</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-4">
            <h3 className="font-semibold text-slate-900">Faculties & travel meta</h3>
            <div>
              <Label>Faculties (comma-separated)</Label>
              <Input
                value={profileEdit.faculties}
                onChange={(e) => setProfileEdit({ ...profileEdit, faculties: e.target.value })}
                placeholder="Confession, Marriage, Baptism"
              />
            </div>
            <div>
              <Label>Jubilee date</Label>
              <Input
                type="date"
                value={profileEdit.jubileeDate}
                onChange={(e) => setProfileEdit({ ...profileEdit, jubileeDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Vehicle note</Label>
              <Input
                value={profileEdit.vehicleNote}
                onChange={(e) => setProfileEdit({ ...profileEdit, vehicleNote: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Passport #</Label>
                <Input
                  value={profileEdit.passportNumber}
                  onChange={(e) =>
                    setProfileEdit({ ...profileEdit, passportNumber: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Expiry</Label>
                <Input
                  type="date"
                  value={profileEdit.passportExpiry}
                  onChange={(e) =>
                    setProfileEdit({ ...profileEdit, passportExpiry: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  value={profileEdit.passportCountry}
                  onChange={(e) =>
                    setProfileEdit({ ...profileEdit, passportCountry: e.target.value })
                  }
                />
              </div>
            </div>
            <Button onClick={() => saveProfileMeta.mutate()}>Save profile meta</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-4">
            <h3 className="font-semibold text-slate-900">Availability</h3>
            <div>
              <Label>Status</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {[
                  'ACTIVE',
                  'BUSY',
                  'ON_LEAVE',
                  'RETREAT',
                  'VACATION',
                  'MEDICAL_LEAVE',
                  'UNAVAILABLE',
                  'RETIRED',
                  'DECEASED',
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Note</Label>
              <Input value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
            </div>
            <Button onClick={() => updateStatus.mutate()}>Update status</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-4">
            <h3 className="font-semibold text-slate-900">Leave request</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Type</Label>
                <Select
                  value={leave.statusType}
                  onChange={(e) => setLeave({ ...leave, statusType: e.target.value })}
                >
                  {['ON_LEAVE', 'RETREAT', 'VACATION', 'MEDICAL_LEAVE', 'UNAVAILABLE'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Reason</Label>
                <Input
                  value={leave.reason}
                  onChange={(e) => setLeave({ ...leave, reason: e.target.value })}
                />
              </div>
              <div>
                <Label>Starts</Label>
                <Input
                  type="datetime-local"
                  value={leave.startsAt}
                  onChange={(e) => setLeave({ ...leave, startsAt: e.target.value })}
                />
              </div>
              <div>
                <Label>Ends</Label>
                <Input
                  type="datetime-local"
                  value={leave.endsAt}
                  onChange={(e) => setLeave({ ...leave, endsAt: e.target.value })}
                />
              </div>
            </div>
            <Button
              onClick={() => requestLeave.mutate()}
              disabled={!leave.startsAt || !leave.endsAt}
            >
              Submit leave request
            </Button>

            <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3">
              {leaveRequests.map((lr) => (
                <li
                  key={lr.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-semibold">
                      {lr.statusType} · {lr.status}
                    </p>
                    <p className="text-slate-600">
                      {new Date(lr.startsAt).toLocaleString()} →{' '}
                      {new Date(lr.endsAt).toLocaleString()}
                      {lr.reason ? ` · ${lr.reason}` : ''}
                    </p>
                  </div>
                  {lr.status === 'PENDING' ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          reviewLeave.mutate({ leaveId: lr.id, decision: 'APPROVED' })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          reviewLeave.mutate({ leaveId: lr.id, decision: 'REJECTED' })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
              {!leaveRequests.length ? (
                <p className="text-sm text-slate-500">No leave requests yet.</p>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="pt-4">
          <h3 className="mb-4 font-semibold text-slate-900">Appointment history</h3>
          <p className="mb-3 text-sm text-slate-500">
            Past appointments are preserved — transfers never overwrite history.
          </p>
          <ul className="space-y-3">
            {assignments.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-semibold">
                    {a.designation || a.role}
                    {a.appointmentType ? ` · ${a.appointmentType}` : ''}
                    {a.isPrimary ? ' · Primary' : ''}
                    {a.isCurrent ? ' · Current' : ''}
                    {a.status && a.status !== 'ACTIVE' ? ` · ${a.status}` : ''}
                  </p>
                  <p className="text-sm text-slate-600">
                    {a.institution?.name || a.parish?.name || '—'}
                    {a.institution?.type ? ` (${a.institution.type})` : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {[
                      a.orderReference ? `Order ${a.orderReference}` : null,
                      a.appointedBy ? `Appointed by ${a.appointedBy}` : null,
                      a.residence ? `Residence: ${a.residence}` : null,
                      a.responsibilities,
                      a.remarks,
                    ]
                      .filter(Boolean)
                      .join(' · ') || null}
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  {a.startDate ? new Date(a.startDate).getFullYear() : ''}
                  {a.endDate ? `–${new Date(a.endDate).getFullYear()}` : '–present'}
                </p>
              </li>
            ))}
            {!assignments.length ? (
              <p className="text-sm text-slate-500">No appointments yet.</p>
            ) : null}
          </ul>

          <div className="mt-6 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Institution</Label>
              <Select
                value={assignment.institutionId}
                onChange={(e) => {
                  const institutionId = e.target.value;
                  const inst = institutionOptions.find((x) => x.id === institutionId);
                  setAssignment({
                    ...assignment,
                    institutionId,
                    parishId: inst?.parishId || '',
                  });
                }}
              >
                <option value="">Select institution</option>
                {institutionOptions.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} ({x.type})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Or parish</Label>
              <Select
                value={assignment.parishId}
                onChange={(e) =>
                  setAssignment({ ...assignment, parishId: e.target.value, institutionId: '' })
                }
              >
                <option value="">Select parish</option>
                {(parishes.data || []).map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Appointment type</Label>
              <Select
                value={assignment.appointmentType}
                onChange={(e) =>
                  setAssignment({ ...assignment, appointmentType: e.target.value })
                }
              >
                {APPOINTMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Designation</Label>
              <Input
                value={assignment.role}
                onChange={(e) => setAssignment({ ...assignment, role: e.target.value })}
              />
            </div>
            <div>
              <Label>Appointed by</Label>
              <Input
                value={assignment.appointedBy}
                onChange={(e) => setAssignment({ ...assignment, appointedBy: e.target.value })}
              />
            </div>
            <div>
              <Label>Order / reference</Label>
              <Input
                value={assignment.orderReference}
                onChange={(e) => setAssignment({ ...assignment, orderReference: e.target.value })}
              />
            </div>
            <div>
              <Label>Residence</Label>
              <Input
                value={assignment.residence}
                onChange={(e) => setAssignment({ ...assignment, residence: e.target.value })}
              />
            </div>
            <div>
              <Label>Responsibilities</Label>
              <Input
                value={assignment.responsibilities}
                onChange={(e) =>
                  setAssignment({ ...assignment, responsibilities: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Remarks</Label>
              <Input
                value={assignment.remarks}
                onChange={(e) => setAssignment({ ...assignment, remarks: e.target.value })}
              />
            </div>
            <div className="flex flex-wrap items-end gap-3 sm:col-span-2 lg:col-span-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={assignment.isPrimary}
                  onChange={(e) =>
                    setAssignment({ ...assignment, isPrimary: e.target.checked })
                  }
                />
                Primary
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={assignment.isCurrent}
                  onChange={(e) =>
                    setAssignment({ ...assignment, isCurrent: e.target.checked })
                  }
                />
                Current
              </label>
              <Button
                onClick={() => addAssignment.mutate()}
                disabled={!assignment.institutionId && !assignment.parishId}
              >
                Add appointment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-4">
            <h3 className="mb-4 font-semibold text-slate-900">Upcoming masses</h3>
            <ul className="space-y-3">
              {upcomingMasses.map((m) => (
                <li key={m.id} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
                  <p className="font-semibold">{m.title}</p>
                  <p className="text-slate-600">
                    {new Date(m.scheduledAt).toLocaleString()}
                    {m.parish?.name ? ` · ${m.parish.name}` : ''}
                    {m.language ? ` · ${m.language}` : ''}
                    {m.celebrantPriestId === id ? ' · Celebrant' : ' · Assistant'}
                  </p>
                </li>
              ))}
              {!upcomingMasses.length ? (
                <p className="text-sm text-slate-500">No upcoming mass assignments.</p>
              ) : null}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <h3 className="mb-4 font-semibold text-slate-900">Transfer history</h3>
            <ul className="space-y-3">
              {transfers.map((t) => (
                <li key={t.id} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
                  <p className="font-semibold">
                    {t.orderNo || t.id.slice(0, 8)} · {t.status}
                  </p>
                  <p className="text-slate-600">
                    {new Date(t.effectiveDate).toLocaleDateString()}
                    {t.toParish?.name ? ` → ${t.toParish.name}` : ''}
                    {t.newRole ? ` · ${t.newRole}` : ''}
                  </p>
                </li>
              ))}
              {!transfers.length ? (
                <p className="text-sm text-slate-500">No transfer orders yet.</p>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="pt-4">
          <h3 className="mb-4 font-semibold text-slate-900">Ministry timeline</h3>
          <ol className="relative ml-3 border-l border-[#7B1E2B]/30">
            {timeline.map((t, i) => (
              <li key={`${t.date}-${t.title}-${i}`} className="mb-6 ml-6">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-[#7B1E2B]" />
                <p className="text-xs font-bold uppercase tracking-wide text-[#C8A24B]">
                  {t.date}
                </p>
                <p className="font-semibold text-slate-900">{t.title}</p>
                {t.detail ? <p className="text-sm text-slate-600">{t.detail}</p> : null}
              </li>
            ))}
            {!timeline.length ? (
              <p className="ml-6 text-sm text-slate-500">No timeline events yet.</p>
            ) : null}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
