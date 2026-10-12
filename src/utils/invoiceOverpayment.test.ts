import { calculateInvoiceOverpayment } from './invoiceOverpayment';

const assertEqual = (actual: number, expected: number, label: string) => {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
};

assertEqual(calculateInvoiceOverpayment(506.85, 517.75), 10.9, 'negative balance credit');
assertEqual(calculateInvoiceOverpayment(517.75, 517.75), 0, 'fully paid invoice');
assertEqual(calculateInvoiceOverpayment(600, 517.75), 0, 'outstanding invoice');
