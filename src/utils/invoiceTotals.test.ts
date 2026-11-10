import { describe, it, expect } from 'vitest';
import { computeInvoiceTotals } from './invoiceTotals';

describe('computeInvoiceTotals', () => {
  it('SG: GST on subtotal after discount', () => {
    expect(computeInvoiceTotals(480, 20, 0.09, false)).toEqual({ net: 460, tax: 41.4, total: 501.4 });
  });
  it('AU inclusive: discount reduces total, GST included', () => {
    expect(computeInvoiceTotals(220, 20, 0.1, true)).toEqual({ net: 200, tax: 18.18, total: 200 });
  });
});
