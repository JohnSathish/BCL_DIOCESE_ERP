'use client';

import {
  DEFAULT_MARRIAGE_TEMPLATE,
  getMarriageTemplates,
  type CertificateTemplateId,
} from './templates/types';

export function CertificateTemplateChooser({
  selected,
  defaultId,
  savingDefault,
  onSelect,
  onSetDefault,
  onContinue,
}: {
  selected: CertificateTemplateId;
  defaultId: CertificateTemplateId;
  savingDefault?: boolean;
  onSelect: (id: CertificateTemplateId) => void;
  onSetDefault: () => void;
  onContinue: () => void;
}) {
  const templates = getMarriageTemplates();

  return (
    <div className="cert-chooser mx-auto max-w-5xl rounded-2xl border border-[var(--bcl-border)] bg-white p-6 shadow-sm">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--bcl-burgundy)]">
          Before you print
        </p>
        <h2 className="mt-1 font-display text-2xl text-[var(--bcl-text)]">
          Choose a marriage certificate template
        </h2>
        <p className="mt-1 text-sm text-[var(--bcl-muted)]">
          Select a design for this print. You can also save one as the parish default for next time.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const active = selected === t.id;
          const isDefault = defaultId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={`rounded-xl border p-4 text-left transition ${
                active
                  ? 'border-[var(--bcl-burgundy)] bg-[var(--bcl-burgundy)]/[0.04] ring-2 ring-[var(--bcl-burgundy)]/25'
                  : 'border-[var(--bcl-border)] hover:border-[var(--bcl-burgundy)]/40'
              }`}
            >
              <div
                className="mb-3 h-20 rounded-lg border"
                style={{
                  borderColor: t.previewAccent,
                  background: `linear-gradient(135deg, ${t.previewAccent}18, #fff 55%)`,
                }}
              />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[var(--bcl-text)]">{t.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--bcl-muted)]">
                    {t.description}
                  </p>
                </div>
                {isDefault ? (
                  <span className="shrink-0 rounded-full bg-[var(--bcl-burgundy)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Default
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onSetDefault}
          disabled={savingDefault || selected === defaultId}
          className="text-sm font-semibold text-[var(--bcl-burgundy)] disabled:opacity-50"
        >
          {selected === defaultId
            ? '✓ Saved as parish default'
            : savingDefault
              ? 'Saving default…'
              : 'Set selected as parish default'}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-[10px] bg-[var(--bcl-burgundy)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--bcl-burgundy-soft)]"
        >
          Continue to preview
        </button>
      </div>
      <p className="mt-3 text-xs text-[var(--bcl-muted)]">
        System fallback default: {DEFAULT_MARRIAGE_TEMPLATE}
      </p>
    </div>
  );
}
