/**
 * Shared validation helpers for the public payment forms
 * (/hello, school fees, grading, competition, seminar, uniforms & guards).
 */

export const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024;

/** Throws when the uploaded payment proof is not an image or is too large. */
export const assertValidPaymentProof = (file: File | null | undefined): void => {
  if (!file) throw new Error('Please upload a screenshot of your payment.');
  if (!(file.type || '').toLowerCase().startsWith('image/')) {
    throw new Error('Payment proof must be an image (JPG, PNG or HEIC). PDFs are not accepted.');
  }
  if (file.size > MAX_PROOF_SIZE_BYTES) {
    throw new Error('Payment proof must be smaller than 5 MB.');
  }
};

/** True when the given date is after today (invalid for a date of birth). */
export const isFutureDate = (value: Date | string | null | undefined): boolean => {
  if (!value) return false;
  const d = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return d.getTime() > today.getTime();
};

export const FUTURE_DOB_MESSAGE = 'Date of birth cannot be in the future.';

/** Throws when the date of birth is in the future. */
export const assertValidDateOfBirth = (value: Date | string | null | undefined): void => {
  if (isFutureDate(value)) throw new Error(FUTURE_DOB_MESSAGE);
};

/** GST rate for a branch country: Singapore 9%, Australia 10%, otherwise none. */
export const gstRateForCountry = (country?: string | null): number => {
  const c = (country || '').trim().toLowerCase();
  if (c === 'singapore' || c === 'sg') return 0.09;
  if (c === 'australia' || c === 'au') return 0.1;
  return 0;
};

/** A one-time reference so a retried submission is not stored twice. */
export const newClientRef = (): string => {
  try {
    return crypto.randomUUID();
  } catch {
    return `ref-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
};
