'use client';

import { PremiumLandscapeBaptismCert } from '@/components/certificates/templates/PremiumLandscapeBaptismCert';
import type { BaptismCertViewModel } from '@/components/certificates/templates/baptism-types';
import '../../../print/print.css';

const DEMO: BaptismCertViewModel = {
  dioceseName: 'Roman Catholic Diocese of Tura',
  parishName: 'Sacred Heart Parish',
  parishLocation: 'Tura, Meghalaya',
  childName: '',
  childRelation: 'Child',
  fatherName: '',
  motherName: '',
  birthDate: '',
  baptismDate: '',
  placeOfBaptism: '',
  celebratedBy: '',
  godFather: '',
  godMother: '',
  registerNo: '',
  pageNo: '',
  bookNo: '',
  certificateNo: '',
  issuedOn: '',
  placeOfIssue: 'Tura',
  serialNumber: 'SHP-BAP-0000',
  verificationId: 'VR-00000000',
  verificationUrl: 'https://verify.bcl.app/c/demo',
  digitalHash: 'BCL-BAP-DEMO0001',
  priestName: '',
  secretaryName: '',
};

/** Blank premium baptism certificate — print-only surface (no dashboard). */
export default function BaptismCertificatePreviewPage() {
  return (
    <>
      <div className="bcl-print-screen-toolbar no-print">
        <button type="button" className="btn-print" onClick={() => window.print()}>
          Print certificate
        </button>
        <span className="hint">
          A4 Landscape · Premium Liturgical · Only the certificate prints
        </span>
      </div>
      <div className="bcl-print-canvas">
        <div id="certificate-print" data-orientation="landscape">
          <PremiumLandscapeBaptismCert data={DEMO} />
        </div>
      </div>
    </>
  );
}
