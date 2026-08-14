/**
 * End-to-end import test mirroring Data Import Studio UI flow.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const API = 'http://localhost:4000/api/v1';
const EMAIL = 'priest@sacredheart-tura.org';
const PASSWORD = 'Priest@12345';
const FILE = join(dirname(fileURLToPath(import.meta.url)), 'Matrimonia_1955-1967_Import_Ready.xlsx');

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed: ${JSON.stringify(data)}`);

  if (data.challengeToken && data.requiresOtp) {
    const otp = data.debugOtp;
    if (!otp) {
      throw new Error('OTP required — restart API with AUTH_OTP_RETURN_IN_RESPONSE=true NODE_ENV=development');
    }
    const verifyRes = await fetch(`${API}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeToken: data.challengeToken, otp, trustDevice: true }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok) throw new Error(`OTP verify failed: ${JSON.stringify(verifyData)}`);
    return verifyData.tokens?.accessToken ?? verifyData.accessToken;
  }

  return data.tokens?.accessToken ?? data.accessToken;
}

async function api(token, path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) throw new Error(`${path} failed: ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  console.log('=== Data Import Studio E2E Test ===\n');

  const token = await login();
  console.log('✓ Login OK');

  const dashboard = await api(token, '/migration/dashboard');
  console.log('✓ Dashboard:', dashboard);

  const modules = await api(token, '/migration/modules');
  console.log('✓ Modules:', modules.length);

  const fd = new FormData();
  fd.append('file', new Blob([readFileSync(FILE)]), 'Matrimonia_1955-1967_Import_Ready.xlsx');
  fd.append('module', 'MARRIAGE');

  const uploadRes = await fetch(`${API}/migration/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const job = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(`Upload failed: ${JSON.stringify(job)}`);
  console.log('✓ Upload:', job.batchCode, 'rows:', job.rowCount, 'mappings:', job.columnMappings?.length);

  if (job.columnMappings?.some((m) => m.status === 'review' || m.status === 'unmapped')) {
    const fixed = job.columnMappings.map((m) =>
      m.targetKey ? m : { ...m, targetKey: null, status: 'unmapped' },
    );
    await api(token, `/migration/jobs/${job.id}/mapping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappings: job.columnMappings }),
    });
    console.log('✓ Column mapping applied');
  } else {
    console.log('✓ Column mapping auto OK');
  }

  const validation = await api(token, `/migration/jobs/${job.id}/validate`, { method: 'POST' });
  console.log('✓ Validate:', {
    valid: validation.validRecords,
    invalid: validation.invalidRecords,
    warnings: validation.warnings,
    duplicates: validation.duplicateCount,
  });

  const preview = await api(token, `/migration/jobs/${job.id}/preview?limit=5`, { method: 'POST' });
  console.log('✓ Preview sample row:', preview.preview?.[0]?.data?.bridegroomName, preview.preview?.[0]?.data?.marriageDate);

  const result = await api(token, `/migration/jobs/${job.id}/import`, { method: 'POST' });
  console.log('✓ Import complete:', {
    batchCode: result.batchCode,
    imported: result.successfullyImported ?? result.importedCount,
    skipped: result.skipped ?? result.skippedCount,
    failed: result.errors ?? result.failedCount,
    status: result.status,
  });

  const dashboardAfter = await api(token, '/migration/dashboard');
  console.log('\n=== Final Dashboard ===');
  console.log(dashboardAfter);

  console.log('\n✅ E2E test passed — ready for UI at http://localhost:3000/diocese/data-import');
}

main().catch((e) => {
  console.error('❌', e.message || e);
  process.exit(1);
});
