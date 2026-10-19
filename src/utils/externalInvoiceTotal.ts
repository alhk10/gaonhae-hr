export const gstRateFor = (country?: string) => (country === 'Singapore' ? 0.09 : country === 'Australia' ? 0.1 : 0);
export const defaultTaxInclusive = (country?: string) => country === 'Australia';

/** External customer invoice totals. By default Singapore adds GST on top and Australia prices include GST; `inclusive` overrides. */
export const externalInvoiceBreakdown = (lines: { quantity: number; unit_price: number }[], country?: string, inclusive?: boolean) => {
  const rate = gstRateFor(country);
  const incl = inclusive ?? defaultTaxInclusive(country);
  const sum = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const total = incl ? sum : sum * (1 + rate);
  const gst = incl ? sum - sum / (1 + rate) : sum * rate;
  const r = (n: number) => Math.round(n * 100) / 100;
  return { total: r(total), gst: r(gst), rate };
};

export const externalInvoiceTotal = (lines: { quantity: number; unit_price: number }[], country?: string, inclusive?: boolean) =>
  externalInvoiceBreakdown(lines, country, inclusive).total;
