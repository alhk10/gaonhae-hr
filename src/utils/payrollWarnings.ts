export interface PayrollWarningInput {
  name: string;
  hasBankDetails: boolean;
  proRatedDays?: number | null;
  excessLeaveDays?: number;
  pendingClaims?: number;
  manuallyEdited?: boolean;
  net: number;
}

export interface PayrollWarning { level: 'block' | 'info'; text: string }

/** Issues to resolve before payroll moves forward. Only 'block' items stop the next step. */
export function buildPayrollWarnings(rows: PayrollWarningInput[]): PayrollWarning[] {
  const w: PayrollWarning[] = [];
  for (const r of rows) {
    if (r.net < 0) w.push({ level: 'block', text: `${r.name}: net pay is negative` });
    if (!r.hasBankDetails) w.push({ level: 'info', text: `${r.name}: missing bank details` });
    if (r.proRatedDays) w.push({ level: 'info', text: `${r.name}: pro-rated (${r.proRatedDays} days)` });
    if (r.excessLeaveDays) w.push({ level: 'info', text: `${r.name}: ${r.excessLeaveDays} excess annual leave day(s) deducted` });
    if (r.pendingClaims) w.push({ level: 'info', text: `${r.name}: ${r.pendingClaims} claim(s) awaiting approval` });
    if (r.manuallyEdited) w.push({ level: 'info', text: `${r.name}: edited manually this month` });
  }
  return w;
}

export const hasBlockingWarnings = (w: PayrollWarning[]) => w.some(x => x.level === 'block');

/** Sum net pay so every step reports the same total. */
export const sumNet = (rows: { net: number }[]) =>
  Math.round(rows.reduce((s, r) => s + r.net, 0) * 100) / 100;
