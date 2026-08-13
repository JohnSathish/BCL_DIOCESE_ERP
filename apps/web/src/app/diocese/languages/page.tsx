'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, PageHeader } from '@bcl/ui';
import { api } from '@/lib/api';
import { useState } from 'react';

type LangRow = {
  code: string;
  nativeName: string;
  englishName: string;
  enabled: boolean;
  sortOrder: number;
  isDefault: boolean;
};

export default function LanguagesPage() {
  const qc = useQueryClient();
  const langs = useQuery({
    queryKey: ['i18n-languages'],
    queryFn: () => api.get<LangRow[]>('/i18n/languages'),
  });
  const [importNs, setImportNs] = useState('erp');
  const [importLocale, setImportLocale] = useState('gar');

  const save = useMutation({
    mutationFn: (rows: LangRow[]) =>
      api.put('/i18n/diocese/languages', {
        languages: rows.map((r, i) => ({
          languageCode: r.code,
          enabled: r.enabled,
          sortOrder: i,
          isDefault: r.isDefault,
        })),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['i18n-languages'] }),
  });

  const onToggle = (code: string) => {
    const rows = (langs.data || []).map((r) =>
      r.code === code ? { ...r, enabled: !r.enabled } : r,
    );
    save.mutate(rows);
  };

  const onDefault = (code: string) => {
    const rows = (langs.data || []).map((r) => ({
      ...r,
      isDefault: r.code === code,
      enabled: r.code === code ? true : r.enabled,
    }));
    save.mutate(rows);
  };

  const onExport = async (code: string) => {
    const data = await api.get<Record<string, unknown>>(
      `/i18n/export/${code}/${importNs}`,
    );
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${code}-${importNs}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file: File) => {
    const text = await file.text();
    const payload = JSON.parse(text) as Record<string, unknown>;
    await api.post('/i18n/import', {
      locale: importLocale,
      namespace: importNs,
      payload,
    });
    qc.invalidateQueries({ queryKey: ['i18n-languages'] });
  };

  return (
    <div>
      <PageHeader
        title="Language Management"
        description="Enable languages, set defaults, and import/export translation files for your diocese."
      />
      <div className="cms-panel space-y-3 p-4">
        {(langs.data || []).map((row) => (
          <div
            key={row.code}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--bcl-border)] py-2 last:border-0"
          >
            <div>
              <p className="font-semibold">
                {row.nativeName}{' '}
                <span className="text-sm font-normal text-[var(--bcl-muted)]">
                  ({row.englishName} · {row.code})
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={() => onToggle(row.code)}
                />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="defaultLang"
                  checked={row.isDefault}
                  onChange={() => onDefault(row.code)}
                />
                Default
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="cms-panel mt-4 space-y-3 p-4">
        <h3 className="font-semibold">Import / Export</h3>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded border px-2 py-1 text-sm"
            value={importLocale}
            onChange={(e) => setImportLocale(e.target.value)}
          >
            {(langs.data || []).map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName}
              </option>
            ))}
          </select>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={importNs}
            onChange={(e) => setImportNs(e.target.value)}
          >
            {['common', 'erp', 'cms', 'certificates', 'emails', 'reports', 'mobile'].map((ns) => (
              <option key={ns} value={ns}>
                {ns}
              </option>
            ))}
          </select>
          <Button type="button" onClick={() => onExport(importLocale)}>
            Export JSON
          </Button>
          <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-sm font-semibold">
            Upload JSON
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImport(f);
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
