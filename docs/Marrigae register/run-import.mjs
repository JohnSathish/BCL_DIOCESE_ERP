/**
 * Upload and import marriage register to Sacred Heart Parish via API.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = process.env.API_URL || 'http://localhost:4000/api/v1';
const EMAIL = process.env.IMPORT_EMAIL || 'admin@basecodelabs.com';
const PASSWORD = process.env.IMPORT_PASSWORD || 'Admin@12345';
const FILE = join(__dirname, 'Matrimonia_1955-1967_Import_Ready.xlsx');

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed: ${JSON.stringify(data)}`);
  if (data.challengeToken) {
    throw new Error('OTP required — use an account without MFA for scripted import');
  }
  return data.accessToken;
}

async function getParishId(token) {
  const res = await fetch(`${API}/parishes?code=SHPTURA`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Parishes failed: ${JSON.stringify(data)}`);
  const list = Array.isArray(data) ? data : data.data || data.items || [];
  const parish = list.find((p) => p.code === 'SHPTURA') || list[0];
  if (!parish?.id) throw new Error('Sacred Heart parish not found');
  return parish.id;
}

async function upload(token, parishId) {
  const buf = readFileSync(FILE);
  const form = new FormData();
  form.append('file', new Blob([buf]), 'Matrimonia_1955-1967_Import_Ready.xlsx');
  form.append('module', 'MARRIAGE');
  form.append('parishId', parishId);

  const res = await fetch(`${API}/migration/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Upload failed: ${JSON.stringify(data)}`);
  return data;
}

async function validate(token, jobId) {
  const res = await fetch(`${API}/migration/jobs/${jobId}/validate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Validate failed: ${JSON.stringify(data)}`);
  return data;
}

async function runImport(token, jobId) {
  const res = await fetch(`${API}/migration/jobs/${jobId}/import`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Import failed: ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  console.log('API:', API);
  console.log('File:', FILE);

  const token = await login();
  console.log('Logged in');

  const parishId = await getParishId(token);
  console.log('Parish ID:', parishId);

  const job = await upload(token, parishId);
  console.log('Uploaded job:', job.id, 'rows:', job.rowCount);

  const validation = await validate(token, job.id);
  console.log('Validation:', {
    valid: validation.validRecords,
    invalid: validation.invalidRecords,
    warnings: validation.warnings,
    skipped: validation.skippedRows,
  });

  if (validation.invalidRecords > 0) {
    console.log('Top issues:', validation.topIssues?.slice(0, 5));
  }

  const result = await runImport(token, job.id);
  console.log('Import complete:', {
    status: result.status,
    imported: result.importedCount,
    failed: result.failedCount,
    skipped: result.skippedCount,
  });
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
