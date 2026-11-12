/**
 * Mirrors SQL `_term_paid_weeks` / `_term_required_weeks`: each class line covers
 * its quantity in weeks (4 for the 4-week plan); a term is fully paid only when
 * paid weeks cover the weeks left in the term on the first invoice date.
 */
export const isTermFullyPaid = (
  lines: { plan?: string | null; weeks?: number | null; quantity?: number | null }[],
  requiredWeeks: number,
): boolean => {
  const paid = lines.reduce(
    (s, l) => s + (l.weeks ?? (l.plan === 'four_weeks' ? 4 : Math.ceil(l.quantity ?? 0))),
    0,
  );
  return lines.length > 0 && paid >= Math.max(1, requiredWeeks);
};
