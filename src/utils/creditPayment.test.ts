import { creditPayCap } from './creditPayment';
const eq = (a: number, e: number, r: string) => { if (a !== e) throw new Error(`${r}: expected ${e}, got ${a}`); };
eq(creditPayCap(16.35, 16.35), 16.35, 'credit equals balance');
eq(creditPayCap(50, 16.35), 16.35, 'capped at balance');
eq(creditPayCap(10, 16.35), 10, 'capped at credit');
console.log('creditPayment tests passed');
