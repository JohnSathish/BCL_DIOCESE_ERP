export const CLERGY_TYPES = [
  { value: 'DIOCESAN', label: 'Diocesan priest' },
  { value: 'RELIGIOUS', label: 'Religious priest' },
  { value: 'VISITING', label: 'Visiting priest' },
  { value: 'BISHOP', label: 'Bishop' },
  { value: 'DEACON', label: 'Deacon' },
  { value: 'BROTHER', label: 'Brother' },
  { value: 'SISTER', label: 'Sister' },
  { value: 'SEMINARIAN', label: 'Seminarian' },
  { value: 'CHAPLAIN', label: 'Chaplain' },
  { value: 'OTHER', label: 'Other religious' },
] as const;

export const APPOINTMENT_TYPES = [
  { value: 'NEW', label: 'New appointment' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'TEMPORARY', label: 'Temporary assignment' },
  { value: 'ADDITIONAL', label: 'Additional assignment' },
  { value: 'RELIEVING', label: 'Relieving order' },
  { value: 'RETURN', label: 'Return from assignment' },
] as const;

export const TRANSFER_TYPES = [
  { value: 'PERMANENT', label: 'Permanent' },
  { value: 'TEMPORARY', label: 'Temporary' },
  { value: 'ACTING', label: 'Acting' },
  { value: 'SWAP', label: 'Swap' },
  { value: 'ADDITIONAL', label: 'Additional' },
] as const;

export function clergyTypeLabel(value?: string | null) {
  return CLERGY_TYPES.find((t) => t.value === value)?.label || value || '—';
}
