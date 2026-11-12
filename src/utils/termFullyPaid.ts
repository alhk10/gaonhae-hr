/** Mirrors SQL `_term_paid_weeks`: a term is fully paid only when paid weeks cover it. */
export const isTermFullyPaid = (
  lines: { plan?: string | null; weeks?: number | null }[],
  termWeeks: number,
): boolean => {
  const paid = lines.reduce((s, l) => s + (l.plan === 'four_weeks' ? (l.weeks ?? 4) : 1000), 0);
  return lines.length > 0 && paid >= Math.max(1, termWeeks);
};
