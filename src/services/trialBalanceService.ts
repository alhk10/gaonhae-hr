import { supabase } from '@/integrations/supabase/client';
import type { Country } from './accountingService';
import type { ReportingBasis } from '@/contexts/FinanceBasisContext';
import { includeLineForBasis, type LedgerLine } from './reportingBasisService';

export interface TrialBalanceRow {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: LedgerLine['account_type'];
  account_subtype: string | null;
  debit: number;
  credit: number;
  net: number;
}

export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
}

interface Filter {
  country?: Country;
  branch_id?: string;
  from: string;   // YYYY-MM-DD inclusive
  to: string;     // YYYY-MM-DD inclusive
  basis: ReportingBasis;
}

async function fetchLedger(filter: Filter): Promise<LedgerLine[]> {
  let q = supabase
    .from('v_ledger_lines' as any)
    .select('line_id, account_id, account_code, account_name, account_type, account_subtype, account_country, debit, credit, entry_date, entry_branch_id, line_branch_id, entry_status, source_type')
    .eq('entry_status', 'posted')
    .gte('entry_date', filter.from)
    .lte('entry_date', filter.to)
    .limit(10000);

  if (filter.country) q = q.eq('account_country', filter.country);
  if (filter.branch_id) q = q.or(`line_branch_id.eq.${filter.branch_id},entry_branch_id.eq.${filter.branch_id}`);

  const { data, error } = await q;
  if (error) throw error;
  return ((data as any[]) || []) as LedgerLine[];
}

export async function getTrialBalance(filter: Filter): Promise<TrialBalanceResult> {
  const lines = await fetchLedger(filter);
  const map = new Map<string, TrialBalanceRow>();

  for (const l of lines) {
    if (!includeLineForBasis(l, filter.basis)) continue;
    let row = map.get(l.account_id);
    if (!row) {
      row = {
        account_id: l.account_id,
        account_code: l.account_code,
        account_name: l.account_name,
        account_type: l.account_type,
        account_subtype: l.account_subtype,
        debit: 0,
        credit: 0,
        net: 0,
      };
      map.set(l.account_id, row);
    }
    row.debit += Number(l.debit || 0);
    row.credit += Number(l.credit || 0);
  }

  const rows = Array.from(map.values()).map(r => ({
    ...r,
    net: r.debit - r.credit,
  })).sort((a, b) => a.account_code.localeCompare(b.account_code));

  const total_debit = rows.reduce((s, r) => s + r.debit, 0);
  const total_credit = rows.reduce((s, r) => s + r.credit, 0);

  return {
    rows,
    total_debit,
    total_credit,
    is_balanced: Math.round((total_debit - total_credit) * 100) === 0,
  };
}
