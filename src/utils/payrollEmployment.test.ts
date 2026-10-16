import { describe, it, expect } from 'vitest';
import { isEmployedInPeriod } from './payrollEmployment';

describe('isEmployedInPeriod', () => {
  const emp = { resignDate: '2026-09-27' };
  it('includes staff in their final month', () => {
    expect(isEmployedInPeriod(emp, 'September 2026')).toBe(true);
  });
  it('excludes staff the month after they resign', () => {
    expect(isEmployedInPeriod(emp, 'October 2026')).toBe(false);
  });
  it('includes staff without a resign date', () => {
    expect(isEmployedInPeriod({ resignDate: null }, 'October 2026')).toBe(true);
  });
});
