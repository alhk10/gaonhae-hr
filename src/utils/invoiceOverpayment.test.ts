import { describe, expect, it } from 'bun:test';
import { calculateInvoiceOverpayment } from './invoiceOverpayment';

describe('calculateInvoiceOverpayment', () => {
  it('offers the exact negative balance as credit', () => {
    expect(calculateInvoiceOverpayment(506.85, 517.75)).toBe(10.9);
  });

  it('does not offer credit when no overpayment exists', () => {
    expect(calculateInvoiceOverpayment(517.75, 517.75)).toBe(0);
    expect(calculateInvoiceOverpayment(600, 517.75)).toBe(0);
  });
});
