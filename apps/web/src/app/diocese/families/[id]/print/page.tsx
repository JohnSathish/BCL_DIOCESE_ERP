'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function FamilyPrintPage() {
  const params = useParams<{ id: string }>();
  const family = useQuery({
    queryKey: ['family-print', params.id],
    queryFn: () => api.get<Record<string, unknown>>(`/families/${params.id}`),
  });
  const qr = useQuery({
    queryKey: ['family-qr-print', params.id],
    queryFn: () =>
      api.get<{ dataUrl: string }>(`/families/${params.id}/qr`),
  });

  if (!family.data) return <p className="p-8">Loading…</p>;

  const memberships = (family.data.memberships as Array<{
    isHead: boolean;
    relation?: string;
    member: {
      firstName: string;
      lastName: string;
      memberCode: string;
      occupation?: string;
      phone?: string;
    };
  }>) || [];

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-black print:p-0">
      <div className="mb-6 flex items-start justify-between border-b border-stone-300 pb-4">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-stone-500">
            Parish Family Book
          </p>
          <h1 className="font-display mt-1 text-3xl text-[#722f37]">
            {String(family.data.familyCode)}
          </h1>
          <p className="mt-1 text-sm">
            {String(family.data.houseName || '')} · {String(family.data.village || '')}
          </p>
        </div>
        {qr.data?.dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr.data.dataUrl} alt="QR" width={96} height={96} />
        ) : null}
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-stone-300">
            <th className="py-2">Member</th>
            <th>Code</th>
            <th>Relation</th>
            <th>Occupation</th>
            <th>Phone</th>
          </tr>
        </thead>
        <tbody>
          {memberships.map((m) => (
            <tr key={m.member.memberCode} className="border-b border-stone-200">
              <td className="py-2">
                {m.member.firstName} {m.member.lastName}
              </td>
              <td>{m.member.memberCode}</td>
              <td>{m.isHead ? 'Head' : m.relation || '—'}</td>
              <td>{m.member.occupation || '—'}</td>
              <td>{m.member.phone || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="mt-8 rounded-lg bg-[#722f37] px-4 py-2 text-sm text-white print:hidden"
        onClick={() => window.print()}
      >
        Print
      </button>
    </div>
  );
}
