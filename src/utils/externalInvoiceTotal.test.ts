import { externalInvoiceTotal, externalInvoiceBreakdown, lineDiscount, lineNet } from './externalInvoiceTotal';

const assertEqual = (actual: number, expected: number, label: string) => {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
};
const l = [{ quantity: 2, unit_price: 50 }];
assertEqual(externalInvoiceTotal(l, 'Singapore'), 109, 'Singapore adds 9% GST by default');
assertEqual(externalInvoiceTotal(l, 'Australia'), 100, 'Australia price includes GST by default');
assertEqual(externalInvoiceTotal(l, 'Singapore', true), 100, 'Singapore inclusive keeps price');
assertEqual(externalInvoiceTotal(l, 'Australia', false), 110, 'Australia exclusive adds 10% GST');
console.log('externalInvoiceTotal tests passed');

assertEqual(lineDiscount({ quantity: 12, unit_price: 134, discount_type: 'percentage', discount_value: 10 }), 160.8, '10% off 12 x 134');
assertEqual(lineNet({ quantity: 1, unit_price: 50, discount_type: 'amount', discount_value: 80 }), 0, '$ discount capped at line');
assertEqual(externalInvoiceBreakdown([{ quantity: 1, unit_price: 100, discount_type: 'amount', discount_value: 20 }], 'Singapore', false).total, 87.2, 'SG GST after discount');
