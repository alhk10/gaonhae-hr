/** GST is always charged on the subtotal after discount. */
export function computeInvoiceTotals(subtotal: number, discount: number, rate: number, inclusive: boolean) {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const net = Math.max(0, r2(subtotal - Math.max(0, discount)));
  if (inclusive) {
    const tax = rate > 0 ? r2(net - net / (1 + rate)) : 0;
    return { net, tax, total: net };
  }
  const tax = r2(net * rate);
  return { net, tax, total: r2(net + tax) };
}
