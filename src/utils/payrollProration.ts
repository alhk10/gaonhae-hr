/**
 * Month-level payroll adjustments: part-month pro-ration, unpaid leave and
 * excess annual leave. All day maths uses calendar days of the payroll month.
 */
import { formatPeriodForAPI } from './periodUtils';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const periodBounds = (period: string) => {
  const [y, m] = formatPeriodForAPI(period).split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const end = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  return { year: y, month: m, daysInMonth, start, end };
};

const dayNum = (iso: string) => Math.floor(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000);

/** Calendar days of [from,to] (inclusive) falling inside the period. */
export const overlapDays = (from: string, to: string, period: string): number => {
  const { start, end } = periodBounds(period);
  const a = Math.max(dayNum(from.slice(0, 10)), dayNum(start));
  const b = Math.min(dayNum(to.slice(0, 10)), dayNum(end));
  return b >= a ? b - a + 1 : 0;
};

/** Days employed in the month given join / resign dates. */
export const daysEmployed = (joinDate: string | null | undefined, resignDate: string | null | undefined, period: string) => {
  const { start, end } = periodBounds(period);
  return overlapDays(joinDate ? joinDate.slice(0, 10) : start, resignDate ? resignDate.slice(0, 10) : end, period);
};

export const proRateSalary = (
  base: number,
  joinDate: string | null | undefined,
  resignDate: string | null | undefined,
  period: string,
) => {
  const { daysInMonth } = periodBounds(period);
  const days = daysEmployed(joinDate, resignDate, period);
  return { amount: round2((base * days) / daysInMonth), days, daysInMonth, isProRated: days < daysInMonth };
};

/** Deduction for unpaid days (calendar-day rate). */
export const unpaidLeaveDeduction = (base: number, days: number, period: string) => {
  if (!days || days <= 0) return 0;
  const { daysInMonth } = periodBounds(period);
  return round2((base * days) / daysInMonth);
};

/**
 * Annual-leave days taken this month that go beyond the year's entitlement.
 * Only the days crossing the limit in this month count, so they are never
 * deducted twice across months.
 */
export const excessAnnualLeaveDays = (entitlement: number, takenBeforeMonth: number, takenThisMonth: number) => {
  const overAfter = Math.max(0, takenBeforeMonth + takenThisMonth - entitlement);
  const overBefore = Math.max(0, takenBeforeMonth - entitlement);
  return Math.max(0, overAfter - overBefore);
};

/** Portion of a leave request's days that fall in the period (proportional to calendar overlap). */
export const leaveDaysInPeriod = (req: { start_date: string; end_date: string; days_requested: number }, period: string) => {
  const total = dayNum(req.end_date.slice(0, 10)) - dayNum(req.start_date.slice(0, 10)) + 1;
  if (total <= 0) return 0;
  const inside = overlapDays(req.start_date, req.end_date, period);
  return Math.round(((Number(req.days_requested) || 0) * inside / total) * 2) / 2;
};
