import { buildPayrollWarnings, hasBlockingWarnings, sumNet } from './payrollWarnings';

const equal = (actual: unknown, expected: unknown, rule: string) => {
  if (actual !== expected) throw new Error(`${rule}: expected ${expected}, got ${actual}`);
};
const base = { name: 'A', hasBankDetails: true, net: 100 };

equal(hasBlockingWarnings(buildPayrollWarnings([{ ...base, net: -1 }])), true, 'negative net blocks next step');
equal(hasBlockingWarnings(buildPayrollWarnings([{ ...base, hasBankDetails: false, pendingClaims: 2 }])), false, 'info warnings do not block');
equal(buildPayrollWarnings([{ ...base, excessLeaveDays: 2 }]).length, 1, 'excess leave is flagged');
equal(sumNet([{ net: 990 }, { net: 10.005 }]), 1000.01, 'net totals round to cents');
console.log('payrollWarnings ok');
