import { computeInvoiceTotals } from './invoiceTotals';

const equal = (actual: unknown, expected: unknown, rule: string) => {
  const a = JSON.stringify(actual); const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${rule}: expected ${e}, got ${a}`);
};

equal(computeInvoiceTotals(480, 20, 0.09, false), { net: 460, tax: 41.4, total: 501.4 }, 'SG: GST on subtotal after discount');
equal(computeInvoiceTotals(220, 20, 0.1, true), { net: 200, tax: 18.18, total: 200 }, 'AU inclusive: discount reduces total');
console.log('invoiceTotals tests passed');
