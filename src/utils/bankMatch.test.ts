import { selectionMatchesTransfer, selectionTotal, allocationFits, exactCombos } from './bankMatch';
const eq = (a: unknown, b: unknown, m: string) => { if (a !== b) throw new Error(`${m}: ${a} !== ${b}`); };
// one family transfer covering two siblings' invoices
eq(selectionMatchesTransfer([228.9, 228.9], 457.8), true, 'two siblings sum exactly');
eq(selectionMatchesTransfer([0.1, 0.2], 0.3), true, 'float-safe cents');
eq(selectionMatchesTransfer([228.9], 457.8), false, 'partial selection is not a match');
eq(selectionMatchesTransfer([228.9, 228.91], 457.8), false, 'one cent over is not a match');
eq(selectionMatchesTransfer([], 0), false, 'empty selection never matches');
eq(selectionTotal([100, 49.05]), 149.05, 'total');
console.log('bankMatch tests passed');

// one transfer may be allocated to several invoices up to its amount
eq(allocationFits([50, 30], 100), true, 'partial allocation allowed');
eq(allocationFits([60, 50], 100), false, 'over-allocation blocked');
eq(JSON.stringify(exactCombos([{ amount: 98.1 }, { amount: 87.2 }, { amount: 76.3 }], 174.4).map((c) => c.map((x) => x.amount))), '[[98.1,76.3]]', 'exact combination suggested');
