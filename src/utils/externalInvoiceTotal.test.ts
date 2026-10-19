import { externalInvoiceTotal } from './externalInvoiceTotal';

const assertEqual = (actual: number, expected: number, label: string) => {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
};

assertEqual(externalInvoiceTotal([{ quantity: 2, unit_price: 50 }], 'Singapore'), 109, 'Singapore adds 9% GST');
assertEqual(externalInvoiceTotal([{ quantity: 2, unit_price: 50 }], 'Australia'), 100, 'Australia price already includes GST');
console.log('externalInvoiceTotal tests passed');
