/** Build-time parish app metadata (no React Native imports) */
export type ParishAppConfigData = {
  appId: string;
  dedicated: boolean;
  parishId: string;
  parishCode: string;
  parishName: string;
  shortName: string;
  dioceseName: string;
  location: string;
  tagline: string;
  cmsSlug: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    card: string;
  };
  contact: {
    phone: string;
    email: string;
    address: string;
    whatsapp?: string;
  };
  priest: {
    name: string;
    title: string;
    photo?: string;
  };
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    whatsapp?: string;
  };
  donationPurposes: string[];
  sacraments: Array<{ id: string; title: string; description: string }>;
  ministries: Array<{ id: string; title: string; contact?: string }>;
  poweredBy?: { label: string; url?: string };
  androidPackage?: string;
  iosBundleId?: string;
};

export const PARISH_APP_REGISTRY: Record<string, ParishAppConfigData> = {
  'sacred-heart': {
    appId: 'sacred-heart',
    dedicated: true,
    parishId: 'shptura',
    parishCode: 'SHPTURA',
    parishName: 'Sacred Heart Shrine Parish',
    shortName: 'Sacred Heart Parish',
    dioceseName: 'Roman Catholic Diocese of Tura',
    location: 'Tura, Meghalaya',
    tagline: 'Faith · Community · Service',
    cmsSlug: 'sacred-heart',
    colors: {
      primary: '#7A1725',
      secondary: '#102A4A',
      accent: '#C79A35',
      background: '#F7F8FA',
      card: '#FFFFFF',
    },
    contact: {
      phone: '+91 98630 12345',
      email: 'ppshctura@sacredheartshrinetura.in',
      address: 'Sacred Heart Church Road, Tura, West Garo Hills, Meghalaya 794001',
      whatsapp: '+919863012345',
    },
    priest: {
      name: 'Rev. Fr. Lyngdoh T Sangma',
      title: 'Parish Priest',
    },
    socialLinks: {
      facebook: 'https://facebook.com',
      instagram: 'https://instagram.com',
      youtube: 'https://youtube.com',
    },
    donationPurposes: [
      'General Donation',
      'Building Fund',
      'Charity',
      'Parish Development',
      'Mission',
    ],
    sacraments: [
      { id: 'baptism', title: 'Baptism', description: 'Welcome into the life of Christ and His Church.' },
      { id: 'confirmation', title: 'Confirmation', description: 'Strengthened by the Holy Spirit to witness Christ.' },
      { id: 'communion', title: 'Holy Communion', description: 'First Holy Communion preparation and registration.' },
      { id: 'marriage', title: 'Marriage', description: 'Sacramental marriage preparation at least six months in advance.' },
      { id: 'anointing', title: 'Anointing of the Sick', description: 'Pastoral care and sacramental anointing for the ill.' },
      { id: 'funeral', title: 'Funeral', description: 'Christian funeral rites and cemetery coordination.' },
      { id: 'certificates', title: 'Certificates', description: 'Request baptism, marriage, or other parish certificates.' },
    ],
    ministries: [
      { id: 'youth', title: 'Youth Ministry' },
      { id: 'choir', title: 'Parish Choir' },
      { id: 'catechism', title: 'Catechism' },
      { id: 'legion', title: 'Legion of Mary' },
      { id: 'svp', title: 'St. Vincent de Paul' },
      { id: 'altar', title: 'Altar Servers' },
    ],
    poweredBy: { label: 'BaseCode Labs', url: 'https://basecodelabs.com' },
    androidPackage: 'in.sacredheartshrinetura.parish',
    iosBundleId: 'in.sacredheartshrinetura.parish',
  },
};

export function resolveParishAppId(): string {
  return process.env.EXPO_PUBLIC_PARISH_APP_ID || 'sacred-heart';
}

export function getParishAppConfigData(appId = resolveParishAppId()): ParishAppConfigData {
  const cfg = PARISH_APP_REGISTRY[appId];
  if (!cfg) throw new Error(`Unknown parish app config: ${appId}`);
  return cfg;
}

export function isDedicatedParishApp(cfg = getParishAppConfigData()): boolean {
  return cfg.dedicated;
}

export function cmsSlugForApp(cfg = getParishAppConfigData()): string {
  return cfg.cmsSlug;
}

export function parishContextFromConfig(cfg: ParishAppConfigData) {
  return {
    dioceseId: 'tura',
    dioceseName: cfg.dioceseName,
    parishId: cfg.parishId,
    parishName: cfg.parishName,
    parishCode: cfg.parishCode,
    village: cfg.location,
    favorite: true,
  };
}
