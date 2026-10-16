import { proRateSalary, unpaidLeaveDeduction, excessAnnualLeaveDays } from './payrollProration';

const equal = (actual: unknown, expected: unknown, rule: string) => {
  if (actual !== expected) throw new Error(`${rule}: expected ${expected}, got ${actual}`);
};

equal(proRateSalary(1100, '2026-07-01', '2026-09-27', 'September 2026').days, 27, 'resigned 27/09 works 27 days');
equal(proRateSalary(3000, '2026-07-01', '2026-09-27', 'September 2026').amount, 2700, 'resigned 27/09 earns 27/30');
equal(proRateSalary(3100, '2026-10-16', null, 'October 2026').amount, 1600, 'joined 16/10 earns 16/31');
equal(proRateSalary(3000, '2025-01-01', null, 'September 2026').isProRated, false, 'full month is not pro-rated');
equal(unpaidLeaveDeduction(3000, 2, 'September 2026'), 200, '2 unpaid days of 30 deducts 2/30');
equal(excessAnnualLeaveDays(14, 10, 6), 2, '14 allowed, 16 taken = 2 excess');
equal(excessAnnualLeaveDays(14, 16, 1), 1, 'later month only counts new excess days');
equal(excessAnnualLeaveDays(14, 5, 3), 0, 'within entitlement = no excess');
