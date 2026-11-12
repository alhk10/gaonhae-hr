import { isTermFullyPaid } from './termFullyPaid';
const eq = (a: unknown, b: unknown, m: string) => { if (a !== b) throw new Error(`${m}: ${a} !== ${b}`); };
eq(isTermFullyPaid([{ plan: 'four_weeks', weeks: 4 }], 12), false, '4 of 12 weeks is not paid');
eq(isTermFullyPaid([1, 2, 3].map(() => ({ plan: 'four_weeks', weeks: 4 })), 12), true, 'three 4-week plans cover 12 weeks');
eq(isTermFullyPaid([{ quantity: 12 }], 12), true, 'full-term quantity is paid');
eq(isTermFullyPaid([{ quantity: 3 }], 12), false, "Finn: 3 of 12 weeks is not paid");
eq(isTermFullyPaid([{ quantity: 6 }], 6), true, 'late joiner paying all remaining weeks is paid');
console.log('termFullyPaid ok');
