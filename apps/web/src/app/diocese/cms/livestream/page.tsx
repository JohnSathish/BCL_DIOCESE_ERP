'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';

export default function CmsLivestreamPage() {
  const qc = useQueryClient();
  const site = useQuery({
    queryKey: ['cms-me-site'],
    queryFn: () =>
      api.get<{ livestreamUrl?: string | null; livestreamProvider?: string | null }>('/cms/me/site'),
  });
  const [url, setUrl] = useState('');
  const [provider, setProvider] = useState('youtube');

  useEffect(() => {
    setUrl(site.data?.livestreamUrl || '');
    setProvider(site.data?.livestreamProvider || 'youtube');
  }, [site.data]);

  const save = useMutation({
    mutationFn: () => api.patch('/cms/me/site', { livestreamUrl: url, livestreamProvider: provider }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-me-site'] }),
  });

  return (
    <div>
      <PageHeader
        title="Live streaming"
        description="YouTube Live, Facebook Live, or an embedded Mass recording. The same URL appears on the website and parish app."
        actions={<Button onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save stream'}</Button>}
      />
      <div className="cms-panel grid max-w-xl gap-3 p-4">
        <div>
          <Label>Provider</Label>
          <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="youtube / facebook / vimeo" />
        </div>
        <div>
          <Label>Live stream URL</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/live/…" />
        </div>
        {url ? (
          <p className="text-xs text-[var(--bcl-muted)]">
            Public pages and the mobile app will show this player while the URL is set.
          </p>
        ) : null}
      </div>
    </div>
  );
}
