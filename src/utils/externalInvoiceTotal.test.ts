import { externalInvoiceTotal } from './externalInvoiceTotal';

const assertEqual = (actual: number, expected: number, label: string) => {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
};
const l = [{ quantity: 2, unit_price: 50 }];
assertEqual(externalInvoiceTotal(l, 'Singapore'), 109, 'Singapore adds 9% GST by default');
assertEqual(externalInvoiceTotal(l, 'Australia'), 100, 'Australia price includes GST by default');
assertEqual(externalInvoiceTotal(l, 'Singapore', true), 100, 'Singapore inclusive keeps price');
assertEqual(externalInvoiceTotal(l, 'Australia', false), 110, 'Australia exclusive adds 10% GST');
console.log('externalInvoiceTotal tests passed');
