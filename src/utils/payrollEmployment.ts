import { formatPeriodForAPI } from './periodUtils';

/**
 * True when an employee should appear in payroll for the given period:
 * no resign date, or resigned on/after the first day of that month
 * (so the final month is still paid).
 */
export function isEmployedInPeriod(
  emp: { resignDate?: string | null } | null | undefined,
  period: string,
): boolean {
  if (!emp) return false;
  if (!emp.resignDate) return true;
  const ym = formatPeriodForAPI(period); // YYYY-MM
  const resignYm = String(emp.resignDate).slice(0, 7);
  return resignYm >= ym;
}
