import { supabase } from '@/integrations/supabase/client';
import type { Country } from './accountingService';
import type { ReportingBasis } from '@/contexts/FinanceBasisContext';
import { includeLineForBasis, type LedgerLine } from './reportingBasisService';

export interface BalanceSheetRow {
  account_id: string;
  account_code: string;
  account_name: string;
  subtype: string | null;
  balance: number; // signed natural for section
}

export interface BalanceSheetSection {
  type: 'asset' | 'liability' | 'equity';
  label: string;
  rows: BalanceSheetRow[];
  total: number;
}

export interface BalanceSheetResult {
  as_of: string;
  basis: ReportingBasis;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  retained_earnings_current: number; // income - expense to date
  total_assets: number;
  total_liab_equity: number;
  is_balanced: boolean;
}

interface Filter {
  country?: Country;
  branch_id?: string;
  as_of: string;
  basis: ReportingBasis;
}

async function fetchLedger(filter: Filter): Promise<LedgerLine[]> {
  let q = supabase
    .from('v_ledger_lines' as any)
    .select('line_id, account_id, account_code, account_name, account_type, account_subtype, account_country, debit, credit, entry_date, entry_branch_id, line_branch_id, entry_status, source_type')
    .eq('entry_status', 'posted')
    .lte('entry_date', filter.as_of)
    .limit(20000);

  if (filter.country) q = q.eq('account_country', filter.country);
  if (filter.branch_id) q = q.or(`line_branch_id.eq.${filter.branch_id},entry_branch_id.eq.${filter.branch_id}`);

  const { data, error } = await q;
  if (error) throw error;
  return ((data as any[]) || []) as LedgerLine[];
}

export async function getBalanceSheet(filter: Filter): Promise<BalanceSheetResult> {
  const lines = await fetchLedger(filter);

  const accounts = new Map<string, { code: string; name: string; subtype: string | null; type: LedgerLine['account_type']; debit: number; credit: number }>();
  let incomeNet = 0;   // credit-natural
  let expenseNet = 0;  // debit-natural

  for (const l of lines) {
    if (!includeLineForBasis(l, filter.basis)) continue;
    if (l.account_type === 'income') {
      incomeNet += Number(l.credit || 0) - Number(l.debit || 0);
      continue;
    }
    if (l.account_type === 'expense') {
      expenseNet += Number(l.debit || 0) - Number(l.credit || 0);
      continue;
    }
    let acc = accounts.get(l.account_id);
    if (!acc) {
      acc = { code: l.account_code, name: l.account_name, subtype: l.account_subtype, type: l.account_type, debit: 0, credit: 0 };
      accounts.set(l.account_id, acc);
    }
    acc.debit += Number(l.debit || 0);
    acc.credit += Number(l.credit || 0);
  }

  const sectionRows = (type: 'asset' | 'liability' | 'equity'): BalanceSheetRow[] => {
    const rows: BalanceSheetRow[] = [];
    for (const [id, a] of accounts) {
      if (a.type !== type) continue;
      const balance = type === 'asset' ? a.debit - a.credit : a.credit - a.debit;
      if (Math.round(balance * 100) === 0) continue;
      rows.push({ account_id: id, account_code: a.code, account_name: a.name, subtype: a.subtype, balance });
    }
    return rows.sort((a, b) => a.account_code.localeCompare(b.account_code));
  };

  const assetRows = sectionRows('asset');
  const liabRows = sectionRows('liability');
  const equityRows = sectionRows('equity');

  const assetsTotal = assetRows.reduce((s, r) => s + r.balance, 0);
  const liabTotal = liabRows.reduce((s, r) => s + r.balance, 0);
  const equityBaseTotal = equityRows.reduce((s, r) => s + r.balance, 0);

  const retained = incomeNet - expenseNet;
  const equityTotal = equityBaseTotal + retained;

  // Append computed retained earnings as a synthetic line for transparency.
  const equityRowsOut: BalanceSheetRow[] = [
    ...equityRows,
    {
      account_id: 'computed-retained',
      account_code: 'RE',
      account_name: 'Retained earnings (current period income - expenses)',
      subtype: 'computed',
      balance: retained,
    },
  ];

  return {
    as_of: filter.as_of,
    basis: filter.basis,
    assets: { type: 'asset', label: 'Assets', rows: assetRows, total: assetsTotal },
    liabilities: { type: 'liability', label: 'Liabilities', rows: liabRows, total: liabTotal },
    equity: { type: 'equity', label: 'Equity', rows: equityRowsOut, total: equityTotal },
    retained_earnings_current: retained,
    total_assets: assetsTotal,
    total_liab_equity: liabTotal + equityTotal,
    is_balanced: Math.round((assetsTotal - (liabTotal + equityTotal)) * 100) === 0,
  };
}
