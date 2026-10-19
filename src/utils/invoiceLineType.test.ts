import { isClassLineItem } from './invoiceLineType';

const equal = (actual: unknown, expected: unknown, rule: string) => {
  if (actual !== expected) throw new Error(`${rule}: expected ${expected}, got ${actual}`);
};

equal(isClassLineItem({ description: 'Color Belt (Yellow / 140)' }), false, 'belts show qty');
equal(isClassLineItem({ description: 'Kids 1x/week', metadata: { term_id: 't1' } }), true, 'term lines hide qty');
equal(isClassLineItem({ description: 'Ad-Hoc Lesson' }), true, 'ad-hoc lessons hide qty');
console.log('invoiceLineType tests passed');
