import { getNextBeltLevel } from '@/constants/beltLevels';

/** Grading result from a fee line "X >> Y": pass → Y; double → one belt past Y. Mirrors SQL `_grading_effective_belts`. */
export const gradingOutcome = (feeName: string | null | undefined, result: string | null | undefined, fallback?: { from?: string | null; to?: string | null }) => {
  const m = String(feeName || '').match(/^\s*(.+?)\s*>>\s*(.+?)\s*$/);
  const from = m ? m[1] : fallback?.from ?? null;
  let to = m ? m[2] : fallback?.to ?? null;
  if (String(result || '').toLowerCase() === 'double' && to) to = getNextBeltLevel(to) ?? to;
  return { from, to };
};

/** Chain combined Foundation lines on one invoice (F1>>F2 + F2>>F3 + F3>>White → F1>>White). Mirrors SQL. */
export const chainFoundationLines = (feeName: string, otherLines: string[]): string => {
  const parse = (s: string) => String(s || '').match(/^\s*(.+?)\s*>>\s*(.+?)\s*$/);
  const m = parse(feeName);
  if (!m || !/^foundation/i.test(m[1])) return feeName;
  let to = m[2];
  for (let i = 0; i < 5 && /^foundation/i.test(to); i++) {
    const next = otherLines.map(parse).find((x) => x && x[1].toLowerCase() === to.toLowerCase());
    if (!next) break;
    to = next[2];
  }
  return `${m[1]} >> ${to}`;
};

/** Belts printed on certificates (each certificate names the belt passed). Double → two certificates. */
export const certificateBelts = (from: string | null | undefined, result: string | null | undefined, country?: string | null): string[] => {
  if (!from) return [];
  if (String(result || '').toLowerCase() !== 'double') return [from];
  const next = getNextBeltLevel(from, country);
  return next ? [from, next] : [from];
};
