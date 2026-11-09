import { getNextBeltLevel } from '@/constants/beltLevels';

/** Grading result from a fee line "X >> Y": pass → Y; double → one belt past Y. Mirrors SQL `_grading_effective_belts`. */
export const gradingOutcome = (feeName: string | null | undefined, result: string | null | undefined, fallback?: { from?: string | null; to?: string | null }) => {
  const m = String(feeName || '').match(/^\s*(.+?)\s*>>\s*(.+?)\s*$/);
  const from = m ? m[1] : fallback?.from ?? null;
  let to = m ? m[2] : fallback?.to ?? null;
  if (String(result || '').toLowerCase() === 'double' && to) to = getNextBeltLevel(to) ?? to;
  return { from, to };
};

/** Belts printed on certificates (each certificate names the belt passed). Double → two certificates. */
export const certificateBelts = (from: string | null | undefined, result: string | null | undefined): string[] => {
  if (!from) return [];
  if (String(result || '').toLowerCase() !== 'double') return [from];
  const next = getNextBeltLevel(from);
  return next ? [from, next] : [from];
};
