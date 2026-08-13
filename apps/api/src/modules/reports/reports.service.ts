import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportsService {
  listRegistry() {
    return [
      { code: 'family.list', name: 'Family Directory', category: 'Family', product: 'DIOCESE_ERP', status: 'ready' },
      { code: 'ward.report', name: 'Ward-wise Families', category: 'Family', product: 'DIOCESE_ERP', status: 'ready' },
      { code: 'bcc.report', name: 'BCC-wise Families', category: 'Family', product: 'DIOCESE_ERP', status: 'ready' },
      { code: 'member.list', name: 'Member Register', category: 'Member', product: 'DIOCESE_ERP', status: 'ready' },
      { code: 'birthday.list', name: 'Birthdays This Month', category: 'Member', product: 'DIOCESE_ERP', status: 'ready' },
      { code: 'sacrament.summary', name: 'Sacrament Summary', category: 'Sacrament', product: 'DIOCESE_ERP', status: 'ready' },
      { code: 'certificate.list', name: 'Certificates Issued', category: 'Sacrament', product: 'DIOCESE_ERP', status: 'ready' },
      { code: 'donation.summary', name: 'Donation Summary', category: 'Donation', product: 'DIOCESE_ERP', status: 'ready' },
      { code: 'finance.statement', name: 'Financial Statement', category: 'Finance', product: 'DIOCESE_ERP', status: 'ready' },
      { code: 'mass.attendance', name: 'Mass Attendance', category: 'Mass', product: 'DIOCESE_ERP', status: 'ready' },
      { code: 'catechism.attendance', name: 'Catechism Attendance', category: 'Catechism', product: 'DIOCESE_ERP', status: 'ready' },
      { code: 'communication.summary', name: 'Communication Summary', category: 'Communication', product: 'DIOCESE_ERP', status: 'ready' },
      { code: 'parish.summary', name: 'Parish Summary', category: 'Parish', product: 'DIOCESE_ERP', status: 'ready' },
      { code: 'anniversary.list', name: 'Anniversaries', category: 'Member', product: 'DIOCESE_ERP', status: 'ready' },
      { code: 'youth.report', name: 'Youth Report', category: 'Youth', product: 'DIOCESE_ERP', status: 'ready' },
      { code: 'ministry.report', name: 'Ministry Report', category: 'Ministry', product: 'DIOCESE_ERP', status: 'ready' },
      { code: 'website.analytics', name: 'Website Analytics', category: 'Website', product: 'DIOCESE_ERP', status: 'ready' },
      { code: 'diocese.summary', name: 'Diocese Summary', category: 'Diocese', product: 'DIOCESE_ERP', status: 'ready' },
    ];
  }
}
