/** Extract the 4-digit sequence from a marriage register number (handles YYYY-NNNN or plain NNNN). */
export function marriageRegisterSequence(
  registerNumber: string | number | null | undefined,
): string {
  const raw = String(registerNumber ?? '').trim();
  if (!raw) return '';

  const prefixed = raw.match(/^(\d{4})-(\d+)$/);
  if (prefixed) return prefixed[2].padStart(4, '0');

  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 4) return digits.slice(-4).padStart(4, '0');
  return digits.padStart(4, '0');
}

/** Build canonical MAR-YYYY-NNNN certificate / register serial. */
export function marriageCertificateSerial(
  registerYear: number | string | null | undefined,
  registerNumber: string | number | null | undefined,
): string {
  const year = Number(registerYear) || new Date().getFullYear();
  const seq = marriageRegisterSequence(registerNumber);
  return seq ? `MAR-${year}-${seq}` : `MAR-${year}-0000`;
}

/** True when serial looks like MAR-YYYY-YYYY-NNNN from a YYYY-NNNN register number. */
export function marriageSerialNeedsFix(
  serial: string | null | undefined,
  registerYear: number | null | undefined,
  registerNumber: string | null | undefined,
): boolean {
  const expected = marriageCertificateSerial(registerYear, registerNumber);
  const current = String(serial ?? '').trim();
  if (!current) return Boolean(registerNumber);
  if (current === expected) return false;
  if (/^MAR-\d{4}-\d{4}-\d{4,}$/.test(current)) return true;
  if (registerYear && current.includes(`${registerYear}-${registerYear}`)) return true;
  return current !== expected && Boolean(registerNumber);
}
