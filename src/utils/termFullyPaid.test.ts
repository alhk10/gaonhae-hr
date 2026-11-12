import { isTermFullyPaid } from './termFullyPaid';
const eq = (a: unknown, b: unknown, m: string) => { if (a !== b) throw new Error(`${m}: ${a} !== ${b}`); };
eq(isTermFullyPaid([{ plan: 'four_weeks', weeks: 4 }], 12), false, '4 of 12 weeks is not paid');
eq(isTermFullyPaid([1, 2, 3].map(() => ({ plan: 'four_weeks', weeks: 4 })), 12), true, 'three 4-week plans cover 12 weeks');
eq(isTermFullyPaid([{ plan: 'term' }], 12), true, 'full-term plan is paid');
console.log('termFullyPaid ok');
