import { withRunningBalance, JournalRow } from './branchJournal';

const equal = (actual: unknown, expected: unknown, rule: string) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${rule}: expected ${e}, got ${a}`);
};

const row = (direction: 'in' | 'out', amount: number): JournalRow => ({
  id: Math.random().toString(), kind: 'manual', date: '2026-10-01', direction, amount,
  description: '', reference: null, category: null, remark: null, receipt_path: null,
});

const r1 = withRunningBalance(100, [row('in', 420), row('out', 50.5)]);
equal(r1.lines.map((l) => l.balance), [520, 469.5], 'running balance from opening');
equal(r1.closing, 469.5, 'closing balance');

const r2 = withRunningBalance(1000, [row('in', 45), row('out', 40), row('out', 20)]);
equal([r2.totalIn, r2.totalOut, r2.net], [45, 60, -15], 'period totals');
