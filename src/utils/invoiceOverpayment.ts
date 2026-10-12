const CENT = 0.01;

export const calculateInvoiceOverpayment = (total: number, amountPaid: number): number => {
  const excess = Math.round((Number(amountPaid || 0) - Number(total || 0)) * 100) / 100;
  return excess >= CENT ? excess : 0;
};
