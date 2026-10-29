import { withRunningBalance } from '@/services/studentCreditService';

// Rule: each student's balance accumulates oldest to newest; the list is shown newest first.
const rows = withRunningBalance([
  { id: 'b', student_id: 's1', amount: -30, created_at: '2026-10-02' },
  { id: 'a', student_id: 's1', amount: 100, created_at: '2026-10-01' },
  { id: 'c', student_id: 's2', amount: 50, created_at: '2026-10-03' },
]);
const got = JSON.stringify(rows.map(r => [r.id, r.balance_after]));
const want = JSON.stringify([['c', 50], ['b', 70], ['a', 100]]);
if (got !== want) throw new Error(`running balance wrong: ${got}`);
console.log('credit running balance: ok');

import { isCreditReversible } from '@/services/studentCreditService';
// Rule: reversed lines, reversal lines and hold/pending lines cannot be reversed.
const done = new Set(['x']);
if (isCreditReversible({ type: 'credit_applied', reference_id: 'inv' }, done, 'x')) throw new Error('reversed line reversible');
if (isCreditReversible({ type: 'manual_adjustment', reference_id: 'reversal:x' }, done, 'y')) throw new Error('reversal reversible');
if (isCreditReversible({ type: 'credit_hold', reference_id: null }, done, 'z')) throw new Error('hold reversible');
if (!isCreditReversible({ type: 'credit_applied', reference_id: 'inv' }, done, 'w')) throw new Error('normal line not reversible');
// Rule: a refund credit from a cancelled invoice stays on account and cannot be reversed.
if (isCreditReversible({ type: 'item_refund', reference_id: 'item', amount: 490.5 }, done, 'r', true)) throw new Error('cancelled-invoice refund reversible');
console.log('credit reversible rule: ok');
