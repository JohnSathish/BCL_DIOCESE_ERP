'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

export default function RegisterBookPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const page = Number(search.get('page') || 1);

  const data = useQuery({
    queryKey: ['register-page', params.id, page],
    queryFn: () =>
      api.get<{
        book: { title: string; type: string; year: number; pageSize: number };
        page: number;
        totalPages: number;
        entries: Array<{
          lineNumber: number;
          summary: string;
          sacrament?: {
            registerNumber: string;
            celebratedAt: string;
            member?: { firstName: string; lastName: string };
          };
        }>;
      }>(`/registers/${params.id}/pages/${page}`),
  });

  return (
    <div>
      <PageHeader
        title={data.data?.book.title || 'Register book'}
        description={
          data.data
            ? `${data.data.book.type} · ${data.data.book.year} · Page ${data.data.page} of ${data.data.totalPages}`
            : 'Loading…'
        }
        actions={
          <div className="flex gap-2">
            <Link href={`/diocese/registers/${params.id}?page=${Math.max(1, page - 1)}`}>
              <Button variant="secondary" disabled={page <= 1}>
                Previous page
              </Button>
            </Link>
            <Link
              href={`/diocese/registers/${params.id}?page=${Math.min(data.data?.totalPages || page, page + 1)}`}
            >
              <Button
                variant="secondary"
                disabled={!!data.data && page >= data.data.totalPages}
              >
                Next page
              </Button>
            </Link>
          </div>
        }
      />
      <Card>
        <CardContent>
          <div className="mb-4 border-b border-[var(--bcl-border)] pb-3 text-center">
            <p className="font-display text-2xl text-[var(--bcl-burgundy)]">
              {data.data?.book.title}
            </p>
            <p className="text-sm text-[var(--bcl-muted)]">
              Page {page} · {data.data?.book.pageSize || 20} lines per page
            </p>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--bcl-border)] text-[var(--bcl-muted)]">
                <th className="py-2 pr-3">Line</th>
                <th className="py-2">Entry</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {(data.data?.entries || []).map((e) => (
                <tr key={e.lineNumber} className="border-b border-[var(--bcl-border)]/70">
                  <td className="py-2 pr-3 font-medium">{e.lineNumber}</td>
                  <td className="py-2">{e.summary}</td>
                  <td className="py-2">
                    {e.sacrament?.celebratedAt
                      ? new Date(e.sacrament.celebratedAt).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
              {!data.data?.entries?.length ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-[var(--bcl-muted)]">
                    No entries on this page
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
