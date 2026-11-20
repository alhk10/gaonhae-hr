import { taxRound } from './invoiceTotals';

export const gstRateFor = (country?: string) => (country === 'Singapore' ? 0.09 : country === 'Australia' ? 0.1 : 0);
export const defaultTaxInclusive = (country?: string) => country === 'Australia';

export type ExtLine = { quantity: number; unit_price: number; discount_type?: 'percentage' | 'amount'; discount_value?: number };
const r = (n: number) => Math.round(n * 100) / 100;

/** Discount on one line, capped at the line gross and never negative. */
export const lineDiscount = (l: ExtLine) => {
  const gross = l.quantity * l.unit_price;
  const v = Math.max(0, Number(l.discount_value) || 0);
  const d = l.discount_type === 'amount' ? v : gross * Math.min(v, 100) / 100;
  return r(Math.min(gross, d));
};
export const lineNet = (l: ExtLine) => r(l.quantity * l.unit_price - lineDiscount(l));

/** External customer invoice totals; GST applies after discount. By default Singapore adds GST and Australia includes it. */
export const externalInvoiceBreakdown = (lines: ExtLine[], country?: string, inclusive?: boolean) => {
  const rate = gstRateFor(country);
  const incl = inclusive ?? defaultTaxInclusive(country);
  const subtotal = r(lines.reduce((s, l) => s + l.quantity * l.unit_price, 0));
  const discount = r(lines.reduce((s, l) => s + lineDiscount(l), 0));
  const sum = r(subtotal - discount);
  const gst = taxRound(incl ? sum - sum / (1 + rate) : sum * rate);
  const total = incl ? sum : r(sum + gst);
  return { total, gst, rate, subtotal, discount };
};

export const externalInvoiceTotal = (lines: ExtLine[], country?: string, inclusive?: boolean) =>
  externalInvoiceBreakdown(lines, country, inclusive).total;
