'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader, TextArea } from '@bcl/ui';
import { api } from '@/lib/api';

type Row = {
  id: string;
  email: string;
  name?: string | null;
  status: string;
  createdAt: string;
};

type Campaign = {
  id: string;
  subject: string;
  body: string;
  status: string;
  sentCount: number;
  scheduledAt?: string | null;
};

export default function CmsNewsletterPage() {
  const qc = useQueryClient();
  const subs = useQuery({
    queryKey: ['cms-nl-subs'],
    queryFn: () => api.get<Row[]>('/cms/newsletter/subscribers'),
  });
  const campaigns = useQuery({
    queryKey: ['cms-nl-camps'],
    queryFn: () => api.get<Campaign[]>('/cms/newsletter/campaigns'),
  });
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [testEmail, setTestEmail] = useState('');

  const add = useMutation({
    mutationFn: () => api.post('/cms/newsletter/subscribers', { email, name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-nl-subs'] });
      setEmail('');
      setName('');
    },
  });
  const create = useMutation({
    mutationFn: () => api.post('/cms/newsletter/campaigns', { subject, body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-nl-camps'] });
      setSubject('');
      setBody('');
    },
  });
  const send = useMutation({
    mutationFn: (id: string) => api.post(`/cms/newsletter/campaigns/${id}/send`, { testEmail: testEmail || undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-nl-camps'] }),
  });

  return (
    <div>
      <PageHeader title="Newsletter" description="Subscriber list, compose, schedule and send test emails. Nothing sends until you confirm." />
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="cms-panel space-y-3 p-4">
          <h3 className="font-semibold">Add subscriber</h3>
          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={() => add.mutate()} disabled={!email || add.isPending}>
            Add
          </Button>
          <p className="text-xs text-[var(--bcl-muted)]">{subs.data?.length || 0} subscribers</p>
          <ul className="max-h-48 space-y-1 overflow-auto text-sm">
            {(subs.data || []).slice(0, 20).map((s) => (
              <li key={s.id}>
                {s.email} · {s.status}
              </li>
            ))}
          </ul>
        </div>
        <div className="cms-panel space-y-3 p-4">
          <h3 className="font-semibold">Compose</h3>
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Label>Body</Label>
          <TextArea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          <Button onClick={() => create.mutate()} disabled={!subject || create.isPending}>
            Save draft
          </Button>
        </div>
      </div>
      <div className="cms-panel space-y-3 p-4">
        <Label>Send test to</Label>
        <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="optional test email" />
        {(campaigns.data || []).map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--bcl-border)] py-2">
            <div>
              <strong>{c.subject}</strong>
              <p className="text-xs text-[var(--bcl-muted)]">
                {c.status} · sent {c.sentCount}
              </p>
            </div>
            <Button variant="secondary" onClick={() => send.mutate(c.id)}>
              {testEmail ? 'Send test' : 'Send'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
