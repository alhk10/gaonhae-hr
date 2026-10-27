import { describe, it, expect } from 'vitest';
import { withRunningBalance, JournalRow } from './branchJournal';

const row = (direction: 'in' | 'out', amount: number): JournalRow => ({
  id: Math.random().toString(), kind: 'manual', date: '2026-10-01', direction, amount,
  description: '', reference: null, category: null, remark: null, receipt_path: null,
});

describe('withRunningBalance', () => {
  it('starts from the opening balance and runs in order', () => {
    const r = withRunningBalance(100, [row('in', 420), row('out', 50.5)]);
    expect(r.lines.map((l) => l.balance)).toEqual([520, 469.5]);
    expect(r.closing).toBe(469.5);
  });
  it('totals money in, out and net for the period only', () => {
    const r = withRunningBalance(1000, [row('in', 45), row('out', 40), row('out', 20)]);
    expect([r.totalIn, r.totalOut, r.net]).toEqual([45, 60, -15]);
  });
});
