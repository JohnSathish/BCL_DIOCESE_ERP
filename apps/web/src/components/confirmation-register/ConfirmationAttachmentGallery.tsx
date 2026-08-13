'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Label } from '@bcl/ui';
import type { ConfirmationAttachment } from './types';

const ATTACHMENT_TYPES = [
  { value: 'photo', labelKey: 'attachments.photo' },
  { value: 'certificate', labelKey: 'attachments.certificate' },
  { value: 'form', labelKey: 'attachments.form' },
  { value: 'scan', labelKey: 'attachments.scan' },
  { value: 'document', labelKey: 'attachments.document' },
] as const;

type Props = {
  attachments: ConfirmationAttachment[];
  onChange: (attachments: ConfirmationAttachment[]) => void;
  onUpload: (file: File, type: string) => Promise<ConfirmationAttachment>;
  uploading?: boolean;
};

export function ConfirmationAttachmentGallery({ attachments, onChange, onUpload, uploading }: Props) {
  const t = useTranslations('certificates.confirmation');
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingType = useRef<string>('document');

  const remove = (url: string) => onChange(attachments.filter((a) => a.url !== url));

  return (
    <div className="ecr-attachments">
      <Label>{t('fields.attachments')}</Label>
      <div className="ecr-attachment-types">
        {ATTACHMENT_TYPES.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            variant="secondary"
            disabled={uploading}
            onClick={() => {
              pendingType.current = opt.value;
              fileRef.current?.click();
            }}
          >
            {uploading ? t('actions.uploading') : t(opt.labelKey)}
          </Button>
        ))}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        multiple
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = '';
          const added: ConfirmationAttachment[] = [];
          for (const file of files) {
            const att = await onUpload(file, pendingType.current);
            added.push(att);
          }
          if (added.length) onChange([...attachments, ...added]);
        }}
      />
      <ul className="ecr-attachment-list">
        {attachments.map((a) => (
          <li key={a.url}>
            <span className="ecr-attachment-badge">{a.type}</span>
            <a href={a.url} target="_blank" rel="noreferrer" className="ecr-attachment-name">
              {a.name}
            </a>
            <button type="button" className="ecr-attachment-remove" onClick={() => remove(a.url)}>
              ×
            </button>
          </li>
        ))}
        {!attachments.length ? <li className="ecr-muted">{t('attachments.empty')}</li> : null}
      </ul>
    </div>
  );
}
