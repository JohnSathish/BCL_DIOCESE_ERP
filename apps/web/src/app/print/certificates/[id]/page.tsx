'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { CertificateTemplateChooser } from '@/components/certificates/CertificateTemplateChooser';
import { buildMarriageViewModel } from '@/components/certificates/templates/build-marriage-vm';
import { buildBaptismViewModel } from '@/components/certificates/templates/build-baptism-vm';
import { buildConfirmationViewModel } from '@/components/certificates/templates/build-confirmation-vm';
import { SacredHeartOrnateMarriageCert } from '@/components/certificates/templates/SacredHeartOrnateMarriageCert';
import { ClassicTuraMarriageCert } from '@/components/certificates/templates/ClassicTuraMarriageCert';
import { PremiumChanceryMarriageCert } from '@/components/certificates/templates/PremiumChanceryMarriageCert';
import { PremiumLandscapeBaptismCert } from '@/components/certificates/templates/PremiumLandscapeBaptismCert';
import { PremiumConfirmationCert } from '@/components/certificates/templates/PremiumConfirmationCert';
import {
  resolveDefaultMarriageTemplate,
  type CertificateTemplateId,
} from '@/components/certificates/templates/types';

/**
 * Certificate-only print surface (no DioceseShell).
 * Screen: light toolbar + certificate preview.
 * Print: only #certificate-print via @media print in print.css.
 */
