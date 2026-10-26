import { SG_BELT_LEVELS } from '@/constants/beltLevels';

const FOUNDATION_FROM = ['foundation 1', 'foundation 2', 'foundation 3'];

const fromBelt = (name: string) => (name || '').split(/\s*>>\s*/)[0].trim().toLowerCase();

/** A grading product whose starting belt is Foundation 1, 2 or 3 (e.g. "Foundation 2 >> Foundation 3"). */
export const isFoundationGradingProduct = (name: string): boolean =>
  /\s*>>\s*/.test(name || '') && FOUNDATION_FROM.includes(fromBelt(name));

/** Several grading items may share an invoice only when all are distinct foundation steps. */
export const canCombineGradingItems = (names: string[]): boolean => {
  if (names.length <= 1) return true;
  if (!names.every(isFoundationGradingProduct)) return false;
  return new Set(names.map(fromBelt)).size === names.length;
};

const rank = (belt: string) => (SG_BELT_LEVELS as readonly string[]).findIndex(b => b.toLowerCase() === belt.trim().toLowerCase());

/** Combined belt span for several foundation steps: lowest start → highest target. */
export const combinedFoundationSpan = (names: string[]): { from: string; to: string } | null => {
  const parts = names.map(n => n.split(/\s*>>\s*/).map(s => s.trim())).filter(p => p.length >= 2);
  if (!parts.length) return null;
  const froms = parts.map(p => p[0]).sort((a, b) => rank(a) - rank(b));
  const tos = parts.map(p => p[p.length - 1]).sort((a, b) => rank(b) - rank(a));
  return { from: froms[0], to: tos[0] };
};
