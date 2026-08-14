'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, Input, Label, PageHeader } from '@bcl/ui';
import { MonitorSmartphone, Shield, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { clearAuth, getRefreshToken } from '@bcl/auth-client';
import { useRouter } from 'next/navigation';

type TrustedDevice = {
  id: string;
  deviceName?: string | null;
  browser?: string | null;
  operatingSystem?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [trustDays, setTrustDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ data: TrustedDevice[]; trustDurationDays?: number }>(
        '/auth/trusted-devices',
      );
      setDevices(res.data || []);
      if (res.trustDurationDays) setTrustDays(res.trustDurationDays);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trusted devices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function revoke(id: string) {
    setBusy(true);
    setMessage('');
    try {
      await api.delete(`/auth/trusted-devices/${id}`);
      setMessage('Device revoked. OTP will be required on next login from that device.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not revoke device');
    } finally {
      setBusy(false);
    }
  }

  async function revokeAll() {
    if (!confirm('Revoke all trusted devices? OTP will be required on every device next time.')) {
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/trusted-devices/revoke-all');
      setMessage('All trusted devices revoked.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not revoke devices');
    } finally {
      setBusy(false);
    }
  }

  async function logoutEverywhere() {
    if (
      !confirm(
        'Sign out everywhere? This revokes all sessions and trusted devices. You will need to sign in again.',
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/logout-all');
      const refresh = getRefreshToken();
      if (refresh) {
        await api.post('/auth/logout', { refreshToken: refresh }).catch(() => undefined);
      }
      clearAuth();
      router.replace('/login');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign out everywhere');
      setBusy(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      clearAuth();
      router.replace('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password');
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Security"
        description="Trusted devices, password, and sign-out controls for your account"
      />

      {message ? (
        <p className="mb-4 rounded-[var(--bcl-radius)] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-[var(--bcl-radius)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5 text-[var(--bcl-primary)]" />
              <h3 className="text-lg font-semibold text-[var(--bcl-text)]">Trusted Devices</h3>
            </div>
            <p className="mb-4 text-sm text-[var(--bcl-muted)]">
              Devices you trust can skip email OTP for {trustDays} days. Revoke any device you do
              not recognize.
            </p>

            {loading ? (
              <p className="text-sm text-[var(--bcl-muted)]">Loading…</p>
            ) : devices.length === 0 ? (
              <p className="text-sm text-[var(--bcl-muted)]">No trusted devices yet.</p>
            ) : (
              <ul className="space-y-3">
                {devices.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--bcl-radius)] border border-[var(--bcl-border)] p-3"
                  >
                    <div>
                      <p className="font-semibold text-[var(--bcl-text)]">
                        {d.deviceName || `${d.operatingSystem || 'Device'} · ${d.browser || 'Browser'}`}
                      </p>
                      <p className="mt-1 text-xs text-[var(--bcl-muted)]">
                        Last used: {formatWhen(d.lastUsedAt)}
                      </p>
                      <p className="text-xs text-[var(--bcl-muted)]">
                        Added: {formatWhen(d.createdAt)} · Expires: {formatWhen(d.expiresAt)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void revoke(d.id)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" disabled={busy} onClick={() => void revokeAll()}>
                Sign out of all devices
              </Button>
              <Button type="button" variant="danger" disabled={busy} onClick={() => void logoutEverywhere()}>
                Sign out everywhere
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-[var(--bcl-primary)]" />
              <h3 className="text-lg font-semibold text-[var(--bcl-text)]">Change Password</h3>
            </div>
            <p className="mb-4 text-sm text-[var(--bcl-muted)]">
              Changing your password signs you out everywhere and revokes all trusted devices.
            </p>
            <form className="grid gap-3" onSubmit={onChangePassword}>
              <div>
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={busy}>
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
