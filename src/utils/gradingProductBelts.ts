/**
 * Helpers to derive eligible belt levels from grading product selections.
 * A product named "<From> >> <To>" contributes <From>. Stage products map
 * to explicit poom/dan belts.
 */

export interface NamedGradingProduct {
  id: string;
  name: string;
}

export const beltsForProductName = (name: string): string[] => {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('stage 1')) return ['1st Poom', '1st Dan'];
  if (lower.startsWith('stage 4')) return ['2nd Poom', '2nd Dan'];
  if (lower.startsWith('stage 11')) return ['3rd Poom', '3rd Dan'];
  const idx = trimmed.indexOf('>>');
  if (idx > 0) return [trimmed.slice(0, idx).trim()];
  return [];
};

export const deriveBeltLevels = (
  selectedIds: string[],
  products: NamedGradingProduct[],
): string[] => {
  const set = new Set<string>();
  for (const id of selectedIds) {
    const p = products.find(p => p.id === id);
    if (!p) continue;
    beltsForProductName(p.name).forEach(b => set.add(b));
  }
  return Array.from(set);
};
