import { isEmployedInPeriod } from './payrollEmployment';

const equal = (actual: unknown, expected: unknown, rule: string) => {
  if (actual !== expected) throw new Error(`${rule}: expected ${expected}, got ${actual}`);
};
const emp = { resignDate: '2026-09-27' };

equal(isEmployedInPeriod(emp, 'September 2026'), true, 'final month is included');
equal(isEmployedInPeriod(emp, 'October 2026'), false, 'month after resigning is excluded');
equal(isEmployedInPeriod({ resignDate: null }, 'October 2026'), true, 'no resign date is included');
