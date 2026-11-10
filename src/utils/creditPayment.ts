/** Most credit that can be applied to an invoice: the smaller of available credit and balance due. */
export const creditPayCap = (credit: number, balance: number): number =>
  Math.max(0, Math.round(Math.min(credit, balance) * 100) / 100);
