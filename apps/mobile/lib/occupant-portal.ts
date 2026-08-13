import { api } from './api';
import {
  cacheRead,
  cacheWrite,
  enqueueSync,
  listPendingSync,
  markSyncDone,
  markSyncFailed,
  SqliteKeys,
} from './sqlite-db';

export type PortalOccupant = {
  id: string;
  name: string;
  kind: string;
  designation?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
};

export type PortalAllocation = {
  id: string;
  startDate: string;
  expectedEndDate?: string | null;
  monthlyRent: number | string;
  securityDeposit: number | string;
  status: string;
  parish?: { id: string; name: string; code?: string };
  room?: {
    roomNumber: string;
    roomType?: string | null;
    furnished?: boolean;
    facility?: { name: string; code?: string; type?: string; address?: string | null };
    floor?: { block?: { code?: string; name?: string } };
  };
};

export type PortalInvoice = {
  id: string;
  invoiceNo: string;
  periodStart: string;
  periodEnd: string;
  dueDate?: string | null;
  totalAmount: number;
  paidAmount: number;
  status: string;
  rentAmount?: number;
  electricity?: number;
  water?: number;
  payments?: Array<{ id: string; receiptNo: string; amount: number; paidAt: string }>;
  allocation?: { room?: { roomNumber?: string; facility?: { name?: string } } };
};

export type PortalMaintenance = {
  id: string;
  complaintNo: string;
  category: string;
  priority: string;
  status: string;
  description?: string | null;
  createdAt: string;
  room?: { roomNumber?: string; facility?: { name?: string; code?: string } };
  _local?: boolean;
};

export type PortalNotice = {
  id: string;
  channel: string;
  subject?: string | null;
  body: string;
  priority?: string | null;
  sentAt?: string | null;
  createdAt: string;
};

export type PortalBundle = {
  syncedAt: string;
  occupant: PortalOccupant;
  allocation: PortalAllocation | null;
  invoices: PortalInvoice[];
  maintenance: PortalMaintenance[];
  notices: PortalNotice[];
};

export async function fetchPortalBundle(): Promise<PortalBundle> {
  return api<PortalBundle>('/accommodation/portal/bundle');
}

export async function getCachedPortal(): Promise<PortalBundle | null> {
  return cacheRead<PortalBundle>(SqliteKeys.portalBundle);
}

export async function savePortalBundle(bundle: PortalBundle) {
  await cacheWrite(SqliteKeys.portalBundle, bundle);
}

export async function refreshPortal(): Promise<PortalBundle> {
  const bundle = await fetchPortalBundle();
  await savePortalBundle(bundle);
  return bundle;
}

export async function loadPortalPreferCache(): Promise<PortalBundle | null> {
  try {
    return await refreshPortal();
  } catch {
    return getCachedPortal();
  }
}

export type MaintenanceInput = {
  description: string;
  category?: string;
  priority?: string;
};

export async function submitMaintenanceRequest(input: MaintenanceInput) {
  const clientRequestId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = { ...input, clientRequestId };

  try {
    await api('/accommodation/portal/maintenance', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await refreshPortal();
    return { synced: true, clientRequestId };
  } catch {
    await enqueueSync('maintenance', payload, clientRequestId);
    const cached = (await getCachedPortal()) || {
      syncedAt: new Date().toISOString(),
      occupant: { id: 'local', name: 'You', kind: 'STAFF' },
      allocation: null,
      invoices: [],
      maintenance: [],
      notices: [],
    };
    const pending: PortalMaintenance = {
      id: clientRequestId,
      complaintNo: 'Pending sync',
      category: input.category || 'OTHER',
      priority: input.priority || 'MEDIUM',
      status: 'OPEN',
      description: input.description,
      createdAt: new Date().toISOString(),
      _local: true,
    };
    await savePortalBundle({
      ...cached,
      maintenance: [pending, ...cached.maintenance.filter((m) => m.id !== clientRequestId)],
    });
    return { synced: false, clientRequestId };
  }
}

export async function flushSyncQueue(): Promise<{ synced: number; failed: number }> {
  const pending = await listPendingSync();
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const payload = JSON.parse(item.payload) as MaintenanceInput & { clientRequestId?: string };
      if (item.kind === 'maintenance') {
        await api('/accommodation/portal/maintenance', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      await markSyncDone(item.id);
      synced += 1;
    } catch (e) {
      await markSyncFailed(item.id, e instanceof Error ? e.message : String(e));
      failed += 1;
    }
  }

  if (synced > 0) {
    try {
      await refreshPortal();
    } catch {
      /* keep local cache */
    }
  }

  return { synced, failed };
}
