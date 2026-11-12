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

const DAY = 86400000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Mirrors SQL `_term_coverage`: weeks paid count forward from the term start (or
 * the first invoice date for late joiners). Paid while today is inside that span.
 * Grading needs 50% of the term's weeks paid; late joiners need any weeks.
 */
export const termCoverage = (o: {
  termStart: string; termEnd: string; termWeeks: number; firstInvoiceDate: string | null;
  paidWeeks: number; today: string;
}) => {
  const from = o.firstInvoiceDate && o.firstInvoiceDate > o.termStart
    ? (o.firstInvoiceDate < o.termEnd ? o.firstInvoiceDate : o.termEnd) : o.termStart;
  const late = !!o.firstInvoiceDate && o.firstInvoiceDate > o.termStart;
  const span = (Date.parse(o.termEnd) - Date.parse(from)) / DAY + 1;
  const required = Math.max(1, Math.min(o.termWeeks, Math.ceil(span / 7)));
  const fullyPaid = o.paidWeeks > 0 && o.paidWeeks >= required;
  let coveredUntil: string | null = null;
  if (o.paidWeeks > 0) {
    const end = iso(new Date(Date.parse(from) + (o.paidWeeks * 7 - 1) * DAY));
    coveredUntil = fullyPaid || end > o.termEnd ? o.termEnd : end;
  }
  return {
    requiredWeeks: required,
    remainingWeeks: Math.max(0, required - o.paidWeeks),
    fullyPaid,
    coveredUntil,
    isLateJoiner: late,
    paidToday: fullyPaid || (!!coveredUntil && o.today <= coveredUntil),
    gradingEligible: (late && o.paidWeeks > 0) || o.paidWeeks >= Math.ceil(o.termWeeks * 0.5),
  };
};
