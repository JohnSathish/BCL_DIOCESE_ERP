'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

const ACTIONS = [
  { id: 'improve', label: 'Improve writing' },
  { id: 'grammar', label: 'Correct grammar' },
  { id: 'summarise', label: 'Summarise' },
  { id: 'headline', label: 'Generate headline' },
  { id: 'excerpt', label: 'Generate excerpt' },
  { id: 'translate', label: 'Translate' },
  { id: 'announcement', label: 'Generate announcement' },
] as const;

type Props = {
  title?: string;
  text: string;
  locale?: string;
  onApply: (field: 'title' | 'excerpt' | 'content', value: string) => void;
};

export function AiAssistBar({ title, text, locale, onApply }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function run(action: string) {
    setBusy(action);
    setNote(null);
    try {
      const res = await api.post<{ suggestion: string; note?: string }>('/cms/ai-assist', {
        action,
        title,
        text,
        locale,
      });
      const suggestion = res.suggestion || '';
      if (action === 'headline') onApply('title', suggestion);
      else if (action === 'excerpt' || action === 'summarise' || action === 'summarize') {
        onApply('excerpt', suggestion);
      } else {
        onApply('content', suggestion);
      }
      setNote(res.note || 'Draft suggestion only — nothing was published.');
    } catch {
      setNote('AI assistant is unavailable. Your draft was not changed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="sm:col-span-2 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--bcl-muted)]">
        AI writing assistant
      </p>
      <div className="flex flex-wrap gap-1.5">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void run(a.id)}
            className="rounded-full border border-[var(--bcl-border)] bg-white px-3 py-1 text-[11px] font-semibold hover:border-[var(--bcl-burgundy)]/40 disabled:opacity-50"
          >
            {busy === a.id ? 'Working…' : a.label}
          </button>
        ))}
      </div>
      {note ? <p className="text-xs text-emerald-700">{note}</p> : null}
    </div>
  );
}
