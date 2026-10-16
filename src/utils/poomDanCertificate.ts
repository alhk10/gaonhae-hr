/**
 * Poom/Dan certificate rule. Certificates receive the belt the student graded
 * FROM, so a Black Tip grading is the one that reaches 1st Poom / 1st Dan.
 */
export const isPoomDanRank = (belt: string | null | undefined): boolean =>
  /black\s*tip|\bpoom\b|\bdan\b/i.test((belt || '').trim());

/** Rank printed on the Poom/Dan certificate. */
export const poomDanRankLabel = (belt: string): string =>
  /black\s*tip/i.test(belt) ? '1st Poom / 1st Dan' : belt.trim();

/** Split "1st Dan" into number, ordinal suffix and rest for a raised suffix. */
export const splitOrdinal = (label: string): { num: string; suffix: string; rest: string } | null => {
  const m = /^(\d+)(st|nd|rd|th)\s+(.*)$/i.exec(label.trim());
  return m ? { num: m[1], suffix: m[2].toUpperCase(), rest: m[3] } : null;
};
