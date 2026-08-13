'use client';

import { useMemo, useState } from 'react';
import { API_BASE } from '@/lib/api';

export type CmsFormField = {
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'number';
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

export type CmsPublicFormDef = {
  slug: string;
  title: string;
  description?: string | null;
  fieldsJson?: { fields?: CmsFormField[] } | null;
};

type Props = {
  siteSlug: string;
  form: CmsPublicFormDef;
  className?: string;
  fieldClassName?: string;
  buttonClassName?: string;
  successClassName?: string;
  submitLabel?: string;
  onSuccess?: () => void;
};

export function CmsPublicForm({
  siteSlug,
  form,
  className = 'space-y-4',
  fieldClassName = 'mt-1.5 w-full rounded-lg border border-[var(--bcl-border)] px-3 py-2 text-sm',
  buttonClassName = 'rounded-lg bg-[var(--bcl-burgundy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60',
  successClassName = 'rounded-xl bg-[var(--bcl-cream,#f5f0eb)] p-4 text-sm',
  submitLabel = 'Submit',
  onSuccess,
}: Props) {
  const fields = useMemo(
    () => form.fieldsJson?.fields || [],
    [form.fieldsJson],
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(
        `${API_BASE}/cms/public/${encodeURIComponent(siteSlug)}/forms/${encodeURIComponent(form.slug)}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: values }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Unable to submit form');
      }
      setSent(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit form');
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <p className={successClassName}>
        Thank you. Your submission has been received by the parish office.
      </p>
    );
  }

  return (
    <form className={className} onSubmit={handleSubmit}>
      {fields.map((field) => (
        <div key={field.key}>
          <label className="text-xs font-semibold tracking-wide uppercase text-[var(--bcl-muted,#64748b)]">
            {field.label}
            {field.required ? ' *' : ''}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              required={field.required}
              rows={4}
              value={values[field.key] || ''}
              placeholder={field.placeholder}
              onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
              className={`${fieldClassName} resize-none`}
            />
          ) : field.type === 'select' ? (
            <select
              required={field.required}
              value={values[field.key] || ''}
              onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
              className={fieldClassName}
            >
              <option value="">Select…</option>
              {(field.options || []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              required={field.required}
              type={field.type === 'number' ? 'number' : field.type}
              value={values[field.key] || ''}
              placeholder={field.placeholder}
              onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
              className={fieldClassName}
            />
          )}
        </div>
      ))}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" disabled={pending} className={buttonClassName}>
        {pending ? 'Sending…' : submitLabel}
      </button>
    </form>
  );
}
