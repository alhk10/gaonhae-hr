import { format, parseISO, isValid } from 'date-fns';

const DATE_FMT = 'dd/MM/yyyy';
const DATETIME_FMT = 'dd/MM/yyyy HH:mm';
const DATE_LONG_FMT = 'dd MMM yyyy';
const DATETIME_LONG_FMT = 'dd MMM yyyy HH:mm';
const MONTH_SHORT_FMT = 'dd MMM';

const toDate = (input?: Date | string | number | null): Date | null => {
  if (input === null || input === undefined || input === '') return null;
  if (input instanceof Date) return isValid(input) ? input : null;
  if (typeof input === 'number') {
    const d = new Date(input);
    return isValid(d) ? d : null;
  }
  // string
  // Try parseISO first (handles 'yyyy-MM-dd' and full ISO timestamps)
  let d = parseISO(input);
  if (!isValid(d)) {
    d = new Date(input);
  }
  return isValid(d) ? d : null;
};

/** dd/MM/yyyy — primary display format. */
export const formatDate = (input?: Date | string | number | null, fallback = '-'): string => {
  const d = toDate(input);
  return d ? format(d, DATE_FMT) : fallback;
};

/** dd/MM/yyyy HH:mm */
export const formatDateTime = (input?: Date | string | number | null, fallback = '-'): string => {
  const d = toDate(input);
  return d ? format(d, DATETIME_FMT) : fallback;
};

/** dd MMM yyyy — readable variant for headers (e.g. 17 Apr 2026). */
export const formatDateLong = (input?: Date | string | number | null, fallback = '-'): string => {
  const d = toDate(input);
  return d ? format(d, DATE_LONG_FMT) : fallback;
};

/** dd MMM yyyy HH:mm */
export const formatDateTimeLong = (input?: Date | string | number | null, fallback = '-'): string => {
  const d = toDate(input);
  return d ? format(d, DATETIME_LONG_FMT) : fallback;
};

/** dd MMM (used in week range headers). */
export const formatMonthShort = (input?: Date | string | number | null, fallback = '-'): string => {
  const d = toDate(input);
  return d ? format(d, MONTH_SHORT_FMT) : fallback;
};

/** ISO date for storage / Supabase keys. */
export const toISODate = (d: Date): string => format(d, 'yyyy-MM-dd');
