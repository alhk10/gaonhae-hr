/**
 * Birth-date helpers.
 *
 * Dates of birth are stored as calendar dates ("yyyy-MM-dd") and must never be
 * parsed with `new Date(string)`, which treats the value as UTC midnight and
 * shifts by a day in timezones behind UTC. All parsing here builds a LOCAL
 * calendar date, matching how the forms (GMT+8) captured it.
 */

/** Parse a date-only value ("yyyy-MM-dd") as a local calendar date. */
export const parseDateOnly = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (match) {
    const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

/** Normalize any date-only input to a "yyyy-MM-dd" string, or null. */
export const normalizeDateOnly = (value?: string | Date | null): string | null => {
  const d = parseDateOnly(value);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Age in whole years. Returns null when the date of birth is missing/invalid. */
export const calculateAgeYears = (dob?: string | Date | null): number | null => {
  const birth = parseDateOnly(dob);
  if (!birth) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
};

/** Age in decimal years (e.g. 4.5 for 4 years 6 months). Returns 0 when unknown. */
export const calculateAgeDecimal = (dob?: string | Date | null): number => {
  const birth = parseDateOnly(dob);
  if (!birth) return 0;
  const years = calculateAgeYears(birth) ?? 0;
  const today = new Date();
  let months = today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months -= 1;
  if (months < 0) months += 12;
  return years + months / 12;
};

/** True when the value is a calendar date later than today. */
export const isFutureDateOnly = (value?: string | Date | null): boolean => {
  const d = parseDateOnly(value);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() > today.getTime();
};

/** True when two date-only values refer to the same calendar day. */
export const sameDateOnly = (a?: string | Date | null, b?: string | Date | null): boolean => {
  const na = normalizeDateOnly(a);
  const nb = normalizeDateOnly(b);
  return !!na && !!nb && na === nb;
};