export function CertificatePrintView({ certificateId }: { certificateId: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const printLocale = searchParams.get('lang') || undefined;
  const tCert = useTranslations('certificates');
  const baptismLabels = useMemo(
    () => ({
      title: tCert('baptism.title'),
      certifyIntro: tCert('fields.certifyIntro'),
      son: tCert('fields.son'),
      daughter: tCert('fields.daughter'),
      child: tCert('fields.child'),
      dateOfBirth: tCert('fields.dateOfBirth'),
      dateOfBaptism: tCert('fields.dateOfBaptism'),
      placeOfBaptism: tCert('fields.placeOfBaptism'),
      celebratedBy: tCert('fields.celebratedBy'),
      godfather: tCert('fields.godfather'),
      godmother: tCert('fields.godmother'),
      registerNo: tCert('fields.registerNo'),
      pageNo: tCert('fields.pageNo'),
      bookNo: tCert('fields.bookNo'),
      certificateNo: tCert('common.certificateNo'),
      issuedOn: tCert('fields.issuedOn'),
      placeOfIssue: tCert('fields.placeOfIssue'),
      parishPriest: tCert('fields.parishPriest'),
      parishSecretary: tCert('fields.parishSecretary'),
      verifyQr: tCert('common.verifyQr'),
    }),
    [tCert],
  );
  const confirmationLabels = useMemo(
    () => ({
      title: tCert('confirmation.certTitle'),
      certifyIntro: tCert('confirmation.certifyIntro'),
      son: tCert('fields.son'),
      daughter: tCert('fields.daughter'),
      child: tCert('fields.child'),
      dateOfBirth: tCert('fields.dateOfBirth'),
      dateOfConfirmation: tCert('confirmation.dateOfConfirmation'),
      placeOfConfirmation: tCert('confirmation.placeOfConfirmation'),
      celebratedBy: tCert('fields.celebratedBy'),
      sponsor: tCert('confirmation.sponsor'),
      registerNo: tCert('confirmation.registerNo'),
      pageNo: tCert('fields.pageNo'),
      bookNo: tCert('fields.bookNo'),
      certificateNo: tCert('common.certificateNo'),
      issuedOn: tCert('fields.issuedOn'),
      placeOfIssue: tCert('fields.placeOfIssue'),
      parishPriest: tCert('fields.parishPriest'),
      verifyQr: tCert('common.verifyQr'),
      father: tCert('confirmation.father'),
      mother: tCert('confirmation.mother'),
    }),
    [tCert],
  );
  const { hydrated, user } = useAuthStore();
  const [chosen, setChosen] = useState(false);
  const [templateId, setTemplateId] = useState<CertificateTemplateId>('sacred-heart-ornate');

  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  const cert = useQuery({
    queryKey: ['certificate-print', certificateId],
    queryFn: () => api.get<Record<string, unknown>>(`/certificates/${certificateId}`),
  });
  const qr = useQuery({
    queryKey: ['certificate-qr-print', certificateId],
    queryFn: () => api.get<{ dataUrl: string }>(`/certificates/${certificateId}/qr`),
  });

  const parish = cert.data?.parish as
    | {
        id?: string;
        name?: string;
        code?: string;
        committeesJson?: unknown;
      }
    | undefined;

  const defaultId = useMemo(() => resolveDefaultMarriageTemplate(parish), [parish]);

  useEffect(() => {
    if (cert.data && String(cert.data.type) === 'MARRIAGE') {
      setTemplateId(defaultId);
    }
  }, [cert.data, defaultId]);

  const saveDefault = useMutation({
    mutationFn: async () => {
      if (!parish?.id) throw new Error('Parish missing');
      const prev =
        parish.committeesJson && typeof parish.committeesJson === 'object'
          ? (parish.committeesJson as Record<string, unknown>)
          : {};
      const prevDefaults =
        prev.certificateDefaults && typeof prev.certificateDefaults === 'object'
          ? (prev.certificateDefaults as Record<string, unknown>)
          : {};
      return api.patch(`/parishes/${parish.id}`, {
        committeesJson: {
          ...prev,
          certificateDefaults: {
            ...prevDefaults,
            MARRIAGE: templateId,
          },
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['certificate-print', certificateId] });
    },
  });

  if (cert.isLoading || !cert.data) {
    return (
      <p className="p-10 text-center text-sm text-stone-500 no-print">Loading certificate…</p>
    );
  }

  const type = String(cert.data.type);
  const payload = (cert.data.payloadJson || {}) as Record<string, unknown>;
  const parishBrief = cert.data.parish as { name?: string } | undefined;
  const orientation = type === 'BAPTISM' ? 'landscape' : 'portrait';

  if (type === 'MARRIAGE' && !chosen) {
    return (
      <div className="cert-chooser px-4 py-8">
        <CertificateTemplateChooser
          selected={templateId}
          defaultId={defaultId}
          savingDefault={saveDefault.isPending}
          onSelect={setTemplateId}
          onSetDefault={() => saveDefault.mutate()}
          onContinue={() => setChosen(true)}
        />
        {saveDefault.isError ? (
          <p className="mx-auto mt-3 max-w-3xl text-sm text-red-700">
            Could not save default template. Check parish write permission.
          </p>
        ) : null}
      </div>
    );
  }

  const marriageVm =
    type === 'MARRIAGE' ? buildMarriageViewModel(cert.data, qr.data?.dataUrl) : null;
  const baptismVm =
    type === 'BAPTISM'
      ? buildBaptismViewModel(cert.data, qr.data?.dataUrl, baptismLabels)
      : null;
  const confirmationVm =
    type === 'CONFIRMATION'
      ? buildConfirmationViewModel(cert.data, qr.data?.dataUrl, confirmationLabels)
      : null;

  const onPrint = () => {
    window.print();
  };

  return (
    <>
      <div className="bcl-print-screen-toolbar no-print">
        <button type="button" className="btn-print" onClick={onPrint}>
          {tCert('fields.printCertificate')}
        </button>
        {type === 'MARRIAGE' ? (
          <button type="button" className="btn-ghost" onClick={() => setChosen(false)}>
            {tCert('fields.changeTemplate')}
          </button>
        ) : null}
        <Link href={`/diocese/certificates/${certificateId}`} className="btn-ghost" style={{ textDecoration: 'none' }}>
          {tCert('fields.backToRecord')}
        </Link>
        <span className="hint">
          {type === 'BAPTISM'
            ? 'A4 Landscape · Premium Liturgical Baptism'
            : type === 'CONFIRMATION'
              ? 'A4 Portrait · Confirmation Certificate'
              : `A4 Portrait · ${templateId}`}
          {' · '}
          Only the certificate will print — dashboard chrome is excluded.
        </span>
      </div>

      <div className="bcl-print-canvas">
        <div id="certificate-print" data-orientation={orientation}>
          {type === 'MARRIAGE' && marriageVm ? (
            templateId === 'classic-tura' ? (
              <ClassicTuraMarriageCert data={marriageVm} />
            ) : templateId === 'premium-chancery' ? (
              <PremiumChanceryMarriageCert data={marriageVm} />
            ) : (
              <SacredHeartOrnateMarriageCert data={marriageVm} />
            )
          ) : type === 'BAPTISM' && baptismVm ? (
            <PremiumLandscapeBaptismCert data={baptismVm} />
          ) : type === 'CONFIRMATION' && confirmationVm ? (
            <PremiumConfirmationCert data={confirmationVm} />
          ) : (
            <div className="mx-auto max-w-3xl bg-white p-10 text-black shadow">
              <div className="border-[3px] border-[#722f37] p-8">
                <div className="flex items-start justify-between gap-4 border-b border-[#c4a35a] pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[#c4a35a]">
                      {parishBrief?.name || 'Parish'}
                    </p>
                    <h1 className="mt-2 font-display text-3xl text-[#722f37]">
                      {String(cert.data.title)}
                    </h1>
                    <p className="mt-1 text-sm text-stone-600">
                      Serial {String(cert.data.serialNumber)}
                    </p>
                  </div>
                  {qr.data?.dataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qr.data.dataUrl} alt="QR" width={96} height={96} />
                  ) : null}
                </div>
                <p className="mt-8 text-center text-lg leading-relaxed">
                  {tCert('baptism.certify')}{' '}
                  <strong className="text-[#722f37]">
                    {String(payload.childName || cert.data.issuedToName)}
                  </strong>
                  .
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function PrintCertificatePage() {
  const params = useParams<{ id: string }>();
  return <CertificatePrintView certificateId={params.id} />;
}
