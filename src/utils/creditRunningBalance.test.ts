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
