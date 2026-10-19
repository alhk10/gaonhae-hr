/** External customer invoice total: Singapore adds 9% GST on top, Australia prices already include GST. */
export const externalInvoiceTotal = (lines: { quantity: number; unit_price: number }[], country?: string) => {
  const sum = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  return Math.round((country === 'Singapore' ? sum * 1.09 : sum) * 100) / 100;
};
