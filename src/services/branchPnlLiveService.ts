/**
 * Phase 4 — Real-time Branch P&L service
 * Reads from v_pnl_lines (posted journal lines for income/expense accounts).
 */
import { supabase } from '@/integrations/supabase/client';

export interface PnlRow {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: 'income' | 'expense';
  account_subtype: string | null;
  account_sort_order: number;
  amount: number;
}

export interface PnlResult {
  income: PnlRow[];
  cogs: PnlRow[];
  expenses: PnlRow[];
  totals: {
    income: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
    margin: number; // percent
  };
}

export interface PnlQuery {
  branchId?: string | null; // null = all branches
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

const COGS_SUBTYPE_HINT = 'cost of sales';

export async function getBranchPnl(q: PnlQuery): Promise<PnlResult> {
  let query = supabase
    .from('v_pnl_lines')
    .select('account_id, account_code, account_name, account_type, account_subtype, account_sort_order, signed_amount')
    .gte('entry_date', q.from)
    .lte('entry_date', q.to);
  if (q.branchId) query = query.eq('branch_id', q.branchId);

  const { data, error } = await query.limit(10000);
  if (error) throw error;

  const grouped = new Map<string, PnlRow>();
  for (const r of data || []) {
    const key = (r as any).account_id as string;
    const existing = grouped.get(key);
    const amt = Number((r as any).signed_amount || 0);
    if (existing) {
      existing.amount += amt;
    } else {
      grouped.set(key, {
        account_id: key,
        account_code: (r as any).account_code,
        account_name: (r as any).account_name,
        account_type: (r as any).account_type,
        account_subtype: (r as any).account_subtype,
        account_sort_order: (r as any).account_sort_order || 0,
        amount: amt,
      });
    }
  }

  const all = [...grouped.values()].sort((a, b) =>
    a.account_code.localeCompare(b.account_code),
  );

  const income = all.filter(r => r.account_type === 'income');
  const cogs = all.filter(r =>
    r.account_type === 'expense' &&
    (r.account_code.startsWith('5') ||
      (r.account_subtype || '').toLowerCase().includes(COGS_SUBTYPE_HINT)),
  );
  const cogsIds = new Set(cogs.map(r => r.account_id));
  const expenses = all.filter(r => r.account_type === 'expense' && !cogsIds.has(r.account_id));

  const sum = (rows: PnlRow[]) => rows.reduce((s, r) => s + r.amount, 0);
  const incomeTotal = sum(income);
  const cogsTotal = sum(cogs);
  const expensesTotal = sum(expenses);
  const grossProfit = incomeTotal - cogsTotal;
  const netProfit = grossProfit - expensesTotal;
  const margin = incomeTotal !== 0 ? (netProfit / incomeTotal) * 100 : 0;

  return {
    income,
    cogs,
    expenses,
    totals: { income: incomeTotal, cogs: cogsTotal, grossProfit, expenses: expensesTotal, netProfit, margin },
  };
}

export type PnlPeriodPreset = 'this_month' | 'last_month' | 'this_quarter' | 'this_fy' | 'custom';

export function periodFromPreset(preset: PnlPeriodPreset, fyStartMonth = 1): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  switch (preset) {
    case 'last_month': {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return { from: fmt(start), to: fmt(end) };
    }
    case 'this_quarter': {
      const qStart = Math.floor(m / 3) * 3;
      return { from: fmt(new Date(y, qStart, 1)), to: fmt(new Date(y, qStart + 3, 0)) };
    }
    case 'this_fy': {
      const startMonth = fyStartMonth - 1;
      const startYear = m >= startMonth ? y : y - 1;
      return { from: fmt(new Date(startYear, startMonth, 1)), to: fmt(now) };
    }
    case 'custom':
    case 'this_month':
    default:
      return { from: fmt(new Date(y, m, 1)), to: fmt(now) };
  }
}

export function shiftPriorPeriod(from: string, to: string, mode: 'prior_period' | 'prior_year'): { from: string; to: string } {
  const f = new Date(from);
  const t = new Date(to);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (mode === 'prior_year') {
    f.setFullYear(f.getFullYear() - 1);
    t.setFullYear(t.getFullYear() - 1);
    return { from: fmt(f), to: fmt(t) };
  }
  const days = Math.round((t.getTime() - f.getTime()) / 86400000) + 1;
  const newTo = new Date(f);
  newTo.setDate(newTo.getDate() - 1);
  const newFrom = new Date(newTo);
  newFrom.setDate(newFrom.getDate() - (days - 1));
  return { from: fmt(newFrom), to: fmt(newTo) };
}

/** Subscribe to journal_lines changes; debounced callback. Returns unsubscribe fn. */
export function subscribePnlChanges(onChange: () => void, debounceMs = 800): () => void {
  let timer: any = null;
  const trigger = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(onChange, debounceMs);
  };
  const channel = supabase
    .channel('pnl-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_lines' }, trigger)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_entries' }, trigger)
    .subscribe();
  return () => {
    if (timer) clearTimeout(timer);
    supabase.removeChannel(channel);
  };
}
