/**
 * Poom/Dan certificate rules. Certificates receive the belt the student graded
 * FROM, so Black Tip reaches 1st, 1st reaches 2nd, 2nd → 3rd, 3rd → 4th.
 */
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

const startRank = (belt: string): number | null => {
  const b = (belt || '').trim();
  if (/black\s*tip/i.test(b)) return 0;
  const m = /^(\d+)(?:st|nd|rd|th)?\s*(poom|dan)\b/i.exec(b);
  return m ? Number(m[1]) : null;
};

/** New design for Black Tip and 1st–3rd Poom/Dan starting belts. */
export const isPoomDanRank = (belt: string | null | undefined): boolean => {
  const n = startRank(belt || '');
  return n !== null && n <= 3;
};

/** Poom or Dan from the grading fee name (target side of "A >> B" when present). */
export const poomOrDanFromFee = (feeName?: string | null): 'Poom' | 'Dan' | null => {
  if (!feeName) return null;
  const target = feeName.includes('>>') ? feeName.split('>>').pop()! : feeName;
  if (/\bdan\b/i.test(target)) return 'Dan';
  if (/\bpoom\b/i.test(target)) return 'Poom';
  return null;
};

/** Rank printed on the Poom/Dan certificate. */
export const resolvePoomDanRank = (belt: string, feeName?: string | null): string => {
  const n = startRank(belt);
  if (n === null) return belt.trim();
  const ord = ORD[n + 1] || `${n + 1}th`;
  const kind = poomOrDanFromFee(feeName) || (/\bdan\b/i.test(belt) ? 'Dan' : /\bpoom\b/i.test(belt) ? 'Poom' : null);
  return kind ? `${ord} ${kind}` : `${ord} Poom / ${ord} Dan`;
};

/** Split "1st Dan" into number, ordinal suffix and rest for a raised suffix. */
export const splitOrdinal = (label: string): { num: string; suffix: string; rest: string } | null => {
  const m = /^(\d+)(st|nd|rd|th)\s+(.*)$/i.exec(label.trim());
  return m ? { num: m[1], suffix: m[2].toUpperCase(), rest: m[3] } : null;
};
