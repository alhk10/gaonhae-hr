import { describe, it, expect, mock } from 'bun:test';
mock.module('@/integrations/supabase/client', () => ({ supabase: {} }));
import { withRunningBalance } from '@/services/studentCreditService';

describe('credit running balance', () => {
  it('accumulates per student oldest to newest and returns newest first', () => {
    const rows = withRunningBalance([
      { id: 'b', student_id: 's1', amount: -30, created_at: '2026-10-02' },
      { id: 'a', student_id: 's1', amount: 100, created_at: '2026-10-01' },
      { id: 'c', student_id: 's2', amount: 50, created_at: '2026-10-03' },
    ]);
    expect(rows.map(r => [r.id, r.balance_after])).toEqual([['c', 50], ['b', 70], ['a', 100]]);
  });
});
