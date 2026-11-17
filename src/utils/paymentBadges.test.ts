// @ts-nocheck
import { describe, expect, test } from "bun:test";
import { isOverAMonth, termPayBadge, unpaidInvoiceBadge } from './paymentBadges';
const today = new Date(2026, 10, 17);
describe('payment badges', () => {
  test('one month boundary', () => {
    expect(isOverAMonth('2026-10-17', today)).toBe(false);
    expect(isOverAMonth('2026-10-16', today)).toBe(true);
  });
  test('term badges', () => {
    expect(termPayBadge('none', null, today)).toEqual({ label: 'No Term Invoice', tone: 'red' });
    expect(termPayBadge('unpaid', '2026-09-01', today)?.tone).toBe('red');
    expect(termPayBadge('unpaid', '2026-11-01', today)?.tone).toBe('amber');
    expect(termPayBadge('paid', null, today)).toEqual({ label: 'Term Paid', tone: 'green' });
  });
  test('unpaid invoice badge', () => {
    expect(unpaidInvoiceBadge(45.5, '2026-09-01', today)).toEqual({ label: 'Unpaid invoice $45.50 due', tone: 'red' });
    expect(unpaidInvoiceBadge(10, '2026-11-10', today)?.tone).toBe('amber');
    expect(unpaidInvoiceBadge(0, null, today)).toBeNull();
  });
});
